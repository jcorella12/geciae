-- ============================================================================
-- Extender RLS de nómina: permitir acceso a CEO, RH, contralor, tesorero,
-- auditor, director Y jefe directo del empleado.
-- ============================================================================
-- Antes: empleado dueño + CEO + director de la empresa.
-- Ahora se agrega: atributos rh, contralor, tesorero_corporativo,
-- auditor_interno, y jefe directo (jefe_directo_id).
-- ============================================================================

-- Helper: ¿el usuario actual es jefe directo del empleado?
CREATE OR REPLACE FUNCTION es_jefe_directo_de(p_empleado_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE AS $$
  SELECT EXISTS (
    SELECT 1
    FROM empleados subordinado
    JOIN empleados jefe ON jefe.id = subordinado.jefe_directo_id
    WHERE subordinado.id = p_empleado_id
      AND jefe.usuario_id = auth.uid()
  );
$$;

-- Helper: ¿el usuario actual tiene visibilidad a nómina del empleado?
CREATE OR REPLACE FUNCTION puede_ver_nomina_de(p_empleado_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE AS $$
  SELECT
    -- CEO: siempre
    usuario_es_ceo()
    -- Atributos transversales
    OR usuario_tiene_atributo('rh')
    OR usuario_tiene_atributo('contralor')
    OR usuario_tiene_atributo('tesorero_corporativo')
    OR usuario_tiene_atributo('auditor_interno')
    -- Empleado dueño
    OR EXISTS (
      SELECT 1 FROM empleados e
      WHERE e.id = p_empleado_id AND e.usuario_id = auth.uid()
    )
    -- Director de la empresa del empleado
    OR EXISTS (
      SELECT 1 FROM empleados e
      WHERE e.id = p_empleado_id
        AND usuario_tiene_rol_en_empresa(e.empresa_id, ARRAY['director'])
    )
    -- Jefe directo del empleado
    OR es_jefe_directo_de(p_empleado_id);
$$;

-- ============================================================================
-- nomina_recibos: ampliar policies SELECT/INSERT/UPDATE
-- ============================================================================

DROP POLICY IF EXISTS nr_select ON nomina_recibos;
CREATE POLICY nr_select ON nomina_recibos FOR SELECT TO authenticated
  USING (puede_ver_nomina_de(empleado_id));

DROP POLICY IF EXISTS nr_insert ON nomina_recibos;
CREATE POLICY nr_insert ON nomina_recibos FOR INSERT TO authenticated
  WITH CHECK (
    usuario_es_ceo()
    OR usuario_tiene_atributo('rh')
    OR usuario_tiene_atributo('contralor')
    OR usuario_tiene_rol_en_empresa(empresa_id, ARRAY['director'])
  );

DROP POLICY IF EXISTS nr_update ON nomina_recibos;
CREATE POLICY nr_update ON nomina_recibos FOR UPDATE TO authenticated
  USING (
    usuario_es_ceo()
    OR usuario_tiene_atributo('rh')
    OR usuario_tiene_atributo('contralor')
    OR usuario_tiene_rol_en_empresa(empresa_id, ARRAY['director'])
  );

-- ============================================================================
-- nomina_conceptos: cascada del recibo
-- ============================================================================

DROP POLICY IF EXISTS nc_select ON nomina_conceptos;
CREATE POLICY nc_select ON nomina_conceptos FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM nomina_recibos nr
    WHERE nr.id = nomina_conceptos.recibo_id
      AND puede_ver_nomina_de(nr.empleado_id)
  ));

DROP POLICY IF EXISTS nc_insert ON nomina_conceptos;
CREATE POLICY nc_insert ON nomina_conceptos FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM nomina_recibos nr
    WHERE nr.id = nomina_conceptos.recibo_id
      AND (
        usuario_es_ceo()
        OR usuario_tiene_atributo('rh')
        OR usuario_tiene_atributo('contralor')
        OR usuario_tiene_rol_en_empresa(nr.empresa_id, ARRAY['director'])
      )
  ));

-- ============================================================================
-- empleado_bonos_manuales: visibilidad y modificación
-- ============================================================================

DROP POLICY IF EXISTS ebm_select ON empleado_bonos_manuales;
CREATE POLICY ebm_select ON empleado_bonos_manuales FOR SELECT TO authenticated
  USING (puede_ver_nomina_de(empleado_id));

DROP POLICY IF EXISTS ebm_modify ON empleado_bonos_manuales;
CREATE POLICY ebm_modify ON empleado_bonos_manuales FOR ALL TO authenticated
  USING (
    usuario_es_ceo()
    OR usuario_tiene_atributo('rh')
    OR usuario_tiene_atributo('contralor')
    OR usuario_tiene_rol_en_empresa(empresa_id, ARRAY['director'])
  );

-- ============================================================================
-- nomina_uploads: ampliar select para auditores/RH
-- ============================================================================

DROP POLICY IF EXISTS nu_select ON nomina_uploads;
CREATE POLICY nu_select ON nomina_uploads FOR SELECT TO authenticated
  USING (
    usuario_es_ceo()
    OR usuario_tiene_atributo('rh')
    OR usuario_tiene_atributo('contralor')
    OR usuario_tiene_atributo('auditor_interno')
    OR usuario_tiene_rol_en_empresa(empresa_id, ARRAY['director'])
  );

DROP POLICY IF EXISTS nu_update ON nomina_uploads;
CREATE POLICY nu_update ON nomina_uploads FOR UPDATE TO authenticated
  USING (
    usuario_es_ceo()
    OR usuario_tiene_atributo('rh')
    OR usuario_tiene_atributo('contralor')
    OR usuario_tiene_rol_en_empresa(empresa_id, ARRAY['director'])
  );

-- ============================================================================
-- nomina_accesos_log: auditoría incluye RH/contralor
-- ============================================================================

DROP POLICY IF EXISTS nal_select ON nomina_accesos_log;
CREATE POLICY nal_select ON nomina_accesos_log FOR SELECT TO authenticated
  USING (
    usuario_es_ceo()
    OR usuario_tiene_atributo('rh')
    OR usuario_tiene_atributo('contralor')
    OR usuario_tiene_atributo('auditor_interno')
    OR EXISTS (
      SELECT 1 FROM empleados e
      WHERE e.id = nomina_accesos_log.empleado_consultado_id
        AND usuario_tiene_rol_en_empresa(e.empresa_id, ARRAY['director'])
    )
  );

-- ============================================================================
-- Storage bucket nomina-xmls: extender el SELECT
-- ============================================================================

DROP POLICY IF EXISTS "Empleado descarga su xml" ON storage.objects;
CREATE POLICY "Acceso lectura nomina-xmls" ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'nomina-xmls'
    AND (
      usuario_es_ceo()
      OR usuario_tiene_atributo('rh')
      OR usuario_tiene_atributo('contralor')
      OR usuario_tiene_atributo('tesorero_corporativo')
      OR usuario_tiene_atributo('auditor_interno')
      OR EXISTS (
        SELECT 1 FROM nomina_recibos nr
        JOIN empleados e ON e.id = nr.empleado_id
        WHERE (nr.url_xml = name OR nr.url_pdf = name)
          AND (
            e.usuario_id = auth.uid()
            OR es_jefe_directo_de(e.id)
            OR usuario_tiene_rol_en_empresa(nr.empresa_id, ARRAY['director'])
          )
      )
    )
  );

DROP POLICY IF EXISTS "Director sube xml nomina" ON storage.objects;
CREATE POLICY "Director sube xml nomina" ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'nomina-xmls'
    AND (
      usuario_es_ceo()
      OR usuario_tiene_atributo('rh')
      OR usuario_tiene_atributo('contralor')
      OR EXISTS (
        SELECT 1 FROM usuarios_empresas
        WHERE usuario_id = auth.uid()
          AND rol = 'director'::rol_usuario
          AND activo = TRUE
      )
    )
  );
