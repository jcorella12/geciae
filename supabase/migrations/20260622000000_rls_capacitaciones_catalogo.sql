-- RLS policies para el catálogo `capacitaciones`.
-- El init habilitó RLS pero nunca creó policies, así que con RLS activa
-- todo INSERT/SELECT/UPDATE/DELETE quedaba denegado para usuarios normales.
-- Eso impedía dar de alta cursos desde la UI (error
--   "new row violates row-level security policy for table capacitaciones").
--
-- Reglas (alineadas con `puedeGestionarCatalogoCapacitaciones` en
-- `lib/auth/permisos.ts`):
--   - SELECT: cualquier usuario autenticado puede leer el catálogo.
--   - INSERT/UPDATE/DELETE: CEO, atributo `rh`, o cualquier director.
-- El catálogo es global (no por empresa) — todos los empleados de
-- cualquier empresa del grupo pueden ser asignados al mismo curso, por
-- eso no filtramos por empresa.

DROP POLICY IF EXISTS capacitaciones_select ON capacitaciones;
CREATE POLICY capacitaciones_select ON capacitaciones
  FOR SELECT TO authenticated
  USING (TRUE);

DROP POLICY IF EXISTS capacitaciones_insert ON capacitaciones;
CREATE POLICY capacitaciones_insert ON capacitaciones
  FOR INSERT TO authenticated
  WITH CHECK (
    usuario_es_ceo()
    OR usuario_tiene_atributo('rh')
    OR EXISTS (
      SELECT 1 FROM usuarios_empresas
      WHERE usuario_id = auth.uid()
        AND rol = 'director'::rol_usuario
        AND activo = TRUE
    )
  );

DROP POLICY IF EXISTS capacitaciones_update ON capacitaciones;
CREATE POLICY capacitaciones_update ON capacitaciones
  FOR UPDATE TO authenticated
  USING (
    usuario_es_ceo()
    OR usuario_tiene_atributo('rh')
    OR EXISTS (
      SELECT 1 FROM usuarios_empresas
      WHERE usuario_id = auth.uid()
        AND rol = 'director'::rol_usuario
        AND activo = TRUE
    )
  );

DROP POLICY IF EXISTS capacitaciones_delete ON capacitaciones;
CREATE POLICY capacitaciones_delete ON capacitaciones
  FOR DELETE TO authenticated
  USING (
    usuario_es_ceo()
    OR usuario_tiene_atributo('rh')
    OR EXISTS (
      SELECT 1 FROM usuarios_empresas
      WHERE usuario_id = auth.uid()
        AND rol = 'director'::rol_usuario
        AND activo = TRUE
    )
  );
