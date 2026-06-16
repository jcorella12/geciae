-- ============================================================================
-- Tickets de soporte — RLS faltante + cliente opcional (para tickets de campo)
-- ============================================================================
-- BUG encontrado: tickets_soporte y tickets_comentarios tienen RLS ACTIVADO
-- desde el init pero SIN NINGUNA política. Como el cliente del servidor usa la
-- anon key + sesión (RLS aplica), eso deja la tabla INACCESIBLE para todos los
-- usuarios (SELECT/INSERT/UPDATE denegados). Estas políticas reflejan el gate
-- que ya hacía la app (gateEmpresa: CEO o director/operativo de la empresa).
--
-- Además: cliente_id pasa a OPCIONAL para permitir tickets internos / de campo
-- ligados solo a un proyecto (un incidente en obra no siempre es de un cliente).
-- Es aditivo: el alta de oficina sigue exigiendo cliente a nivel de app.
--
-- Desacoplado del enum de roles (usa helpers), aplica antes o después de
-- ROLES F2.
-- ============================================================================

-- 1. cliente_id opcional (no destructivo: filas existentes ya tienen valor).
ALTER TABLE tickets_soporte ALTER COLUMN cliente_id DROP NOT NULL;

-- 2. RLS tickets_soporte
DROP POLICY IF EXISTS tickets_select ON tickets_soporte;
CREATE POLICY tickets_select ON tickets_soporte FOR SELECT TO authenticated
USING (
  usuario_es_ceo()
  OR empresa_id IN (SELECT empresas_del_usuario())
);

DROP POLICY IF EXISTS tickets_insert ON tickets_soporte;
CREATE POLICY tickets_insert ON tickets_soporte FOR INSERT TO authenticated
WITH CHECK (
  usuario_es_ceo()
  OR usuario_tiene_rol_en_empresa(empresa_id, ARRAY['ceo','director','operativo'])
);

DROP POLICY IF EXISTS tickets_update ON tickets_soporte;
CREATE POLICY tickets_update ON tickets_soporte FOR UPDATE TO authenticated
USING (
  usuario_es_ceo()
  OR usuario_tiene_rol_en_empresa(empresa_id, ARRAY['ceo','director','operativo'])
)
WITH CHECK (
  usuario_es_ceo()
  OR usuario_tiene_rol_en_empresa(empresa_id, ARRAY['ceo','director','operativo'])
);

DROP POLICY IF EXISTS tickets_delete ON tickets_soporte;
CREATE POLICY tickets_delete ON tickets_soporte FOR DELETE TO authenticated
USING (usuario_es_ceo());

-- 3. RLS tickets_comentarios (atado a la empresa del ticket padre)
DROP POLICY IF EXISTS tickets_com_select ON tickets_comentarios;
CREATE POLICY tickets_com_select ON tickets_comentarios FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM tickets_soporte t
    WHERE t.id = tickets_comentarios.ticket_id
      AND (usuario_es_ceo() OR t.empresa_id IN (SELECT empresas_del_usuario()))
  )
);

DROP POLICY IF EXISTS tickets_com_insert ON tickets_comentarios;
CREATE POLICY tickets_com_insert ON tickets_comentarios FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM tickets_soporte t
    WHERE t.id = tickets_comentarios.ticket_id
      AND (usuario_es_ceo()
           OR usuario_tiene_rol_en_empresa(t.empresa_id, ARRAY['ceo','director','operativo']))
  )
);
