-- Sprint 18 — Estados financieros mensuales del despacho contable.
-- Cada mes el despacho entrega un paquete con 13 PDFs:
--   1. Balance General
--   2. Estado de Resultados
--   3. Balanza de Comprobación
--   4. Flujo de Efectivo
--   5. Anexos del Catálogo Ingresos
--   6. Anexos del Catálogo Egresos
--   7. Conciliación de IVA contable y fiscal
--   8. Movimientos auxiliares IVA Trasladado
--   9. Movimientos auxiliares IVA Acreditable
--  10. Movimientos auxiliares Subsidio
--  11. Movimientos auxiliares Impuestos por pagar
--  12. Movimientos auxiliares del Catálogo (Bancos)
--  13. Diarios y Pólizas
--
-- También guardamos versiones con/sin firma del despacho.

CREATE TABLE IF NOT EXISTS estados_financieros_mensuales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE RESTRICT,
  anio INTEGER NOT NULL CHECK (anio BETWEEN 2020 AND 2099),
  mes INTEGER NOT NULL CHECK (mes BETWEEN 1 AND 12),

  -- Mapeo de tipo de documento → path en bucket
  -- Ej. {"balance_general": "uuid/2026-03/balance.pdf", ...}
  documentos JSONB NOT NULL DEFAULT '{}'::jsonb,
  num_documentos INTEGER NOT NULL DEFAULT 0,
  total_size_bytes BIGINT,

  paquete_completo BOOLEAN DEFAULT FALSE,  -- true si tiene los 13 estándar
  firmados BOOLEAN DEFAULT FALSE,          -- el despacho firmó

  -- KPIs extraídos del balance + ER (opcional, llena después con IA)
  utilidad_neta NUMERIC(14,2),
  ingresos_totales NUMERIC(14,2),
  egresos_totales NUMERIC(14,2),
  iva_trasladado NUMERIC(14,2),
  iva_acreditable NUMERIC(14,2),
  flujo_efectivo NUMERIC(14,2),

  observaciones TEXT,
  subido_por UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(empresa_id, anio, mes)
);

CREATE INDEX IF NOT EXISTS idx_efm_empresa_periodo
  ON estados_financieros_mensuales(empresa_id, anio DESC, mes DESC);

-- Bucket para los PDFs del despacho
INSERT INTO storage.buckets (id, name, public)
VALUES ('estados-financieros', 'estados-financieros', FALSE)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS efm_storage_select ON storage.objects;
CREATE POLICY efm_storage_select ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'estados-financieros');

DROP POLICY IF EXISTS efm_storage_insert ON storage.objects;
CREATE POLICY efm_storage_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'estados-financieros');

DROP POLICY IF EXISTS efm_storage_delete ON storage.objects;
CREATE POLICY efm_storage_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'estados-financieros' AND usuario_es_ceo());

-- RLS
ALTER TABLE estados_financieros_mensuales ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS efm_select ON estados_financieros_mensuales;
CREATE POLICY efm_select ON estados_financieros_mensuales
  FOR SELECT TO authenticated
  USING (
    empresa_id IN (SELECT empresas_del_usuario())
    OR usuario_es_ceo()
    OR usuario_tiene_atributo('tesorero_corporativo')
    OR usuario_tiene_atributo('aprobador_financiero')
    OR usuario_tiene_atributo('auditor_interno')
  );

DROP POLICY IF EXISTS efm_modify ON estados_financieros_mensuales;
CREATE POLICY efm_modify ON estados_financieros_mensuales
  FOR ALL TO authenticated
  USING (
    usuario_es_ceo()
    OR usuario_tiene_atributo('tesorero_corporativo')
    OR EXISTS (
      SELECT 1 FROM usuarios_empresas
      WHERE usuario_id = auth.uid()
        AND empresa_id = estados_financieros_mensuales.empresa_id
        AND rol IN ('director'::rol_usuario, 'operativo'::rol_usuario)
        AND activo = TRUE
    )
  );

-- Vista para listado con código de empresa y label del mes
CREATE OR REPLACE VIEW v_estados_financieros_lista AS
SELECT
  ef.id,
  ef.empresa_id,
  e.codigo AS empresa_codigo,
  e.razon_social AS empresa_razon_social,
  ef.anio,
  ef.mes,
  CASE ef.mes
    WHEN 1 THEN 'Enero' WHEN 2 THEN 'Febrero' WHEN 3 THEN 'Marzo'
    WHEN 4 THEN 'Abril' WHEN 5 THEN 'Mayo' WHEN 6 THEN 'Junio'
    WHEN 7 THEN 'Julio' WHEN 8 THEN 'Agosto' WHEN 9 THEN 'Septiembre'
    WHEN 10 THEN 'Octubre' WHEN 11 THEN 'Noviembre' WHEN 12 THEN 'Diciembre'
  END AS mes_nombre,
  TO_DATE(ef.anio || '-' || LPAD(ef.mes::TEXT, 2, '0') || '-01', 'YYYY-MM-DD') AS periodo,
  ef.num_documentos,
  ef.paquete_completo,
  ef.firmados,
  ef.utilidad_neta,
  ef.ingresos_totales,
  ef.egresos_totales,
  ef.documentos,
  ef.created_at
FROM estados_financieros_mensuales ef
LEFT JOIN empresas e ON e.id = ef.empresa_id;
