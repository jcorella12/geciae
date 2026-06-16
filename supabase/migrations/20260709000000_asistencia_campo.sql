-- ============================================================================
-- CAMPO — Asistencia por persona/día capturada por el supervisor de cuadrilla
-- ============================================================================
-- Decisión CEO (2026-06): CAMPO captura ASISTENCIA (quién vino + horas), no
-- "nómina" (la nómina real entra por el importador de CFDI del contador). La
-- asistencia diaria sirve para: (a) base que RH usa para armar/validar nómina,
-- (b) costo real del proyecto (vía v_asistencia_campo_semana, futura conexión
-- al P&L).
--
-- Modelo: 1 fila por (proyecto, fecha, empleado). Captura el supervisor de
-- cuadrilla (atributo supervisor_cuadrilla) o el PM/director/CEO del proyecto.
--
-- Desacoplado del enum de roles (usa literal 'director' + atributo + helpers),
-- así aplica antes O después de la migración ROLES F2 sin depender de los
-- valores nuevos del enum.
-- ============================================================================

CREATE TABLE IF NOT EXISTS asistencia_campo (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE RESTRICT,
  proyecto_id UUID NOT NULL REFERENCES proyectos(id) ON DELETE CASCADE,
  empleado_id UUID NOT NULL REFERENCES empleados(id) ON DELETE CASCADE,

  fecha DATE NOT NULL,
  presente BOOLEAN NOT NULL DEFAULT TRUE,
  horas NUMERIC(4,1) CHECK (horas >= 0 AND horas <= 24),

  registrado_por UUID NOT NULL REFERENCES auth.users(id),
  observaciones TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (proyecto_id, fecha, empleado_id)
);

CREATE INDEX IF NOT EXISTS idx_asistencia_campo_proy_fecha
  ON asistencia_campo(proyecto_id, fecha DESC);
CREATE INDEX IF NOT EXISTS idx_asistencia_campo_empleado
  ON asistencia_campo(empleado_id, fecha DESC);

DROP TRIGGER IF EXISTS set_updated_at_asistencia_campo ON asistencia_campo;
CREATE TRIGGER set_updated_at_asistencia_campo BEFORE UPDATE ON asistencia_campo
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ----------------------------------------------------------------------------
-- Helper de autorización de captura. SECURITY DEFINER (como usuario_es_ceo).
-- Puede capturar: CEO/directivo, el PM del proyecto, o quien en la empresa del
-- proyecto sea director o tenga el atributo supervisor_cuadrilla.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.puede_capturar_asistencia_campo(p_proyecto_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM proyectos p
    WHERE p.id = p_proyecto_id
      AND (
        usuario_es_ceo()
        OR p.pm_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM usuarios_empresas ue
          WHERE ue.usuario_id = auth.uid()
            AND ue.empresa_id = p.empresa_id
            AND ue.activo = TRUE
            AND (ue.rol = 'director'::rol_usuario
                 OR 'supervisor_cuadrilla' = ANY(ue.atributos))
        )
      )
  );
$$;

-- ----------------------------------------------------------------------------
-- RLS
-- ----------------------------------------------------------------------------
ALTER TABLE asistencia_campo ENABLE ROW LEVEL SECURITY;

-- SELECT: el propio empleado ve la suya; quien la registró; quien puede
-- capturar; o cualquier miembro/PM de la empresa del proyecto.
DROP POLICY IF EXISTS asistencia_campo_select ON asistencia_campo;
CREATE POLICY asistencia_campo_select ON asistencia_campo FOR SELECT TO authenticated
USING (
  registrado_por = auth.uid()
  OR EXISTS (SELECT 1 FROM empleados e
             WHERE e.id = asistencia_campo.empleado_id AND e.usuario_id = auth.uid())
  OR usuario_es_ceo()
  OR puede_capturar_asistencia_campo(proyecto_id)
  OR EXISTS (SELECT 1 FROM proyectos p
             WHERE p.id = asistencia_campo.proyecto_id
               AND (p.pm_id = auth.uid() OR p.empresa_id IN (SELECT empresas_del_usuario())))
);

-- INSERT: solo quien puede capturar; empresa_id y empleado deben ser coherentes
-- con el proyecto.
DROP POLICY IF EXISTS asistencia_campo_insert ON asistencia_campo;
CREATE POLICY asistencia_campo_insert ON asistencia_campo FOR INSERT TO authenticated
WITH CHECK (
  registrado_por = auth.uid()
  AND puede_capturar_asistencia_campo(proyecto_id)
  AND EXISTS (SELECT 1 FROM proyectos p
              WHERE p.id = asistencia_campo.proyecto_id
                AND p.empresa_id = asistencia_campo.empresa_id)
  AND EXISTS (SELECT 1 FROM empleados e
              WHERE e.id = asistencia_campo.empleado_id
                AND e.empresa_id = asistencia_campo.empresa_id)
);

-- UPDATE: quien la registró o quien puede capturar en ese proyecto.
DROP POLICY IF EXISTS asistencia_campo_update ON asistencia_campo;
CREATE POLICY asistencia_campo_update ON asistencia_campo FOR UPDATE TO authenticated
USING (registrado_por = auth.uid() OR puede_capturar_asistencia_campo(proyecto_id))
WITH CHECK (registrado_por = auth.uid() OR puede_capturar_asistencia_campo(proyecto_id));

-- DELETE: quien la registró, PM o CEO.
DROP POLICY IF EXISTS asistencia_campo_delete ON asistencia_campo;
CREATE POLICY asistencia_campo_delete ON asistencia_campo FOR DELETE TO authenticated
USING (registrado_por = auth.uid() OR puede_capturar_asistencia_campo(proyecto_id));

-- ----------------------------------------------------------------------------
-- Vista de agregación semanal (lunes ISO). Base para RH (días/horas por
-- empleado) y futura conexión al costo de proyecto (P&L).
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW v_asistencia_campo_semana AS
SELECT
  ac.empresa_id,
  ac.proyecto_id,
  ac.empleado_id,
  (date_trunc('week', ac.fecha))::date AS semana_inicio,
  count(*) FILTER (WHERE ac.presente)            AS dias_presente,
  COALESCE(SUM(ac.horas) FILTER (WHERE ac.presente), 0) AS horas_total
FROM asistencia_campo ac
GROUP BY ac.empresa_id, ac.proyecto_id, ac.empleado_id, date_trunc('week', ac.fecha);

COMMENT ON VIEW v_asistencia_campo_semana IS
  'Asistencia de campo agregada por proyecto/empleado/semana (lunes ISO): días presentes y horas. Insumo para nómina (RH) y costo real de proyecto.';
