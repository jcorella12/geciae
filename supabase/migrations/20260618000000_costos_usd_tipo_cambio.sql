-- ============================================================================
-- Sprint Z+ — Costos en USD y tipo de cambio dinámico
-- ============================================================================
-- Motivación:
--   Mucho del inventario se compra en USD a proveedores extranjeros (paneles,
--   inversores, estructura NEXT, etc.). Los costos cambian con el TC, así que
--   guardamos el costo unitario en USD original y calculamos el equivalente
--   MXN al TC actual. Mirroring del patrón ya usado para TIIE.
-- ============================================================================

-- 1. Tabla tipo_cambio_historico
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tipo_cambio_historico (
  fecha DATE PRIMARY KEY,
  par TEXT NOT NULL DEFAULT 'USD/MXN',     -- USD/MXN, EUR/MXN, etc.
  tipo TEXT NOT NULL DEFAULT 'fix',        -- fix (DOF), spot, manual
  tasa NUMERIC(10, 6) NOT NULL,
  fuente TEXT DEFAULT 'banxico',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tc_fecha_desc ON tipo_cambio_historico(fecha DESC);
CREATE INDEX IF NOT EXISTS idx_tc_par ON tipo_cambio_historico(par, fecha DESC);

ALTER TABLE tipo_cambio_historico ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tc_select ON tipo_cambio_historico;
CREATE POLICY tc_select ON tipo_cambio_historico
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS tc_insert ON tipo_cambio_historico;
CREATE POLICY tc_insert ON tipo_cambio_historico
  FOR INSERT TO authenticated
  WITH CHECK (
    usuario_es_ceo()
    OR EXISTS (
      SELECT 1 FROM usuarios_empresas
      WHERE usuario_id = auth.uid()
        AND ('tesorero_corporativo' = ANY(atributos)
             OR 'aprobador_financiero' = ANY(atributos)
             OR 'contralor' = ANY(atributos))
        AND activo = TRUE
    )
  );

DROP POLICY IF EXISTS tc_update ON tipo_cambio_historico;
CREATE POLICY tc_update ON tipo_cambio_historico
  FOR UPDATE TO authenticated
  USING (
    usuario_es_ceo()
    OR EXISTS (
      SELECT 1 FROM usuarios_empresas
      WHERE usuario_id = auth.uid()
        AND ('tesorero_corporativo' = ANY(atributos)
             OR 'contralor' = ANY(atributos))
        AND activo = TRUE
    )
  );

COMMENT ON TABLE tipo_cambio_historico IS
  'Histórico de tipo de cambio (USD/MXN principalmente) sincronizado desde Banxico SIE serie SF43718 (FIX DOF) o capturado manualmente.';

-- 2. Función helper: tipo de cambio actual
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION tipo_cambio_actual(p_par TEXT DEFAULT 'USD/MXN')
RETURNS NUMERIC AS $$
  SELECT tasa
  FROM tipo_cambio_historico
  WHERE par = p_par
  ORDER BY fecha DESC
  LIMIT 1;
$$ LANGUAGE SQL STABLE;

COMMENT ON FUNCTION tipo_cambio_actual IS
  'Retorna el TC más reciente del par solicitado. NULL si no hay datos.';

-- 3. Extender catalogo_productos con costo en USD
-- ----------------------------------------------------------------------------
ALTER TABLE catalogo_productos
  ADD COLUMN IF NOT EXISTS costo_unitario_usd NUMERIC(12, 4),
  ADD COLUMN IF NOT EXISTS moneda_compra TEXT DEFAULT 'MXN'
    CHECK (moneda_compra IN ('MXN', 'USD', 'EUR')),
  ADD COLUMN IF NOT EXISTS tc_compra_referencia NUMERIC(10, 4),
  ADD COLUMN IF NOT EXISTS fecha_costo_actualizado TIMESTAMPTZ;

COMMENT ON COLUMN catalogo_productos.costo_unitario_usd IS
  'Costo original en USD (si aplica). Útil para productos importados que se valoran al TC actual.';
COMMENT ON COLUMN catalogo_productos.moneda_compra IS
  'Moneda del costo original: MXN (default), USD, EUR.';
COMMENT ON COLUMN catalogo_productos.tc_compra_referencia IS
  'TC al momento de la compra (para histórico — no se usa para valorar a hoy).';
COMMENT ON COLUMN catalogo_productos.fecha_costo_actualizado IS
  'Fecha de la última actualización del costo unitario.';

-- 4. Vista que valora todo el inventario al TC actual
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW v_inventario_valorado AS
SELECT
  i.id AS inventario_id,
  i.almacen_id,
  a.nombre AS almacen_nombre,
  a.empresa_id,
  e.codigo AS empresa_codigo,
  i.producto_id,
  cp.codigo AS producto_codigo,
  cp.nombre AS producto_nombre,
  cp.categoria,
  cp.marca,
  cp.modelo,
  i.stock,
  i.stock_disponible,
  cp.unidad_medida,
  cp.moneda_compra,
  cp.costo_promedio AS costo_unit_mxn,
  cp.costo_unitario_usd,
  CASE
    WHEN cp.moneda_compra = 'USD' AND cp.costo_unitario_usd IS NOT NULL THEN
      cp.costo_unitario_usd * COALESCE(tipo_cambio_actual('USD/MXN'), cp.tc_compra_referencia, 0)
    ELSE
      COALESCE(cp.costo_promedio, 0)
  END AS costo_unit_mxn_actual,
  i.stock * COALESCE(cp.costo_promedio, 0) AS valor_total_mxn_historico,
  i.stock * CASE
    WHEN cp.moneda_compra = 'USD' AND cp.costo_unitario_usd IS NOT NULL THEN
      cp.costo_unitario_usd * COALESCE(tipo_cambio_actual('USD/MXN'), cp.tc_compra_referencia, 0)
    ELSE
      COALESCE(cp.costo_promedio, 0)
  END AS valor_total_mxn_actual
FROM inventario i
JOIN catalogo_productos cp ON cp.id = i.producto_id
JOIN almacenes a ON a.id = i.almacen_id
LEFT JOIN empresas e ON e.id = a.empresa_id
WHERE cp.activo = TRUE;

COMMENT ON VIEW v_inventario_valorado IS
  'Inventario valorado a costo histórico (costo_promedio MXN) y a TC actual (para productos en USD).';
