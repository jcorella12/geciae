-- ============================================================================
-- RLS para catálogo de Proveedores y tablas relacionadas (Sprint 2)
-- ============================================================================
-- Patrón 2: Datos transversales — visibles a todos los autenticados con vínculo.
-- Write requiere rol ceo/director/operativo. Sprint 4 agregará reglas finas
-- (bloqueo cuando semaforo='rojo' o 'negro' en INSERT de OC).
-- ============================================================================

-- Helper genérico: usuario activo en cualquier empresa.
-- (Si ya existe en alguna migración previa lo redefine; idempotente.)
CREATE OR REPLACE FUNCTION usuario_activo_grupo()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM usuarios_empresas
    WHERE usuario_id = auth.uid() AND activo = TRUE
  );
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION usuario_puede_gestionar_catalogos()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM usuarios_empresas
    WHERE usuario_id = auth.uid()
      AND rol IN ('ceo'::rol_usuario, 'director'::rol_usuario, 'operativo'::rol_usuario)
      AND activo = TRUE
  );
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- ---------- proveedores ----------
ALTER TABLE proveedores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS proveedores_select ON proveedores;
CREATE POLICY proveedores_select ON proveedores
  FOR SELECT TO authenticated USING (usuario_activo_grupo());

DROP POLICY IF EXISTS proveedores_insert ON proveedores;
CREATE POLICY proveedores_insert ON proveedores
  FOR INSERT TO authenticated WITH CHECK (usuario_puede_gestionar_catalogos());

DROP POLICY IF EXISTS proveedores_update ON proveedores;
CREATE POLICY proveedores_update ON proveedores
  FOR UPDATE TO authenticated USING (usuario_puede_gestionar_catalogos());

-- ---------- contactos_proveedor ----------
ALTER TABLE contactos_proveedor ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS contactos_proveedor_select ON contactos_proveedor;
CREATE POLICY contactos_proveedor_select ON contactos_proveedor
  FOR SELECT TO authenticated USING (usuario_activo_grupo());

DROP POLICY IF EXISTS contactos_proveedor_insert ON contactos_proveedor;
CREATE POLICY contactos_proveedor_insert ON contactos_proveedor
  FOR INSERT TO authenticated WITH CHECK (usuario_puede_gestionar_catalogos());

DROP POLICY IF EXISTS contactos_proveedor_update ON contactos_proveedor;
CREATE POLICY contactos_proveedor_update ON contactos_proveedor
  FOR UPDATE TO authenticated USING (usuario_puede_gestionar_catalogos());

-- ---------- proveedores_empresas ----------
ALTER TABLE proveedores_empresas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS proveedores_empresas_select ON proveedores_empresas;
CREATE POLICY proveedores_empresas_select ON proveedores_empresas
  FOR SELECT TO authenticated USING (usuario_activo_grupo());

DROP POLICY IF EXISTS proveedores_empresas_insert ON proveedores_empresas;
CREATE POLICY proveedores_empresas_insert ON proveedores_empresas
  FOR INSERT TO authenticated WITH CHECK (usuario_puede_gestionar_catalogos());

DROP POLICY IF EXISTS proveedores_empresas_update ON proveedores_empresas;
CREATE POLICY proveedores_empresas_update ON proveedores_empresas
  FOR UPDATE TO authenticated USING (usuario_puede_gestionar_catalogos());

-- ---------- proveedores_documentacion ----------
ALTER TABLE proveedores_documentacion ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS prov_doc_select ON proveedores_documentacion;
CREATE POLICY prov_doc_select ON proveedores_documentacion
  FOR SELECT TO authenticated USING (usuario_activo_grupo());

DROP POLICY IF EXISTS prov_doc_insert ON proveedores_documentacion;
CREATE POLICY prov_doc_insert ON proveedores_documentacion
  FOR INSERT TO authenticated WITH CHECK (usuario_puede_gestionar_catalogos());

DROP POLICY IF EXISTS prov_doc_update ON proveedores_documentacion;
CREATE POLICY prov_doc_update ON proveedores_documentacion
  FOR UPDATE TO authenticated USING (usuario_puede_gestionar_catalogos());

-- ---------- proveedores_evaluaciones ----------
ALTER TABLE proveedores_evaluaciones ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS prov_eval_select ON proveedores_evaluaciones;
CREATE POLICY prov_eval_select ON proveedores_evaluaciones
  FOR SELECT TO authenticated USING (usuario_activo_grupo());

DROP POLICY IF EXISTS prov_eval_insert ON proveedores_evaluaciones;
CREATE POLICY prov_eval_insert ON proveedores_evaluaciones
  FOR INSERT TO authenticated WITH CHECK (usuario_puede_gestionar_catalogos());

-- ---------- proveedores_personal_repse ----------
ALTER TABLE proveedores_personal_repse ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS prov_repse_select ON proveedores_personal_repse;
CREATE POLICY prov_repse_select ON proveedores_personal_repse
  FOR SELECT TO authenticated USING (usuario_activo_grupo());

DROP POLICY IF EXISTS prov_repse_insert ON proveedores_personal_repse;
CREATE POLICY prov_repse_insert ON proveedores_personal_repse
  FOR INSERT TO authenticated WITH CHECK (usuario_puede_gestionar_catalogos());

DROP POLICY IF EXISTS prov_repse_update ON proveedores_personal_repse;
CREATE POLICY prov_repse_update ON proveedores_personal_repse
  FOR UPDATE TO authenticated USING (usuario_puede_gestionar_catalogos());
