-- ============================================================================
-- RLS para Órdenes de Compra (Sprint 4)
-- ============================================================================
-- SELECT: usuario autenticado ve OC de empresas donde tiene vínculo.
-- INSERT: rol ceo/director/operativo en la empresa solicitante.
-- UPDATE: misma regla. La lógica de transiciones de estado se valida en
-- server actions (RLS solo cuida visibilidad y permisos de escritura genéricos).
-- ============================================================================

ALTER TABLE ordenes_compra ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS oc_select ON ordenes_compra;
CREATE POLICY oc_select ON ordenes_compra
  FOR SELECT
  TO authenticated
  USING (empresa_id IN (SELECT empresas_del_usuario()));

DROP POLICY IF EXISTS oc_insert ON ordenes_compra;
CREATE POLICY oc_insert ON ordenes_compra
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM usuarios_empresas
      WHERE usuario_id = auth.uid()
        AND empresa_id = ordenes_compra.empresa_id
        AND rol IN ('ceo'::rol_usuario, 'director'::rol_usuario, 'operativo'::rol_usuario)
        AND activo = TRUE
    )
  );

DROP POLICY IF EXISTS oc_update ON ordenes_compra;
CREATE POLICY oc_update ON ordenes_compra
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM usuarios_empresas
      WHERE usuario_id = auth.uid()
        AND empresa_id = ordenes_compra.empresa_id
        AND rol IN ('ceo'::rol_usuario, 'director'::rol_usuario, 'operativo'::rol_usuario)
        AND activo = TRUE
    )
  );

ALTER TABLE ordenes_compra_conceptos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS oc_conceptos_select ON ordenes_compra_conceptos;
CREATE POLICY oc_conceptos_select ON ordenes_compra_conceptos
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM ordenes_compra oc
      WHERE oc.id = ordenes_compra_conceptos.oc_id
        AND oc.empresa_id IN (SELECT empresas_del_usuario())
    )
  );

DROP POLICY IF EXISTS oc_conceptos_insert ON ordenes_compra_conceptos;
CREATE POLICY oc_conceptos_insert ON ordenes_compra_conceptos
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM ordenes_compra oc
      JOIN usuarios_empresas ue ON ue.empresa_id = oc.empresa_id
      WHERE oc.id = ordenes_compra_conceptos.oc_id
        AND ue.usuario_id = auth.uid()
        AND ue.rol IN ('ceo'::rol_usuario, 'director'::rol_usuario, 'operativo'::rol_usuario)
        AND ue.activo = TRUE
    )
  );

DROP POLICY IF EXISTS oc_conceptos_update ON ordenes_compra_conceptos;
CREATE POLICY oc_conceptos_update ON ordenes_compra_conceptos
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM ordenes_compra oc
      JOIN usuarios_empresas ue ON ue.empresa_id = oc.empresa_id
      WHERE oc.id = ordenes_compra_conceptos.oc_id
        AND ue.usuario_id = auth.uid()
        AND ue.rol IN ('ceo'::rol_usuario, 'director'::rol_usuario, 'operativo'::rol_usuario)
        AND ue.activo = TRUE
    )
  );

DROP POLICY IF EXISTS oc_conceptos_delete ON ordenes_compra_conceptos;
CREATE POLICY oc_conceptos_delete ON ordenes_compra_conceptos
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM ordenes_compra oc
      JOIN usuarios_empresas ue ON ue.empresa_id = oc.empresa_id
      WHERE oc.id = ordenes_compra_conceptos.oc_id
        AND ue.usuario_id = auth.uid()
        AND ue.rol IN ('ceo'::rol_usuario, 'director'::rol_usuario, 'operativo'::rol_usuario)
        AND ue.activo = TRUE
    )
  );
