-- ============================================================================
-- Fix: vistas v_inventario_stock y v_inventario_stock_almacen no contaban
-- los movimientos tipo 'carga_inicial' ni 'carga_inicial_gasto', así que el
-- stock aparecía en 0 a pesar de haber movimientos. Re-creamos las vistas
-- incluyendo estos tipos como entradas.
-- ============================================================================

DROP VIEW IF EXISTS v_inventario_stock CASCADE;
DROP VIEW IF EXISTS v_inventario_stock_almacen CASCADE;

CREATE VIEW v_inventario_stock AS
SELECT
  p.id AS producto_id,
  p.empresa_id,
  p.codigo AS sku,
  p.nombre,
  p.descripcion,
  p.categoria,
  p.subcategoria,
  p.marca,
  p.modelo,
  p.unidad_medida,
  p.stock_minimo,
  p.stock_maximo,
  p.costo_promedio,
  p.costo_ultimo,
  p.costo_minimo,
  p.costo_maximo,
  p.valor_mercado,
  p.fecha_actualizacion_valor,
  p.imagen_url,
  COALESCE(SUM(
    CASE
      WHEN m.tipo IN (
        'entrada_compra', 'devolucion', 'entrada_ajuste', 'traspaso_entrada',
        'carga_inicial', 'carga_inicial_gasto'
      )
        THEN m.cantidad
      WHEN m.tipo IN (
        'salida_obra', 'salida_proyecto', 'salida_venta', 'salida_merma',
        'salida_ajuste', 'traspaso_salida', 'ajuste'
      )
        THEN -m.cantidad
      ELSE 0
    END
  ), 0) AS stock_actual,
  COALESCE(SUM(
    CASE
      WHEN m.tipo IN (
        'entrada_compra', 'devolucion', 'entrada_ajuste', 'traspaso_entrada',
        'carga_inicial', 'carga_inicial_gasto'
      )
        THEN m.cantidad
      WHEN m.tipo IN (
        'salida_obra', 'salida_proyecto', 'salida_venta', 'salida_merma',
        'salida_ajuste', 'traspaso_salida', 'ajuste'
      )
        THEN -m.cantidad
      ELSE 0
    END
  ), 0) * COALESCE(p.costo_promedio, 0) AS valor_costo,
  COALESCE(SUM(
    CASE
      WHEN m.tipo IN (
        'entrada_compra', 'devolucion', 'entrada_ajuste', 'traspaso_entrada',
        'carga_inicial', 'carga_inicial_gasto'
      )
        THEN m.cantidad
      WHEN m.tipo IN (
        'salida_obra', 'salida_proyecto', 'salida_venta', 'salida_merma',
        'salida_ajuste', 'traspaso_salida', 'ajuste'
      )
        THEN -m.cantidad
      ELSE 0
    END
  ), 0) * COALESCE(p.valor_mercado, p.costo_promedio, 0) AS valor_mercado_total,
  MAX(m.fecha) AS ultimo_movimiento_fecha,
  CASE
    WHEN COALESCE(SUM(
      CASE
        WHEN m.tipo IN (
          'entrada_compra', 'devolucion', 'entrada_ajuste', 'traspaso_entrada',
          'carga_inicial', 'carga_inicial_gasto'
        )
          THEN m.cantidad
        WHEN m.tipo IN (
          'salida_obra', 'salida_proyecto', 'salida_venta', 'salida_merma',
          'salida_ajuste', 'traspaso_salida', 'ajuste'
        )
          THEN -m.cantidad
      END
    ), 0) <= 0 THEN 'agotado'
    WHEN p.stock_minimo > 0 AND COALESCE(SUM(
      CASE
        WHEN m.tipo IN (
          'entrada_compra', 'devolucion', 'entrada_ajuste', 'traspaso_entrada',
          'carga_inicial', 'carga_inicial_gasto'
        )
          THEN m.cantidad
        WHEN m.tipo IN (
          'salida_obra', 'salida_proyecto', 'salida_venta', 'salida_merma',
          'salida_ajuste', 'traspaso_salida', 'ajuste'
        )
          THEN -m.cantidad
      END
    ), 0) <= p.stock_minimo THEN 'bajo'
    ELSE 'normal'
  END AS estado_stock
FROM catalogo_productos p
LEFT JOIN inventario_movimientos m ON m.producto_id = p.id
WHERE p.activo = TRUE
GROUP BY
  p.id, p.empresa_id, p.codigo, p.nombre, p.descripcion, p.categoria,
  p.subcategoria, p.marca, p.modelo, p.unidad_medida,
  p.stock_minimo, p.stock_maximo, p.costo_promedio,
  p.costo_ultimo, p.costo_minimo, p.costo_maximo,
  p.valor_mercado, p.fecha_actualizacion_valor, p.imagen_url;

CREATE VIEW v_inventario_stock_almacen AS
SELECT
  m.producto_id,
  m.almacen_id,
  p.empresa_id,
  p.codigo AS sku,
  p.nombre,
  p.unidad_medida,
  a.codigo AS almacen_codigo,
  a.nombre AS almacen_nombre,
  COALESCE(SUM(
    CASE
      WHEN m.tipo IN (
        'entrada_compra', 'devolucion', 'entrada_ajuste', 'traspaso_entrada',
        'carga_inicial', 'carga_inicial_gasto'
      )
        THEN m.cantidad
      WHEN m.tipo IN (
        'salida_obra', 'salida_proyecto', 'salida_venta', 'salida_merma',
        'salida_ajuste', 'traspaso_salida', 'ajuste'
      )
        THEN -m.cantidad
      ELSE 0
    END
  ), 0) AS stock_actual,
  MAX(m.fecha) AS ultimo_movimiento_fecha
FROM inventario_movimientos m
JOIN catalogo_productos p ON p.id = m.producto_id
JOIN almacenes a ON a.id = m.almacen_id
WHERE p.activo = TRUE
GROUP BY
  m.producto_id, m.almacen_id, p.empresa_id, p.codigo, p.nombre,
  p.unidad_medida, a.codigo, a.nombre;
