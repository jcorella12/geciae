-- ============================================================================
-- Sprint S+ — Valor de mercado en múltiples unidades
-- ============================================================================
-- Para sistemas solares (paneles, inversores, baterías) los precios de
-- mercado fluctúan en USD y a menudo se cotizan por watt. Soportamos 3
-- formas de capturar el valor de mercado, todas convertibles entre sí:
--
--   1. mxn_unidad  → pesos por unidad/pieza (default)
--   2. usd_unidad  → dólares por unidad/pieza
--   3. usd_watt    → dólares por watt (requiere capacidad_w del producto)
--
-- La columna `valor_mercado` (MXN/unidad) se mantiene como valor canónico
-- para listings y totales. Las nuevas columnas registran cómo se capturó y
-- el TC al momento, para que se pueda recalcular cuando cambie el USD/MXN.
-- ============================================================================

ALTER TABLE catalogo_productos
  ADD COLUMN IF NOT EXISTS valor_mercado_usd NUMERIC(14, 4),
  ADD COLUMN IF NOT EXISTS valor_mercado_usd_watt NUMERIC(10, 6),
  ADD COLUMN IF NOT EXISTS valor_mercado_unidad TEXT
    CHECK (valor_mercado_unidad IS NULL OR valor_mercado_unidad IN (
      'mxn_unidad', 'usd_unidad', 'usd_watt'
    )),
  ADD COLUMN IF NOT EXISTS valor_mercado_tc NUMERIC(10, 4);

COMMENT ON COLUMN catalogo_productos.valor_mercado IS
  'Canónico: MXN por unidad. Si la captura fue en USD, este valor es el equivalente al TC del momento (valor_mercado_tc).';
COMMENT ON COLUMN catalogo_productos.valor_mercado_usd IS
  'Si la captura fue por unidad en USD, el valor original.';
COMMENT ON COLUMN catalogo_productos.valor_mercado_usd_watt IS
  'Si la captura fue por watt en USD, el valor original. Requiere capacidad del producto.';
COMMENT ON COLUMN catalogo_productos.valor_mercado_unidad IS
  'Cómo se capturó: mxn_unidad (default), usd_unidad, usd_watt.';
COMMENT ON COLUMN catalogo_productos.valor_mercado_tc IS
  'TC USD/MXN al momento de capturar. Para recalcular MXN si cambia el TC.';

-- Función helper: recalcula valor_mercado en MXN usando un TC dado.
-- Útil para "actualizar todo a TC actual" en una operación batch.
CREATE OR REPLACE FUNCTION recalcular_valor_mercado(
  p_producto_id UUID,
  p_tc_nuevo NUMERIC
) RETURNS NUMERIC AS $$
DECLARE
  v_unidad TEXT;
  v_usd NUMERIC;
  v_usd_watt NUMERIC;
  v_capacidad NUMERIC;
  v_unidad_capacidad TEXT;
  v_nuevo_mxn NUMERIC;
BEGIN
  SELECT
    valor_mercado_unidad,
    valor_mercado_usd,
    valor_mercado_usd_watt,
    capacidad,
    unidad_capacidad
  INTO v_unidad, v_usd, v_usd_watt, v_capacidad, v_unidad_capacidad
  FROM catalogo_productos
  WHERE id = p_producto_id;

  IF v_unidad = 'usd_unidad' AND v_usd IS NOT NULL THEN
    v_nuevo_mxn := v_usd * p_tc_nuevo;
  ELSIF v_unidad = 'usd_watt' AND v_usd_watt IS NOT NULL AND v_capacidad IS NOT NULL THEN
    -- Normalizar capacidad a watts si está en kW
    IF v_unidad_capacidad = 'kW' THEN
      v_nuevo_mxn := v_usd_watt * (v_capacidad * 1000) * p_tc_nuevo;
    ELSE
      v_nuevo_mxn := v_usd_watt * v_capacidad * p_tc_nuevo;
    END IF;
  ELSE
    -- mxn_unidad o sin captura USD: no recalcular
    RETURN NULL;
  END IF;

  UPDATE catalogo_productos
  SET valor_mercado = v_nuevo_mxn,
      valor_mercado_tc = p_tc_nuevo,
      fecha_actualizacion_valor = CURRENT_DATE
  WHERE id = p_producto_id;

  RETURN v_nuevo_mxn;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION recalcular_valor_mercado IS
  'Recalcula valor_mercado MXN de un producto usando el TC nuevo, basándose en su captura USD original. Retorna NULL si no fue capturado en USD.';
