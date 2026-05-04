-- ============================================================================
-- RLS para Proyectos (Sprint 4 — versión básica para vinculación con OC)
-- ============================================================================
-- Datos por empresa (Patrón 1).
-- SELECT: usuarios con vínculo en la empresa del proyecto.
-- INSERT/UPDATE: CEO/Director/Operativo de esa empresa.
-- Sprint 7 ampliará con etapas, hitos, bitácora, fotos, etc.
-- ============================================================================

ALTER TABLE proyectos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS proyectos_select ON proyectos;
CREATE POLICY proyectos_select ON proyectos
  FOR SELECT
  TO authenticated
  USING (empresa_id IN (SELECT empresas_del_usuario()));

DROP POLICY IF EXISTS proyectos_insert ON proyectos;
CREATE POLICY proyectos_insert ON proyectos
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM usuarios_empresas
      WHERE usuario_id = auth.uid()
        AND empresa_id = proyectos.empresa_id
        AND rol IN ('ceo'::rol_usuario, 'director'::rol_usuario, 'operativo'::rol_usuario)
        AND activo = TRUE
    )
  );

DROP POLICY IF EXISTS proyectos_update ON proyectos;
CREATE POLICY proyectos_update ON proyectos
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM usuarios_empresas
      WHERE usuario_id = auth.uid()
        AND empresa_id = proyectos.empresa_id
        AND rol IN ('ceo'::rol_usuario, 'director'::rol_usuario, 'operativo'::rol_usuario)
        AND activo = TRUE
    )
  );
