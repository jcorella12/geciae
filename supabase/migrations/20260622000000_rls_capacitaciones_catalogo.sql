-- Capacitaciones: crea tablas + tipo enum si faltan, activa RLS y define
-- todas las policies (catálogo + asignaciones).
--
-- Por qué este migration es defensivo (IF NOT EXISTS):
--   - El init.sql declara `capacitaciones` y `empleados_capacitaciones` pero
--     en algunas DBs de Supabase nunca llegaron a aplicarse, dejando RLS
--     enabled sin tablas. El error reportado fue:
--       "relation \"capacitaciones\" does not exist"
--     al intentar darlas de alta desde la UI.
--   - Idempotente: se puede correr varias veces sin romper nada.
--
-- Reglas RLS (alineadas con `lib/auth/permisos.ts`):
--   capacitaciones (catálogo global):
--     - SELECT: cualquier autenticado
--     - INSERT/UPDATE/DELETE: CEO, atributo `rh`, o director
--   empleados_capacitaciones (asignaciones):
--     - SELECT: el propio empleado, CEO, o gente de la misma empresa
--     - INSERT/UPDATE/DELETE: CEO, `rh`, o director de la empresa del empleado

-- ----------------------------------------------------------------------------
-- Tipo enum
-- ----------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'estado_capacitacion') THEN
    CREATE TYPE estado_capacitacion AS ENUM (
      'inscrito',
      'en_proceso',
      'completado',
      'reprobado',
      'no_asistio'
    );
  END IF;
END$$;

-- ----------------------------------------------------------------------------
-- Tablas
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS capacitaciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo TEXT UNIQUE NOT NULL,
  nombre TEXT NOT NULL,
  descripcion TEXT,
  modalidad TEXT,
  duracion_horas NUMERIC(5,1),
  instructor_id UUID REFERENCES auth.users(id),
  instructor_externo TEXT,
  costo NUMERIC(10,2),
  genera_dc3 BOOLEAN DEFAULT FALSE,
  vigencia_constancia_meses INTEGER,
  obligatorio_para_puestos TEXT[],
  catalogo_publico BOOLEAN DEFAULT FALSE,
  activo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS empleados_capacitaciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empleado_id UUID NOT NULL REFERENCES empleados(id) ON DELETE CASCADE,
  capacitacion_id UUID NOT NULL REFERENCES capacitaciones(id),
  fecha_programada DATE,
  fecha_inicio DATE,
  fecha_fin DATE,
  estado estado_capacitacion DEFAULT 'inscrito',
  calificacion_pre NUMERIC(5,2),
  calificacion_post NUMERIC(5,2),
  fecha_evaluacion_eficacia DATE,
  resultado_eficacia TEXT,
  url_constancia TEXT,
  fecha_vencimiento DATE,
  factura_url TEXT,
  costo_prorrateado NUMERIC(10,2),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE empleados_capacitaciones
  ADD COLUMN IF NOT EXISTS factura_url TEXT,
  ADD COLUMN IF NOT EXISTS costo_prorrateado NUMERIC(10,2);

-- ----------------------------------------------------------------------------
-- RLS
-- ----------------------------------------------------------------------------
ALTER TABLE capacitaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE empleados_capacitaciones ENABLE ROW LEVEL SECURITY;

-- Policies del catálogo
DROP POLICY IF EXISTS capacitaciones_select ON capacitaciones;
CREATE POLICY capacitaciones_select ON capacitaciones
  FOR SELECT TO authenticated USING (TRUE);

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

-- Policies de asignaciones
DROP POLICY IF EXISTS empcaps_select ON empleados_capacitaciones;
CREATE POLICY empcaps_select ON empleados_capacitaciones
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM empleados e
      WHERE e.id = empleados_capacitaciones.empleado_id
        AND (
          e.usuario_id = auth.uid()
          OR usuario_es_ceo()
          OR e.empresa_id IN (SELECT empresas_del_usuario())
        )
    )
  );

DROP POLICY IF EXISTS empcaps_modify ON empleados_capacitaciones;
CREATE POLICY empcaps_modify ON empleados_capacitaciones
  FOR ALL TO authenticated
  USING (
    usuario_es_ceo()
    OR usuario_tiene_atributo('rh')
    OR EXISTS (
      SELECT 1 FROM empleados e
      JOIN usuarios_empresas ue ON ue.empresa_id = e.empresa_id
      WHERE e.id = empleados_capacitaciones.empleado_id
        AND ue.usuario_id = auth.uid()
        AND ue.rol = 'director'::rol_usuario
        AND ue.activo = TRUE
    )
  );
