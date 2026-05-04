-- ============================================================================
-- RLS para catálogo de Clientes (Sprint 2)
-- ============================================================================
-- Patrón: Datos transversales (Patrón 2 del spec multi-tenancy.md).
-- Cualquier usuario autenticado con un vínculo activo en cualquier empresa
-- del grupo puede VER clientes (catálogo es transversal).
-- INSERT y UPDATE requieren rol ceo/director/operativo (cualquier persona
-- comercial/operativa puede dar de alta o actualizar clientes).
-- DELETE no se permite — soft-delete via UPDATE activo=false.
-- ============================================================================

-- ---------- clientes ----------
DROP POLICY IF EXISTS clientes_select ON clientes;
CREATE POLICY clientes_select ON clientes
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM usuarios_empresas
      WHERE usuario_id = auth.uid() AND activo = TRUE
    )
  );

DROP POLICY IF EXISTS clientes_insert ON clientes;
CREATE POLICY clientes_insert ON clientes
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM usuarios_empresas
      WHERE usuario_id = auth.uid()
        AND rol IN ('ceo'::rol_usuario, 'director'::rol_usuario, 'operativo'::rol_usuario)
        AND activo = TRUE
    )
  );

DROP POLICY IF EXISTS clientes_update ON clientes;
CREATE POLICY clientes_update ON clientes
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM usuarios_empresas
      WHERE usuario_id = auth.uid()
        AND rol IN ('ceo'::rol_usuario, 'director'::rol_usuario, 'operativo'::rol_usuario)
        AND activo = TRUE
    )
  );

-- ---------- contactos_cliente ----------
ALTER TABLE contactos_cliente ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS contactos_cliente_select ON contactos_cliente;
CREATE POLICY contactos_cliente_select ON contactos_cliente
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM usuarios_empresas
      WHERE usuario_id = auth.uid() AND activo = TRUE
    )
  );

DROP POLICY IF EXISTS contactos_cliente_insert ON contactos_cliente;
CREATE POLICY contactos_cliente_insert ON contactos_cliente
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM usuarios_empresas
      WHERE usuario_id = auth.uid()
        AND rol IN ('ceo'::rol_usuario, 'director'::rol_usuario, 'operativo'::rol_usuario)
        AND activo = TRUE
    )
  );

DROP POLICY IF EXISTS contactos_cliente_update ON contactos_cliente;
CREATE POLICY contactos_cliente_update ON contactos_cliente
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM usuarios_empresas
      WHERE usuario_id = auth.uid()
        AND rol IN ('ceo'::rol_usuario, 'director'::rol_usuario, 'operativo'::rol_usuario)
        AND activo = TRUE
    )
  );

-- ---------- clientes_empresas ----------
ALTER TABLE clientes_empresas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS clientes_empresas_select ON clientes_empresas;
CREATE POLICY clientes_empresas_select ON clientes_empresas
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM usuarios_empresas
      WHERE usuario_id = auth.uid() AND activo = TRUE
    )
  );

DROP POLICY IF EXISTS clientes_empresas_insert ON clientes_empresas;
CREATE POLICY clientes_empresas_insert ON clientes_empresas
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM usuarios_empresas
      WHERE usuario_id = auth.uid()
        AND rol IN ('ceo'::rol_usuario, 'director'::rol_usuario, 'operativo'::rol_usuario)
        AND activo = TRUE
    )
  );

DROP POLICY IF EXISTS clientes_empresas_update ON clientes_empresas;
CREATE POLICY clientes_empresas_update ON clientes_empresas
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM usuarios_empresas
      WHERE usuario_id = auth.uid()
        AND rol IN ('ceo'::rol_usuario, 'director'::rol_usuario, 'operativo'::rol_usuario)
        AND activo = TRUE
    )
  );
