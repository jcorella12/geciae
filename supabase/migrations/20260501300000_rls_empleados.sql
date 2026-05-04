-- ============================================================================
-- RLS para catálogo de Empleados (Sprint 2)
-- ============================================================================
-- Patrón 1: Datos por empresa.
--   SELECT: usuario ve empleados de empresas donde tiene vínculo activo.
--   INSERT/UPDATE: CEO/Director en la empresa específica del empleado.
-- Tabla `contratos_laborales` ligada al empleado hereda visibilidad.
-- ============================================================================

ALTER TABLE empleados ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS empleados_select ON empleados;
CREATE POLICY empleados_select ON empleados
  FOR SELECT
  TO authenticated
  USING (empresa_id IN (SELECT empresas_del_usuario()));

DROP POLICY IF EXISTS empleados_insert ON empleados;
CREATE POLICY empleados_insert ON empleados
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM usuarios_empresas
      WHERE usuario_id = auth.uid()
        AND empresa_id = empleados.empresa_id
        AND rol IN ('ceo'::rol_usuario, 'director'::rol_usuario)
        AND activo = TRUE
    )
  );

DROP POLICY IF EXISTS empleados_update ON empleados;
CREATE POLICY empleados_update ON empleados
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM usuarios_empresas
      WHERE usuario_id = auth.uid()
        AND empresa_id = empleados.empresa_id
        AND rol IN ('ceo'::rol_usuario, 'director'::rol_usuario)
        AND activo = TRUE
    )
  );

-- contratos_laborales heredan acceso del empleado
ALTER TABLE contratos_laborales ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS contratos_laborales_select ON contratos_laborales;
CREATE POLICY contratos_laborales_select ON contratos_laborales
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM empleados e
      WHERE e.id = contratos_laborales.empleado_id
        AND e.empresa_id IN (SELECT empresas_del_usuario())
    )
  );
