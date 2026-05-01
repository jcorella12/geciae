-- ============================================================================
-- Políticas RLS base para tablas raíz de multi-tenancy
-- ============================================================================
-- La migración inicial habilita RLS en empresas/unidades_negocio/usuarios_empresas
-- pero deja las policies para "migraciones específicas". Esta es esa migración:
-- las 3 policies SELECT mínimas para que el usuario autenticado pueda leer sus
-- propios vínculos y las empresas/unidades a las que pertenece.
--
-- INSERT/UPDATE/DELETE de estas tablas se hace por admin (service_role) en
-- Sprint 1B (panel de configuración) — no necesitan policy aún.
-- ============================================================================

-- usuarios_empresas: el usuario autenticado ve sus propios vínculos.
DROP POLICY IF EXISTS usuarios_empresas_select_own ON usuarios_empresas;
CREATE POLICY usuarios_empresas_select_own ON usuarios_empresas
  FOR SELECT
  TO authenticated
  USING (usuario_id = auth.uid());

-- empresas: el usuario ve las empresas donde tiene un vínculo activo.
-- empresas_del_usuario() es SECURITY DEFINER → bypassea RLS internamente, sin recursión.
DROP POLICY IF EXISTS empresas_select_pertenecidas ON empresas;
CREATE POLICY empresas_select_pertenecidas ON empresas
  FOR SELECT
  TO authenticated
  USING (id IN (SELECT empresas_del_usuario()));

-- unidades_negocio: el usuario ve las unidades de las empresas a las que pertenece.
DROP POLICY IF EXISTS unidades_negocio_select ON unidades_negocio;
CREATE POLICY unidades_negocio_select ON unidades_negocio
  FOR SELECT
  TO authenticated
  USING (empresa_id IN (SELECT empresas_del_usuario()));
