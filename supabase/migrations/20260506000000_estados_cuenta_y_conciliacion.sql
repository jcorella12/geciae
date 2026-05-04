-- Estados de cuenta archivados + columnas para conciliación bancaria.

-- ============================================================
-- 1) Tabla estados_cuenta_bancarios — archivo de PDFs/exports
-- ============================================================
CREATE TABLE IF NOT EXISTS estados_cuenta_bancarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cuenta_id UUID NOT NULL REFERENCES bancos_cuentas(id) ON DELETE CASCADE,
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE RESTRICT,
  periodo_inicio DATE NOT NULL,
  periodo_fin DATE NOT NULL,
  saldo_inicial NUMERIC(14,2),
  saldo_final NUMERIC(14,2) NOT NULL,
  total_abonos NUMERIC(14,2),
  total_cargos NUMERIC(14,2),
  num_abonos INTEGER,
  num_cargos INTEGER,
  formato TEXT NOT NULL,  -- 'pdf' | 'exp' | 'csv' | 'manual'
  url_archivo TEXT,        -- path en bucket 'estados-cuenta'
  movimientos_cargados INTEGER DEFAULT 0,
  observaciones TEXT,
  subido_por UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(cuenta_id, periodo_inicio, periodo_fin, formato)
);

CREATE INDEX IF NOT EXISTS idx_edocta_cuenta_periodo
  ON estados_cuenta_bancarios(cuenta_id, periodo_fin DESC);

-- ============================================================
-- 2) Storage bucket para PDFs/exports de estados de cuenta
-- ============================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('estados-cuenta', 'estados-cuenta', FALSE)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS edocta_storage_select ON storage.objects;
CREATE POLICY edocta_storage_select ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'estados-cuenta');

DROP POLICY IF EXISTS edocta_storage_insert ON storage.objects;
CREATE POLICY edocta_storage_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'estados-cuenta');

DROP POLICY IF EXISTS edocta_storage_delete ON storage.objects;
CREATE POLICY edocta_storage_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'estados-cuenta'
    AND (usuario_es_ceo() OR usuario_tiene_atributo('tesorero_corporativo'))
  );

-- ============================================================
-- 3) RLS para estados_cuenta_bancarios
-- ============================================================
ALTER TABLE estados_cuenta_bancarios ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS edocta_select ON estados_cuenta_bancarios;
CREATE POLICY edocta_select ON estados_cuenta_bancarios
  FOR SELECT TO authenticated
  USING (
    empresa_id IN (SELECT empresas_del_usuario())
    OR usuario_es_ceo()
    OR usuario_tiene_atributo('tesorero_corporativo')
  );

DROP POLICY IF EXISTS edocta_modify ON estados_cuenta_bancarios;
CREATE POLICY edocta_modify ON estados_cuenta_bancarios
  FOR ALL TO authenticated
  USING (
    usuario_es_ceo()
    OR usuario_tiene_atributo('tesorero_corporativo')
    OR EXISTS (
      SELECT 1 FROM usuarios_empresas
      WHERE usuario_id = auth.uid()
        AND empresa_id = estados_cuenta_bancarios.empresa_id
        AND rol = 'director'::rol_usuario
        AND activo = TRUE
    )
  );

-- ============================================================
-- 4) Conciliación: enriquecer bancos_movimientos
-- ============================================================
ALTER TABLE bancos_movimientos
  ADD COLUMN IF NOT EXISTS oc_relacionada_id UUID REFERENCES ordenes_compra(id),
  ADD COLUMN IF NOT EXISTS conciliado_por UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS fecha_conciliacion TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS conciliacion_notas TEXT;

CREATE INDEX IF NOT EXISTS idx_movs_oc ON bancos_movimientos(oc_relacionada_id)
  WHERE oc_relacionada_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_movs_cfdi ON bancos_movimientos(cfdi_relacionado_id)
  WHERE cfdi_relacionado_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_movs_no_conciliados
  ON bancos_movimientos(cuenta_id, fecha)
  WHERE conciliado = FALSE;

-- ============================================================
-- 5) Vista helper: movimientos no conciliados con sugerencias
-- ============================================================
-- Sugerencias por matching simple monto+empresa+rango fecha (±5 días):
--   - CFDI con saldo_pendiente cercano al monto del movimiento
--   - OC con total cercano al monto del movimiento
-- Se usa en la UI de conciliación para auto-sugerir vínculos.
CREATE OR REPLACE FUNCTION sugerir_match_movimiento(p_movimiento_id UUID)
RETURNS TABLE (
  tipo TEXT,
  match_id UUID,
  numero_o_folio TEXT,
  contraparte TEXT,
  monto NUMERIC,
  fecha DATE,
  similitud NUMERIC
)
LANGUAGE plpgsql STABLE
AS $$
DECLARE
  v_monto_abs NUMERIC;
  v_fecha DATE;
  v_empresa_id UUID;
  v_es_cargo BOOLEAN;
BEGIN
  SELECT ABS(m.monto), m.fecha, bc.empresa_id, m.tipo = 'cargo'
    INTO v_monto_abs, v_fecha, v_empresa_id, v_es_cargo
  FROM bancos_movimientos m
  JOIN bancos_cuentas bc ON bc.id = m.cuenta_id
  WHERE m.id = p_movimiento_id;

  IF v_monto_abs IS NULL THEN
    RETURN;
  END IF;

  -- CFDI candidatos: si es cargo (egreso), buscar CFDI recibido pendiente.
  -- Si es abono (ingreso), buscar CFDI emitido pendiente.
  RETURN QUERY
    SELECT
      'cfdi'::TEXT AS tipo,
      c.id AS match_id,
      COALESCE(c.serie, '') || COALESCE(c.folio, '') AS numero_o_folio,
      CASE
        WHEN c.es_emitido THEN COALESCE(c.nombre_receptor, c.rfc_receptor)
        ELSE COALESCE(c.nombre_emisor, c.rfc_emisor)
      END AS contraparte,
      c.total::NUMERIC AS monto,
      c.fecha_emision::DATE AS fecha,
      (1.0 - LEAST(ABS(c.total - v_monto_abs) / GREATEST(v_monto_abs, 1), 1))::NUMERIC AS similitud
    FROM cfdi c
    WHERE c.empresa_id = v_empresa_id
      AND c.estado = 'timbrado'
      AND COALESCE(c.saldo_pendiente, c.total) > 0
      AND c.es_emitido = (NOT v_es_cargo)
      AND ABS(c.total - v_monto_abs) <= GREATEST(v_monto_abs * 0.02, 1.0)  -- ±2% o ±$1
      AND c.fecha_emision::DATE BETWEEN (v_fecha - INTERVAL '15 days') AND (v_fecha + INTERVAL '5 days')
    ORDER BY similitud DESC, ABS(c.fecha_emision::DATE - v_fecha)
    LIMIT 5;

  -- OC candidatos: solo para cargos (pagos a proveedores).
  IF v_es_cargo THEN
    RETURN QUERY
      SELECT
        'oc'::TEXT AS tipo,
        oc.id AS match_id,
        oc.numero AS numero_o_folio,
        COALESCE(p.razon_social, p.rfc) AS contraparte,
        oc.total::NUMERIC AS monto,
        oc.fecha_emision::DATE AS fecha,
        (1.0 - LEAST(ABS(oc.total - v_monto_abs) / GREATEST(v_monto_abs, 1), 1))::NUMERIC AS similitud
      FROM ordenes_compra oc
      JOIN proveedores p ON p.id = oc.proveedor_id
      WHERE oc.empresa_id = v_empresa_id
        AND oc.estado IN ('aprobada', 'enviada', 'parcial_recibida', 'recibida')
        AND ABS(oc.total - v_monto_abs) <= GREATEST(v_monto_abs * 0.02, 1.0)
        AND oc.fecha_emision::DATE BETWEEN (v_fecha - INTERVAL '60 days') AND (v_fecha + INTERVAL '10 days')
      ORDER BY similitud DESC, ABS(oc.fecha_emision::DATE - v_fecha)
      LIMIT 5;
  END IF;
END;
$$;

-- ============================================================
-- 6) Vista de resumen mensual por cuenta para conciliación
-- ============================================================
CREATE OR REPLACE VIEW v_conciliacion_mensual AS
SELECT
  bc.id AS cuenta_id,
  bc.empresa_id,
  DATE_TRUNC('month', m.fecha)::DATE AS mes,
  COUNT(*) AS num_movs,
  COUNT(*) FILTER (WHERE m.conciliado = TRUE) AS num_conciliados,
  COUNT(*) FILTER (WHERE m.conciliado = FALSE) AS num_pendientes,
  SUM(CASE WHEN m.tipo = 'abono' THEN m.monto ELSE 0 END) AS total_abonos,
  SUM(CASE WHEN m.tipo = 'cargo' THEN ABS(m.monto) ELSE 0 END) AS total_cargos,
  SUM(CASE WHEN m.tipo = 'abono' AND m.conciliado THEN m.monto ELSE 0 END) AS abonos_conciliados,
  SUM(CASE WHEN m.tipo = 'cargo' AND m.conciliado THEN ABS(m.monto) ELSE 0 END) AS cargos_conciliados
FROM bancos_movimientos m
JOIN bancos_cuentas bc ON bc.id = m.cuenta_id
GROUP BY bc.id, bc.empresa_id, DATE_TRUNC('month', m.fecha);
