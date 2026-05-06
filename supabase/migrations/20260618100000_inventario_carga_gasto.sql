-- ============================================================================
-- Sprint Z+ — Inventario con stock físico pagado como gasto
-- ============================================================================
-- Caso: el grupo compró inventario y lo contabilizó como GASTO en cada empresa
-- pagadora (no como activo). Físicamente el material existe en almacén pero
-- contablemente no figura como inventario. Necesitamos:
--
-- 1. Cargar el stock físico al ERP (visibilidad operativa real)
-- 2. SIN generar OC/CFDI/movimientos contables retroactivos
-- 3. Trazabilidad de qué empresa pagó cada lote (para que control después
--    decida si reclasifica o capitaliza el activo)
--
-- Por eso extendemos inventario_movimientos con dos columnas:
--   - empresa_pago_id: qué empresa pagó este lote (puede ser distinta del
--     almacén destino, ya que el inventario físico es del grupo)
--   - registro_contable_pendiente: BOOLEAN para que control liste qué
--     entradas de inventario están en gris contablemente y necesitan
--     reconciliación posterior.
-- ============================================================================

ALTER TABLE inventario_movimientos
  ADD COLUMN IF NOT EXISTS empresa_pago_id UUID REFERENCES empresas(id),
  ADD COLUMN IF NOT EXISTS registro_contable_pendiente BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN inventario_movimientos.empresa_pago_id IS
  'Empresa que originalmente pagó este lote. Usado cuando la compra fue '
  'contabilizada como gasto en una empresa pero el inventario es del grupo.';
COMMENT ON COLUMN inventario_movimientos.registro_contable_pendiente IS
  'TRUE si este movimiento NO tiene contraparte contable en inventario '
  '(p. ej. cargas iniciales de material pagado como gasto). Usar para que '
  'control haga reconciliación posterior.';

CREATE INDEX IF NOT EXISTS idx_inv_mov_pendiente_contable
  ON inventario_movimientos(empresa_pago_id, created_at DESC)
  WHERE registro_contable_pendiente = TRUE;

CREATE INDEX IF NOT EXISTS idx_inv_mov_empresa_pago
  ON inventario_movimientos(empresa_pago_id)
  WHERE empresa_pago_id IS NOT NULL;

-- Documentar valores válidos del campo `tipo` actualizados
COMMENT ON COLUMN inventario_movimientos.tipo IS
  'Tipo de movimiento. Valores válidos: '
  'entrada_compra (con OC/CFDI), '
  'carga_inicial (saldo inicial al instalar el sistema), '
  'carga_inicial_gasto (stock físico pero comprado como gasto, registro_contable_pendiente=TRUE), '
  'salida_obra, traspaso, devolucion, ajuste.';

-- Vista de movimientos pendientes de reconciliación contable
CREATE OR REPLACE VIEW v_inventario_pendientes_contables AS
SELECT
  im.id AS movimiento_id,
  im.created_at,
  im.tipo,
  im.cantidad,
  im.empresa_pago_id,
  ep.codigo AS empresa_pago_codigo,
  ep.razon_social AS empresa_pago_razon,
  im.almacen_id,
  a.nombre AS almacen_nombre,
  a.empresa_id AS almacen_empresa_id,
  im.producto_id,
  cp.codigo AS producto_codigo,
  cp.nombre AS producto_nombre,
  cp.costo_unitario_usd,
  cp.moneda_compra,
  im.cantidad * COALESCE(cp.costo_promedio, 0) AS valor_aproximado_mxn,
  im.motivo,
  im.observaciones
FROM inventario_movimientos im
JOIN catalogo_productos cp ON cp.id = im.producto_id
JOIN almacenes a ON a.id = im.almacen_id
LEFT JOIN empresas ep ON ep.id = im.empresa_pago_id
WHERE im.registro_contable_pendiente = TRUE;

COMMENT ON VIEW v_inventario_pendientes_contables IS
  'Lista todos los movimientos de inventario marcados como pendientes de '
  'reconciliación contable. Útil para que control revise qué stock físico '
  'está sin contraparte contable de inventario y decida cómo proceder.';
