-- Sprint 19 — Calendario de obligaciones fiscales SAT.
-- Captura las declaraciones que el grupo debe presentar (DIOT, Pago Provisional,
-- Anuales, IVA, ISR, etc.) con sus fechas de vencimiento y estado de pago.

CREATE TYPE tipo_obligacion_sat AS ENUM (
  'iva_mensual',           -- IVA definitivo mensual
  'isr_provisional',        -- Pago provisional ISR mensual
  'isr_retenciones',        -- Retenciones ISR sueldos/honorarios
  'diot',                   -- Declaración Informativa Operaciones con Terceros
  'iva_retenciones',        -- IVA retenido
  'declaracion_anual',      -- Declaración anual ISR
  'iva_anual',              -- DyP IVA anual (cuando aplica)
  'isn',                    -- ISN estatal
  'icsoe',                  -- REPSE — informe cuatrimestral
  'sisub',                  -- REPSE — info de subcontratación
  'aportacion_imss',        -- Pago bimestral IMSS
  'pago_infonavit',         -- Pago bimestral INFONAVIT
  'pago_fonacot',           -- FONACOT
  'estatales',              -- impuestos estatales varios
  'otra'
);

CREATE TYPE estado_obligacion AS ENUM (
  'pendiente',
  'en_proceso',
  'presentada',
  'pagada',
  'rechazada',
  'fuera_plazo',
  'extemporanea',
  'no_aplica'
);

CREATE TABLE IF NOT EXISTS obligaciones_sat (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE RESTRICT,
  tipo tipo_obligacion_sat NOT NULL,
  periodo_anio INTEGER NOT NULL CHECK (periodo_anio BETWEEN 2020 AND 2099),
  -- Para declaraciones mensuales: 1-12. Cuatrimestral: 1-3 (C1/C2/C3).
  -- Bimestral: 1-6. Anual: NULL.
  periodo_mes INTEGER CHECK (periodo_mes BETWEEN 1 AND 12),
  periodo_label TEXT,  -- ej. "Enero 2026", "C1 2025", "Bim 2 2026"

  fecha_vencimiento DATE NOT NULL,
  fecha_presentacion DATE,
  fecha_pago DATE,

  monto_calculado NUMERIC(14,2),
  monto_pagado NUMERIC(14,2),
  saldo_a_favor NUMERIC(14,2),

  estado estado_obligacion NOT NULL DEFAULT 'pendiente',
  url_acuse TEXT,           -- path en bucket obligaciones-sat
  url_comprobante TEXT,     -- comprobante de pago
  numero_operacion TEXT,    -- referencia SAT
  observaciones TEXT,

  responsable_id UUID REFERENCES auth.users(id),
  capturado_por UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(empresa_id, tipo, periodo_anio, periodo_mes)
);

CREATE INDEX IF NOT EXISTS idx_oblig_empresa_periodo
  ON obligaciones_sat(empresa_id, periodo_anio DESC, periodo_mes DESC);
CREATE INDEX IF NOT EXISTS idx_oblig_vencimiento
  ON obligaciones_sat(fecha_vencimiento) WHERE estado IN ('pendiente', 'en_proceso');

-- Bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('obligaciones-sat', 'obligaciones-sat', FALSE)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS oblig_storage_select ON storage.objects;
CREATE POLICY oblig_storage_select ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'obligaciones-sat');

DROP POLICY IF EXISTS oblig_storage_insert ON storage.objects;
CREATE POLICY oblig_storage_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'obligaciones-sat');

DROP POLICY IF EXISTS oblig_storage_delete ON storage.objects;
CREATE POLICY oblig_storage_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'obligaciones-sat' AND usuario_es_ceo());

-- RLS
ALTER TABLE obligaciones_sat ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS oblig_select ON obligaciones_sat;
CREATE POLICY oblig_select ON obligaciones_sat
  FOR SELECT TO authenticated
  USING (
    empresa_id IN (SELECT empresas_del_usuario())
    OR usuario_es_ceo()
    OR usuario_tiene_atributo('tesorero_corporativo')
    OR usuario_tiene_atributo('aprobador_financiero')
    OR usuario_tiene_atributo('auditor_interno')
  );

DROP POLICY IF EXISTS oblig_modify ON obligaciones_sat;
CREATE POLICY oblig_modify ON obligaciones_sat
  FOR ALL TO authenticated
  USING (
    usuario_es_ceo()
    OR usuario_tiene_atributo('tesorero_corporativo')
    OR EXISTS (
      SELECT 1 FROM usuarios_empresas
      WHERE usuario_id = auth.uid()
        AND empresa_id = obligaciones_sat.empresa_id
        AND rol IN ('director'::rol_usuario, 'operativo'::rol_usuario)
        AND activo = TRUE
    )
  );

-- Vista para listado
CREATE OR REPLACE VIEW v_obligaciones_lista AS
SELECT
  o.id,
  o.empresa_id,
  e.codigo AS empresa_codigo,
  o.tipo,
  o.periodo_anio,
  o.periodo_mes,
  o.periodo_label,
  o.fecha_vencimiento,
  o.fecha_presentacion,
  o.fecha_pago,
  o.monto_calculado,
  o.monto_pagado,
  o.estado,
  -- Estado computado: marca como fuera_plazo si pasó la fecha y no se ha presentado
  CASE
    WHEN o.estado = 'pendiente' AND o.fecha_vencimiento < CURRENT_DATE
      THEN 'fuera_plazo'::estado_obligacion
    ELSE o.estado
  END AS estado_efectivo,
  -- Días al vencimiento
  (o.fecha_vencimiento - CURRENT_DATE) AS dias_al_vencer,
  o.url_acuse,
  o.url_comprobante,
  o.numero_operacion,
  o.created_at
FROM obligaciones_sat o
LEFT JOIN empresas e ON e.id = o.empresa_id;

-- Función helper: generar obligaciones recurrentes para una empresa-año
-- (genera todas las declaraciones mensuales tipo IVA, ISR provisional, etc.)
CREATE OR REPLACE FUNCTION generar_obligaciones_anuales(
  p_empresa_id UUID,
  p_anio INTEGER
)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  m INTEGER;
  vencimiento DATE;
  inserted INTEGER := 0;
BEGIN
  FOR m IN 1..12 LOOP
    -- Vencimiento: día 17 del mes siguiente
    vencimiento := MAKE_DATE(p_anio, m, 1) + INTERVAL '1 month' + INTERVAL '16 days';
    -- IVA mensual
    INSERT INTO obligaciones_sat (empresa_id, tipo, periodo_anio, periodo_mes, periodo_label, fecha_vencimiento, estado)
    VALUES (
      p_empresa_id, 'iva_mensual', p_anio, m,
      TO_CHAR(MAKE_DATE(p_anio, m, 1), 'TMMonth YYYY'),
      vencimiento::DATE, 'pendiente'
    )
    ON CONFLICT (empresa_id, tipo, periodo_anio, periodo_mes) DO NOTHING;
    inserted := inserted + 1;

    -- ISR provisional
    INSERT INTO obligaciones_sat (empresa_id, tipo, periodo_anio, periodo_mes, periodo_label, fecha_vencimiento, estado)
    VALUES (
      p_empresa_id, 'isr_provisional', p_anio, m,
      TO_CHAR(MAKE_DATE(p_anio, m, 1), 'TMMonth YYYY'),
      vencimiento::DATE, 'pendiente'
    )
    ON CONFLICT (empresa_id, tipo, periodo_anio, periodo_mes) DO NOTHING;
    inserted := inserted + 1;

    -- ISR retenciones (sueldos/salarios)
    INSERT INTO obligaciones_sat (empresa_id, tipo, periodo_anio, periodo_mes, periodo_label, fecha_vencimiento, estado)
    VALUES (
      p_empresa_id, 'isr_retenciones', p_anio, m,
      TO_CHAR(MAKE_DATE(p_anio, m, 1), 'TMMonth YYYY'),
      vencimiento::DATE, 'pendiente'
    )
    ON CONFLICT (empresa_id, tipo, periodo_anio, periodo_mes) DO NOTHING;
    inserted := inserted + 1;

    -- DIOT (vence último día del mes siguiente)
    INSERT INTO obligaciones_sat (empresa_id, tipo, periodo_anio, periodo_mes, periodo_label, fecha_vencimiento, estado)
    VALUES (
      p_empresa_id, 'diot', p_anio, m,
      TO_CHAR(MAKE_DATE(p_anio, m, 1), 'TMMonth YYYY'),
      (DATE_TRUNC('month', MAKE_DATE(p_anio, m, 1) + INTERVAL '2 months') - INTERVAL '1 day')::DATE,
      'pendiente'
    )
    ON CONFLICT (empresa_id, tipo, periodo_anio, periodo_mes) DO NOTHING;
    inserted := inserted + 1;
  END LOOP;

  -- Declaración anual: vence 31 marzo del año siguiente
  INSERT INTO obligaciones_sat (empresa_id, tipo, periodo_anio, periodo_mes, periodo_label, fecha_vencimiento, estado)
  VALUES (
    p_empresa_id, 'declaracion_anual', p_anio, NULL,
    'Anual ' || p_anio,
    MAKE_DATE(p_anio + 1, 3, 31), 'pendiente'
  )
  ON CONFLICT (empresa_id, tipo, periodo_anio, periodo_mes) DO NOTHING;
  inserted := inserted + 1;

  -- REPSE: ICSOE/SISUB cuatrimestrales — vencen el último día del mes siguiente al cierre
  -- C1 (Ene-Abr) vence 31 mayo, C2 (May-Ago) 30 sep, C3 (Sep-Dic) 31 ene siguiente
  FOR m IN 1..3 LOOP
    DECLARE
      vc DATE;
    BEGIN
      IF m = 1 THEN vc := MAKE_DATE(p_anio, 5, 31);
      ELSIF m = 2 THEN vc := MAKE_DATE(p_anio, 9, 30);
      ELSE vc := MAKE_DATE(p_anio + 1, 1, 31);
      END IF;

      INSERT INTO obligaciones_sat (empresa_id, tipo, periodo_anio, periodo_mes, periodo_label, fecha_vencimiento, estado)
      VALUES (p_empresa_id, 'icsoe', p_anio, m, 'C' || m || ' ' || p_anio, vc, 'pendiente')
      ON CONFLICT (empresa_id, tipo, periodo_anio, periodo_mes) DO NOTHING;

      INSERT INTO obligaciones_sat (empresa_id, tipo, periodo_anio, periodo_mes, periodo_label, fecha_vencimiento, estado)
      VALUES (p_empresa_id, 'sisub', p_anio, m, 'C' || m || ' ' || p_anio, vc, 'pendiente')
      ON CONFLICT (empresa_id, tipo, periodo_anio, periodo_mes) DO NOTHING;

      inserted := inserted + 2;
    END;
  END LOOP;

  RETURN inserted;
END;
$$;
