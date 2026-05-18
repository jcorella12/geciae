-- ============================================================================
-- Sprint backlog — productos_serie BUILD
--
-- La tabla existe desde init.sql con RLS habilitado pero SIN policies.
-- Sin policies + RLS habilitado = todo INSERT/SELECT/UPDATE rechazado
-- para usuarios normales. Mismo patrón que `capacitaciones` antes.
--
-- Reglas (alineadas con módulo de inventario):
-- - SELECT: usuarios de la empresa dueña del almacén donde está la serie
--   + CEO/contralor/auditor (visibilidad transversal para reportes).
-- - INSERT/UPDATE/DELETE: CEO, director, operativo de la empresa del
--   almacén. Mismas reglas que para movimientos de inventario.
-- ============================================================================

-- UNIQUE: una serie no puede repetirse para el mismo producto.
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'productos_serie_producto_numero_unico'
  ) THEN
    ALTER TABLE productos_serie
      ADD CONSTRAINT productos_serie_producto_numero_unico
      UNIQUE (producto_id, numero_serie);
  END IF;
END $$;

-- Índice para búsquedas por número de serie (sin importar producto)
CREATE INDEX IF NOT EXISTS idx_productos_serie_numero
  ON productos_serie(numero_serie);

-- ----------------------------------------------------------------------------
-- Policies
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS productos_serie_select ON productos_serie;
CREATE POLICY productos_serie_select ON productos_serie
  FOR SELECT TO authenticated
  USING (
    usuario_es_ceo()
    OR usuario_tiene_atributo('contralor')
    OR usuario_tiene_atributo('auditor_interno')
    OR EXISTS (
      SELECT 1 FROM almacenes a
      WHERE a.id = productos_serie.almacen_id
        AND a.empresa_id IN (SELECT empresas_del_usuario())
    )
    -- Cuando aún no tiene almacén asignado (recién creado), permitir si
    -- el producto pertenece a una empresa visible.
    OR (
      productos_serie.almacen_id IS NULL
      AND EXISTS (
        SELECT 1 FROM catalogo_productos cp
        WHERE cp.id = productos_serie.producto_id
          AND (cp.empresa_id IS NULL
               OR cp.empresa_id IN (SELECT empresas_del_usuario()))
      )
    )
  );

DROP POLICY IF EXISTS productos_serie_insert ON productos_serie;
CREATE POLICY productos_serie_insert ON productos_serie
  FOR INSERT TO authenticated
  WITH CHECK (
    usuario_es_ceo()
    OR EXISTS (
      SELECT 1 FROM usuarios_empresas ue
      WHERE ue.usuario_id = auth.uid()
        AND ue.rol IN ('director'::rol_usuario, 'operativo'::rol_usuario)
        AND ue.activo = TRUE
    )
  );

DROP POLICY IF EXISTS productos_serie_update ON productos_serie;
CREATE POLICY productos_serie_update ON productos_serie
  FOR UPDATE TO authenticated
  USING (
    usuario_es_ceo()
    OR EXISTS (
      SELECT 1 FROM usuarios_empresas ue
      WHERE ue.usuario_id = auth.uid()
        AND ue.rol IN ('director'::rol_usuario, 'operativo'::rol_usuario)
        AND ue.activo = TRUE
    )
  );

DROP POLICY IF EXISTS productos_serie_delete ON productos_serie;
CREATE POLICY productos_serie_delete ON productos_serie
  FOR DELETE TO authenticated
  USING (usuario_es_ceo());

-- Vista con join enriquecido para la pantalla de listado.
CREATE OR REPLACE VIEW v_productos_serie_lista AS
SELECT
  ps.id,
  ps.numero_serie,
  ps.estado,
  ps.fecha_compra,
  ps.fecha_instalacion,
  ps.garantia_inicio,
  ps.garantia_fin,
  ps.ubicacion_actual,
  ps.observaciones,
  ps.created_at,
  cp.id AS producto_id,
  cp.codigo AS producto_codigo,
  cp.nombre AS producto_nombre,
  cp.marca AS producto_marca,
  cp.modelo AS producto_modelo,
  a.id AS almacen_id,
  a.codigo AS almacen_codigo,
  a.nombre AS almacen_nombre,
  a.empresa_id AS almacen_empresa_id,
  pr.id AS proyecto_id,
  pr.codigo AS proyecto_codigo,
  pr.nombre AS proyecto_nombre,
  cl.id AS cliente_id,
  cl.razon_social AS cliente_razon_social,
  CASE
    WHEN ps.garantia_fin IS NULL THEN 'sin_garantia'
    WHEN ps.garantia_fin < CURRENT_DATE THEN 'vencida'
    WHEN ps.garantia_fin < CURRENT_DATE + INTERVAL '30 days' THEN 'por_vencer'
    ELSE 'vigente'
  END AS estado_garantia,
  CASE
    WHEN ps.garantia_fin IS NULL THEN NULL
    ELSE (ps.garantia_fin - CURRENT_DATE)::INTEGER
  END AS dias_garantia_restantes
FROM productos_serie ps
JOIN catalogo_productos cp ON cp.id = ps.producto_id
LEFT JOIN almacenes a ON a.id = ps.almacen_id
LEFT JOIN proyectos pr ON pr.id = ps.proyecto_id
LEFT JOIN clientes cl ON cl.id = ps.cliente_id
ORDER BY ps.created_at DESC;

COMMENT ON VIEW v_productos_serie_lista IS
  'Productos con número de serie enriquecidos con producto, almacén, '
  'proyecto, cliente y estado de garantía. Para tabla de inventario/series.';
