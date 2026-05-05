-- ============================================================================
-- Sprint 5.6 — Levantamientos técnicos como entidad propia con costo asignado
--
-- Cada vendedor tiene un sub-centro de costo dentro del CC "Ventas" de su
-- empresa que acumula el costo de sus levantamientos. Si el levantamiento
-- se convierte en venta, el costo se reasigna al proyecto. Si no convierte,
-- queda en el sub-centro vendedor para evaluación.
-- ============================================================================

-- 1. Tarifas internas por empresa
CREATE TABLE IF NOT EXISTS tarifas_internas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE RESTRICT,
  concepto TEXT NOT NULL,  -- 'hora_ingeniero', 'viaticos_dia', 'kilometraje'
  unidad TEXT NOT NULL,
  costo_unitario NUMERIC(10, 2) NOT NULL CHECK (costo_unitario >= 0),
  vigente_desde DATE NOT NULL,
  vigente_hasta DATE,
  activa BOOLEAN DEFAULT TRUE NOT NULL,
  observaciones TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (empresa_id, concepto, vigente_desde)
);

CREATE INDEX IF NOT EXISTS idx_tarifas_empresa
  ON tarifas_internas(empresa_id) WHERE activa = TRUE;
CREATE INDEX IF NOT EXISTS idx_tarifas_concepto
  ON tarifas_internas(concepto);

COMMENT ON TABLE tarifas_internas IS
  'Tarifas internas para calcular costo de actividades (horas ingeniero, viáticos, kilometraje).';

-- 2. Enums de levantamiento
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'estado_levantamiento') THEN
    CREATE TYPE estado_levantamiento AS ENUM (
      'programado',
      'en_curso',
      'completado',
      'convertido_a_venta',
      'no_convertido',
      'cancelado'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'estado_paso_levantamiento') THEN
    CREATE TYPE estado_paso_levantamiento AS ENUM (
      'pendiente',
      'en_curso',
      'completado',
      'no_aplica'
    );
  END IF;
END$$;

-- 3. Levantamientos
CREATE TABLE IF NOT EXISTS levantamientos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE RESTRICT,
  oportunidad_id UUID REFERENCES oportunidades(id) ON DELETE SET NULL,
  vendedor_id UUID NOT NULL REFERENCES auth.users(id),
  ingeniero_id UUID REFERENCES auth.users(id),
  cliente_id UUID REFERENCES clientes(id) ON DELETE SET NULL,
  fecha_solicitud DATE NOT NULL DEFAULT CURRENT_DATE,
  fecha_propuesta DATE,
  fecha_realizada DATE,

  -- Confirmación de las 3 partes (cliente, ventas, ingeniería)
  confirmado_cliente_at TIMESTAMPTZ,
  confirmado_ventas_at TIMESTAMPTZ,
  confirmado_ingenieria_at TIMESTAMPTZ,

  -- Datos económicos
  horas_ingeniero NUMERIC(5, 2) DEFAULT 0,
  viaticos NUMERIC(8, 2) DEFAULT 0,
  kilometraje NUMERIC(8, 2) DEFAULT 0,
  costo_calculado NUMERIC(10, 2),

  estado estado_levantamiento NOT NULL DEFAULT 'programado',
  resultado_descripcion TEXT,
  url_informe TEXT,

  -- Sub-centro asignado al vendedor (creado on-demand)
  centro_id UUID REFERENCES centros(id) ON DELETE SET NULL,

  -- Si se convierte a venta
  proyecto_destino_id UUID REFERENCES proyectos(id) ON DELETE SET NULL,
  reasignado_at TIMESTAMPTZ,
  reasignado_por UUID REFERENCES auth.users(id),

  observaciones TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lev_vendedor ON levantamientos(vendedor_id);
CREATE INDEX IF NOT EXISTS idx_lev_estado ON levantamientos(estado);
CREATE INDEX IF NOT EXISTS idx_lev_oportunidad ON levantamientos(oportunidad_id);
CREATE INDEX IF NOT EXISTS idx_lev_proyecto ON levantamientos(proyecto_destino_id);
CREATE INDEX IF NOT EXISTS idx_lev_empresa_fecha
  ON levantamientos(empresa_id, fecha_solicitud DESC);
CREATE INDEX IF NOT EXISTS idx_lev_centro ON levantamientos(centro_id) WHERE centro_id IS NOT NULL;

CREATE TRIGGER set_updated_at_levantamientos
  BEFORE UPDATE ON levantamientos
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

COMMENT ON TABLE levantamientos IS
  'Levantamientos técnicos como entidad propia. Costo se asigna al sub-centro del vendedor; al convertir se reasigna al proyecto.';

-- 4. Pasos del levantamiento (los 6 estándar PSE)
CREATE TABLE IF NOT EXISTS levantamiento_pasos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  levantamiento_id UUID NOT NULL REFERENCES levantamientos(id) ON DELETE CASCADE,
  numero INTEGER NOT NULL,
  nombre TEXT NOT NULL,
  estado estado_paso_levantamiento NOT NULL DEFAULT 'pendiente',
  observaciones TEXT,
  fecha_completado TIMESTAMPTZ,
  responsable_id UUID REFERENCES auth.users(id),
  UNIQUE (levantamiento_id, numero)
);

CREATE INDEX IF NOT EXISTS idx_lev_pasos_lev ON levantamiento_pasos(levantamiento_id);

-- Trigger: al crear levantamiento, crear los 6 pasos automáticamente
CREATE OR REPLACE FUNCTION trg_levantamiento_crear_pasos()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO levantamiento_pasos (levantamiento_id, numero, nombre) VALUES
    (NEW.id, 1, 'Preparación previa'),
    (NEW.id, 2, 'Evaluación del sitio'),
    (NEW.id, 3, 'Revisión eléctrica'),
    (NEW.id, 4, 'Ruta de cableado'),
    (NEW.id, 5, 'Evidencia fotográfica'),
    (NEW.id, 6, 'Entrega de informe');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_levantamiento_crear_pasos ON levantamientos;
CREATE TRIGGER tr_levantamiento_crear_pasos
  AFTER INSERT ON levantamientos
  FOR EACH ROW EXECUTE FUNCTION trg_levantamiento_crear_pasos();

-- 5. Vista de conversión por vendedor
CREATE OR REPLACE VIEW v_vendedores_conversion AS
SELECT
  l.vendedor_id,
  l.empresa_id,
  EXTRACT(YEAR FROM l.fecha_realizada)::INTEGER AS anio,
  EXTRACT(MONTH FROM l.fecha_realizada)::INTEGER AS mes,
  COUNT(*)::INTEGER AS total_levantamientos,
  COUNT(*) FILTER (WHERE l.estado = 'convertido_a_venta')::INTEGER AS convertidos,
  COUNT(*) FILTER (WHERE l.estado = 'no_convertido')::INTEGER AS no_convertidos,
  COUNT(*) FILTER (WHERE l.estado IN ('programado', 'en_curso', 'completado'))::INTEGER AS pendientes_definicion,
  ROUND(
    100.0 * COUNT(*) FILTER (WHERE l.estado = 'convertido_a_venta') /
    NULLIF(COUNT(*) FILTER (WHERE l.estado IN ('convertido_a_venta', 'no_convertido')), 0),
    1
  ) AS tasa_conversion_pct,
  COALESCE(SUM(l.costo_calculado), 0)::NUMERIC AS costo_total,
  COALESCE(SUM(l.costo_calculado) FILTER (WHERE l.estado = 'no_convertido'), 0)::NUMERIC AS costo_no_convertido,
  COALESCE(SUM(l.costo_calculado) FILTER (WHERE l.estado = 'convertido_a_venta'), 0)::NUMERIC AS costo_convertido
FROM levantamientos l
WHERE l.fecha_realizada IS NOT NULL
GROUP BY l.vendedor_id, l.empresa_id,
  EXTRACT(YEAR FROM l.fecha_realizada),
  EXTRACT(MONTH FROM l.fecha_realizada);

COMMENT ON VIEW v_vendedores_conversion IS
  'Tasa de conversión y costo acumulado por vendedor y mes.';

-- 6. RLS
ALTER TABLE tarifas_internas ENABLE ROW LEVEL SECURITY;
ALTER TABLE levantamientos ENABLE ROW LEVEL SECURITY;
ALTER TABLE levantamiento_pasos ENABLE ROW LEVEL SECURITY;

-- Tarifas: lectura por empresa, modificación director/CEO/tesorero
DROP POLICY IF EXISTS ti_select ON tarifas_internas;
CREATE POLICY ti_select ON tarifas_internas
  FOR SELECT TO authenticated
  USING (
    empresa_id IN (SELECT empresas_del_usuario())
    OR usuario_es_ceo()
    OR usuario_tiene_atributo('tesorero_corporativo')
  );

DROP POLICY IF EXISTS ti_modify ON tarifas_internas;
CREATE POLICY ti_modify ON tarifas_internas
  FOR ALL TO authenticated
  USING (
    usuario_es_ceo()
    OR usuario_tiene_atributo('tesorero_corporativo')
    OR usuario_tiene_rol_en_empresa(tarifas_internas.empresa_id, ARRAY['director'])
  );

-- Levantamientos: lectura por empresa, modificación vendedor (sus propios)
-- o director / operativo de la empresa
DROP POLICY IF EXISTS lev_select ON levantamientos;
CREATE POLICY lev_select ON levantamientos
  FOR SELECT TO authenticated
  USING (
    empresa_id IN (SELECT empresas_del_usuario())
    OR usuario_es_ceo()
  );

DROP POLICY IF EXISTS lev_insert ON levantamientos;
CREATE POLICY lev_insert ON levantamientos
  FOR INSERT TO authenticated
  WITH CHECK (
    usuario_es_ceo()
    OR vendedor_id = auth.uid()
    OR usuario_tiene_rol_en_empresa(levantamientos.empresa_id, ARRAY['director', 'operativo'])
  );

DROP POLICY IF EXISTS lev_update ON levantamientos;
CREATE POLICY lev_update ON levantamientos
  FOR UPDATE TO authenticated
  USING (
    usuario_es_ceo()
    OR vendedor_id = auth.uid()
    OR usuario_tiene_rol_en_empresa(levantamientos.empresa_id, ARRAY['director', 'operativo'])
  );

DROP POLICY IF EXISTS lev_pasos_all ON levantamiento_pasos;
CREATE POLICY lev_pasos_all ON levantamiento_pasos
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM levantamientos l
      WHERE l.id = levantamiento_pasos.levantamiento_id
        AND (
          l.empresa_id IN (SELECT empresas_del_usuario())
          OR usuario_es_ceo()
        )
    )
  );
