-- =============================================================================
-- INVENTARIO: extiende schema existente con campos de valoración + vistas
-- =============================================================================
-- Ya existen: catalogo_productos, almacenes, inventario, inventario_movimientos
-- Esta migración añade:
--   - Categorías más ricas (panel solar, inversor, etc.) → columna `categoria`
--   - Valor a mercado (vs costo) y trazabilidad de fluctuaciones
--   - Vista consolidada de stock × valoración
--   - Trigger que recalcula costo_promedio al ingresar movimientos

-- Limpieza por si la migración fallida dejó residuos
DROP TABLE IF EXISTS inventario_items CASCADE;
DROP TABLE IF EXISTS inventario_almacenes CASCADE;
DROP TYPE IF EXISTS categoria_inventario CASCADE;
DROP TYPE IF EXISTS unidad_medida CASCADE;
DROP TYPE IF EXISTS tipo_movimiento_inv CASCADE;

-- =============================================================================
-- ENUMs y extensiones a catalogo_productos
-- =============================================================================
DO $$ BEGIN
  CREATE TYPE categoria_inventario AS ENUM (
    'panel_solar',
    'inversor',
    'estructura',
    'cable',
    'herraje',
    'tablero',
    'proteccion',
    'monitoreo',
    'baterias',
    'herramienta',
    'consumible',
    'epp',
    'otro'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE catalogo_productos
  ADD COLUMN IF NOT EXISTS categoria categoria_inventario DEFAULT 'otro',
  ADD COLUMN IF NOT EXISTS empresa_id UUID REFERENCES empresas(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS valor_mercado NUMERIC(14, 4),
  ADD COLUMN IF NOT EXISTS fecha_actualizacion_valor DATE,
  ADD COLUMN IF NOT EXISTS fuente_valor TEXT,
  ADD COLUMN IF NOT EXISTS costo_ultimo NUMERIC(14, 4),
  ADD COLUMN IF NOT EXISTS costo_minimo NUMERIC(14, 4),
  ADD COLUMN IF NOT EXISTS costo_maximo NUMERIC(14, 4),
  ADD COLUMN IF NOT EXISTS especificaciones JSONB,
  ADD COLUMN IF NOT EXISTS imagen_url TEXT,
  ADD COLUMN IF NOT EXISTS proveedor_preferido_id UUID REFERENCES proveedores(id),
  ADD COLUMN IF NOT EXISTS activo BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS observaciones TEXT,
  ADD COLUMN IF NOT EXISTS subcategoria TEXT;

CREATE INDEX IF NOT EXISTS idx_cat_prod_categoria
  ON catalogo_productos(categoria) WHERE activo = TRUE;
CREATE INDEX IF NOT EXISTS idx_cat_prod_empresa
  ON catalogo_productos(empresa_id) WHERE activo = TRUE;

-- =============================================================================
-- Asegurar inventario_movimientos tiene los campos necesarios
-- =============================================================================
ALTER TABLE inventario_movimientos
  ADD COLUMN IF NOT EXISTS empresa_id UUID REFERENCES empresas(id),
  ADD COLUMN IF NOT EXISTS fecha DATE DEFAULT CURRENT_DATE,
  ADD COLUMN IF NOT EXISTS costo_unitario NUMERIC(14, 4),
  ADD COLUMN IF NOT EXISTS monto_total NUMERIC(14, 4),
  ADD COLUMN IF NOT EXISTS proveedor_id UUID REFERENCES proveedores(id),
  ADD COLUMN IF NOT EXISTS cfdi_id UUID REFERENCES cfdi(id),
  ADD COLUMN IF NOT EXISTS movimiento_relacionado_id UUID REFERENCES inventario_movimientos(id),
  ADD COLUMN IF NOT EXISTS numero_documento TEXT,
  ADD COLUMN IF NOT EXISTS capturado_por_nombre TEXT;

CREATE INDEX IF NOT EXISTS idx_inv_mov_proyecto
  ON inventario_movimientos(proyecto_id) WHERE proyecto_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_inv_mov_almacen
  ON inventario_movimientos(almacen_id, producto_id);
CREATE INDEX IF NOT EXISTS idx_inv_mov_empresa
  ON inventario_movimientos(empresa_id, fecha DESC);

-- =============================================================================
-- Trigger: recalcular costos del producto al ingresar movimientos
-- =============================================================================
CREATE OR REPLACE FUNCTION inv_actualizar_costos()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  stock_actual NUMERIC := 0;
  costo_prom NUMERIC := 0;
BEGIN
  IF NEW.cantidad IS NULL OR NEW.cantidad <= 0 THEN
    RAISE EXCEPTION 'cantidad debe ser positiva';
  END IF;

  -- Calcular monto_total si no viene
  IF NEW.monto_total IS NULL AND NEW.costo_unitario IS NOT NULL THEN
    NEW.monto_total := NEW.cantidad * NEW.costo_unitario;
  END IF;

  -- Actualizar costos del producto solo en entradas con costo
  IF NEW.tipo IN ('entrada_compra', 'entrada_ajuste', 'devolucion')
     AND NEW.costo_unitario IS NOT NULL THEN
    SELECT COALESCE(SUM(
      CASE
        WHEN tipo IN ('entrada_compra', 'devolucion', 'entrada_ajuste', 'traspaso_entrada')
          THEN cantidad
        WHEN tipo IN ('salida_obra', 'salida_proyecto', 'salida_venta', 'salida_merma', 'salida_ajuste', 'traspaso_salida', 'ajuste')
          THEN -cantidad
      END
    ), 0)
    INTO stock_actual
    FROM inventario_movimientos
    WHERE producto_id = NEW.producto_id;

    SELECT costo_promedio INTO costo_prom
    FROM catalogo_productos WHERE id = NEW.producto_id;

    IF stock_actual + NEW.cantidad > 0 THEN
      UPDATE catalogo_productos
      SET
        costo_promedio = (
          (stock_actual * COALESCE(costo_prom, NEW.costo_unitario)) +
          (NEW.cantidad * NEW.costo_unitario)
        ) / (stock_actual + NEW.cantidad),
        costo_ultimo = NEW.costo_unitario,
        costo_minimo = LEAST(COALESCE(costo_minimo, NEW.costo_unitario), NEW.costo_unitario),
        costo_maximo = GREATEST(COALESCE(costo_maximo, NEW.costo_unitario), NEW.costo_unitario),
        updated_at = NOW()
      WHERE id = NEW.producto_id;
    END IF;
  END IF;

  -- En salidas sin costo, asignar costo promedio
  IF NEW.tipo IN ('salida_obra', 'salida_proyecto', 'salida_venta', 'salida_merma', 'traspaso_salida')
     AND NEW.costo_unitario IS NULL THEN
    SELECT costo_promedio INTO NEW.costo_unitario
    FROM catalogo_productos WHERE id = NEW.producto_id;
    NEW.monto_total := NEW.cantidad * COALESCE(NEW.costo_unitario, 0);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_inv_costos ON inventario_movimientos;
CREATE TRIGGER trg_inv_costos
  BEFORE INSERT ON inventario_movimientos
  FOR EACH ROW EXECUTE FUNCTION inv_actualizar_costos();

-- =============================================================================
-- Vistas
-- =============================================================================

-- Stock consolidado por producto (sumando todos los almacenes)
CREATE OR REPLACE VIEW v_inventario_stock AS
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
      WHEN m.tipo IN ('entrada_compra', 'devolucion', 'entrada_ajuste', 'traspaso_entrada')
        THEN m.cantidad
      WHEN m.tipo IN ('salida_obra', 'salida_proyecto', 'salida_venta', 'salida_merma', 'salida_ajuste', 'traspaso_salida', 'ajuste')
        THEN -m.cantidad
      ELSE 0
    END
  ), 0) AS stock_actual,
  -- Valor a costo (stock × costo_promedio)
  COALESCE(SUM(
    CASE
      WHEN m.tipo IN ('entrada_compra', 'devolucion', 'entrada_ajuste', 'traspaso_entrada')
        THEN m.cantidad
      WHEN m.tipo IN ('salida_obra', 'salida_proyecto', 'salida_venta', 'salida_merma', 'salida_ajuste', 'traspaso_salida', 'ajuste')
        THEN -m.cantidad
      ELSE 0
    END
  ), 0) * COALESCE(p.costo_promedio, 0) AS valor_costo,
  -- Valor a mercado (stock × valor_mercado, fallback a costo)
  COALESCE(SUM(
    CASE
      WHEN m.tipo IN ('entrada_compra', 'devolucion', 'entrada_ajuste', 'traspaso_entrada')
        THEN m.cantidad
      WHEN m.tipo IN ('salida_obra', 'salida_proyecto', 'salida_venta', 'salida_merma', 'salida_ajuste', 'traspaso_salida', 'ajuste')
        THEN -m.cantidad
      ELSE 0
    END
  ), 0) * COALESCE(p.valor_mercado, p.costo_promedio, 0) AS valor_mercado_total,
  MAX(m.fecha) AS ultimo_movimiento_fecha,
  -- Estado de stock vs mínimo
  CASE
    WHEN COALESCE(SUM(
      CASE
        WHEN m.tipo IN ('entrada_compra', 'devolucion', 'entrada_ajuste', 'traspaso_entrada')
          THEN m.cantidad
        WHEN m.tipo IN ('salida_obra', 'salida_proyecto', 'salida_venta', 'salida_merma', 'salida_ajuste', 'traspaso_salida', 'ajuste')
          THEN -m.cantidad
      END
    ), 0) <= 0 THEN 'agotado'
    WHEN p.stock_minimo > 0 AND COALESCE(SUM(
      CASE
        WHEN m.tipo IN ('entrada_compra', 'devolucion', 'entrada_ajuste', 'traspaso_entrada')
          THEN m.cantidad
        WHEN m.tipo IN ('salida_obra', 'salida_proyecto', 'salida_venta', 'salida_merma', 'salida_ajuste', 'traspaso_salida', 'ajuste')
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

-- Stock por almacén
CREATE OR REPLACE VIEW v_inventario_stock_almacen AS
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
      WHEN m.tipo IN ('entrada_compra', 'devolucion', 'entrada_ajuste', 'traspaso_entrada')
        THEN m.cantidad
      WHEN m.tipo IN ('salida_obra', 'salida_proyecto', 'salida_venta', 'salida_merma', 'salida_ajuste', 'traspaso_salida', 'ajuste')
        THEN -m.cantidad
      ELSE 0
    END
  ), 0) AS stock
FROM inventario_movimientos m
JOIN catalogo_productos p ON p.id = m.producto_id
JOIN almacenes a ON a.id = m.almacen_id
GROUP BY m.producto_id, m.almacen_id, p.empresa_id, p.codigo, p.nombre,
  p.unidad_medida, a.codigo, a.nombre;

-- Movimientos con info enriquecida
CREATE OR REPLACE VIEW v_inventario_movimientos AS
SELECT
  m.*,
  p.codigo AS producto_codigo,
  p.nombre AS producto_nombre,
  p.unidad_medida,
  p.empresa_id AS producto_empresa_id,
  a.codigo AS almacen_codigo,
  a.nombre AS almacen_nombre,
  pr.codigo AS proyecto_codigo,
  pr.nombre AS proyecto_nombre,
  pv.razon_social AS proveedor_nombre
FROM inventario_movimientos m
LEFT JOIN catalogo_productos p ON p.id = m.producto_id
LEFT JOIN almacenes a ON a.id = m.almacen_id
LEFT JOIN proyectos pr ON pr.id = m.proyecto_id
LEFT JOIN proveedores pv ON pv.id = m.proveedor_id;

-- =============================================================================
-- RLS
-- =============================================================================
ALTER TABLE catalogo_productos ENABLE ROW LEVEL SECURITY;
ALTER TABLE almacenes ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventario ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventario_movimientos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS cat_prod_select ON catalogo_productos;
CREATE POLICY cat_prod_select ON catalogo_productos
  FOR SELECT TO authenticated
  USING (
    empresa_id IS NULL
    OR empresa_id IN (SELECT empresas_del_usuario())
    OR usuario_es_ceo()
  );

DROP POLICY IF EXISTS cat_prod_modify ON catalogo_productos;
CREATE POLICY cat_prod_modify ON catalogo_productos
  FOR ALL TO authenticated
  USING (
    usuario_es_ceo()
    OR (empresa_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM usuarios_empresas
      WHERE usuario_id = auth.uid()
        AND empresa_id = catalogo_productos.empresa_id
        AND rol IN ('director'::rol_usuario, 'operativo'::rol_usuario)
        AND activo = TRUE
    ))
  );

DROP POLICY IF EXISTS alm_select ON almacenes;
CREATE POLICY alm_select ON almacenes
  FOR SELECT TO authenticated
  USING (
    empresa_id IN (SELECT empresas_del_usuario())
    OR usuario_es_ceo()
  );

DROP POLICY IF EXISTS alm_modify ON almacenes;
CREATE POLICY alm_modify ON almacenes
  FOR ALL TO authenticated
  USING (
    usuario_es_ceo()
    OR EXISTS (
      SELECT 1 FROM usuarios_empresas
      WHERE usuario_id = auth.uid()
        AND empresa_id = almacenes.empresa_id
        AND rol IN ('director'::rol_usuario, 'operativo'::rol_usuario)
        AND activo = TRUE
    )
  );

DROP POLICY IF EXISTS inv_select ON inventario;
CREATE POLICY inv_select ON inventario
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM almacenes
      WHERE almacenes.id = inventario.almacen_id
        AND (
          almacenes.empresa_id IN (SELECT empresas_del_usuario())
          OR usuario_es_ceo()
        )
    )
  );

DROP POLICY IF EXISTS inv_modify ON inventario;
CREATE POLICY inv_modify ON inventario
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM almacenes
      WHERE almacenes.id = inventario.almacen_id
        AND (
          usuario_es_ceo()
          OR EXISTS (
            SELECT 1 FROM usuarios_empresas
            WHERE usuario_id = auth.uid()
              AND empresa_id = almacenes.empresa_id
              AND rol IN ('director'::rol_usuario, 'operativo'::rol_usuario)
              AND activo = TRUE
          )
        )
    )
  );

DROP POLICY IF EXISTS inv_mov_select ON inventario_movimientos;
CREATE POLICY inv_mov_select ON inventario_movimientos
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM almacenes
      WHERE almacenes.id = inventario_movimientos.almacen_id
        AND (
          almacenes.empresa_id IN (SELECT empresas_del_usuario())
          OR usuario_es_ceo()
        )
    )
  );

DROP POLICY IF EXISTS inv_mov_modify ON inventario_movimientos;
CREATE POLICY inv_mov_modify ON inventario_movimientos
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM almacenes
      WHERE almacenes.id = inventario_movimientos.almacen_id
        AND (
          usuario_es_ceo()
          OR EXISTS (
            SELECT 1 FROM usuarios_empresas
            WHERE usuario_id = auth.uid()
              AND empresa_id = almacenes.empresa_id
              AND rol IN ('director'::rol_usuario, 'operativo'::rol_usuario)
              AND activo = TRUE
          )
        )
    )
  );

-- =============================================================================
-- Asegurar almacén principal por empresa activa
-- =============================================================================
INSERT INTO almacenes (empresa_id, codigo, nombre, tipo)
SELECT id, 'PRINCIPAL', 'Almacén principal', 'principal'
FROM empresas WHERE activa = TRUE
ON CONFLICT (empresa_id, codigo) DO NOTHING;
