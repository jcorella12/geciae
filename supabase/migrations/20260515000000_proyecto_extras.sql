-- Sprint cierre Proyectos: bitácora + documentos + equipo del proyecto.

-- ============================================================================
-- 1. Bitácora del proyecto (eventos cronológicos)
-- ============================================================================

CREATE TYPE tipo_evento_bitacora AS ENUM (
  'avance',
  'problema',
  'decision',
  'visita',
  'foto',
  'hito_alcanzado',
  'cambio_alcance',
  'reunion',
  'nota'
);

CREATE TABLE IF NOT EXISTS proyecto_bitacora (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proyecto_id UUID NOT NULL REFERENCES proyectos(id) ON DELETE CASCADE,
  fecha TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  tipo tipo_evento_bitacora NOT NULL DEFAULT 'nota',
  titulo TEXT,
  descripcion TEXT NOT NULL,
  -- referencias opcionales
  tarea_id UUID REFERENCES proyecto_tareas(id) ON DELETE SET NULL,
  -- adjuntos: array de paths en storage bucket 'proyecto-archivos'
  adjuntos JSONB DEFAULT '[]'::jsonb,
  -- importancia y visibilidad
  es_critica BOOLEAN DEFAULT FALSE,
  visible_cliente BOOLEAN DEFAULT FALSE,
  capturado_por UUID REFERENCES auth.users(id),
  capturado_por_nombre TEXT, -- snapshot del nombre por si se elimina el usuario
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pb_proyecto
  ON proyecto_bitacora(proyecto_id, fecha DESC);

-- RLS
ALTER TABLE proyecto_bitacora ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS pb_select ON proyecto_bitacora;
CREATE POLICY pb_select ON proyecto_bitacora
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM proyectos p
      WHERE p.id = proyecto_bitacora.proyecto_id
        AND (
          p.empresa_id IN (SELECT empresas_del_usuario())
          OR usuario_es_ceo()
          OR p.pm_id = auth.uid()
          OR p.vendedor_id = auth.uid()
        )
    )
  );

DROP POLICY IF EXISTS pb_modify ON proyecto_bitacora;
CREATE POLICY pb_modify ON proyecto_bitacora
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM proyectos p
      WHERE p.id = proyecto_bitacora.proyecto_id
        AND (
          usuario_es_ceo()
          OR p.pm_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM usuarios_empresas
            WHERE usuario_id = auth.uid()
              AND empresa_id = p.empresa_id
              AND rol IN ('director'::rol_usuario, 'operativo'::rol_usuario)
              AND activo = TRUE
          )
        )
    )
  );

-- ============================================================================
-- 2. Documentos del proyecto (Storage)
-- ============================================================================

CREATE TYPE categoria_documento_proyecto AS ENUM (
  'contrato',
  'plano',
  'especificacion',
  'diseno',
  'cotizacion',
  'foto',
  'manual',
  'permiso',
  'acta',
  'otro'
);

CREATE TABLE IF NOT EXISTS proyecto_documentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proyecto_id UUID NOT NULL REFERENCES proyectos(id) ON DELETE CASCADE,
  categoria categoria_documento_proyecto NOT NULL DEFAULT 'otro',
  nombre TEXT NOT NULL,
  descripcion TEXT,
  storage_path TEXT NOT NULL, -- path dentro del bucket 'proyecto-archivos'
  mime_type TEXT,
  tamano_bytes BIGINT,
  version INTEGER DEFAULT 1,
  visible_cliente BOOLEAN DEFAULT FALSE,
  -- vinculaciones opcionales
  tarea_id UUID REFERENCES proyecto_tareas(id) ON DELETE SET NULL,
  subido_por UUID REFERENCES auth.users(id),
  subido_por_nombre TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pd_proyecto
  ON proyecto_documentos(proyecto_id, categoria);

ALTER TABLE proyecto_documentos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS pd_select ON proyecto_documentos;
CREATE POLICY pd_select ON proyecto_documentos
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM proyectos p
      WHERE p.id = proyecto_documentos.proyecto_id
        AND (
          p.empresa_id IN (SELECT empresas_del_usuario())
          OR usuario_es_ceo()
          OR p.pm_id = auth.uid()
          OR p.vendedor_id = auth.uid()
        )
    )
  );

DROP POLICY IF EXISTS pd_modify ON proyecto_documentos;
CREATE POLICY pd_modify ON proyecto_documentos
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM proyectos p
      WHERE p.id = proyecto_documentos.proyecto_id
        AND (
          usuario_es_ceo()
          OR p.pm_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM usuarios_empresas
            WHERE usuario_id = auth.uid()
              AND empresa_id = p.empresa_id
              AND rol IN ('director'::rol_usuario, 'operativo'::rol_usuario)
              AND activo = TRUE
          )
        )
    )
  );

-- Bucket de Storage para archivos de proyecto
INSERT INTO storage.buckets (id, name, public)
VALUES ('proyecto-archivos', 'proyecto-archivos', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS proyecto_archivos_select ON storage.objects;
CREATE POLICY proyecto_archivos_select ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'proyecto-archivos'
    AND usuario_activo_grupo()
  );

DROP POLICY IF EXISTS proyecto_archivos_insert ON storage.objects;
CREATE POLICY proyecto_archivos_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'proyecto-archivos'
    AND usuario_activo_grupo()
  );

DROP POLICY IF EXISTS proyecto_archivos_delete ON storage.objects;
CREATE POLICY proyecto_archivos_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'proyecto-archivos'
    AND usuario_activo_grupo()
  );

-- ============================================================================
-- 3. Equipo del proyecto (miembros y roles)
-- ============================================================================

CREATE TYPE rol_proyecto AS ENUM (
  'pm',
  'vendedor',
  'supervisor_obra',
  'ingeniero_diseno',
  'ingeniero_electrico',
  'instalador',
  'soporte',
  'admin_proyecto',
  'cliente_contacto',
  'observador'
);

CREATE TABLE IF NOT EXISTS proyecto_equipo (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proyecto_id UUID NOT NULL REFERENCES proyectos(id) ON DELETE CASCADE,
  usuario_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  usuario_nombre TEXT, -- snapshot del nombre
  rol rol_proyecto NOT NULL DEFAULT 'observador',
  fecha_alta DATE DEFAULT CURRENT_DATE,
  fecha_baja DATE,
  observaciones TEXT,
  agregado_por UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(proyecto_id, usuario_id, rol)
);

CREATE INDEX IF NOT EXISTS idx_peq_proyecto ON proyecto_equipo(proyecto_id);
CREATE INDEX IF NOT EXISTS idx_peq_usuario
  ON proyecto_equipo(usuario_id) WHERE fecha_baja IS NULL;

ALTER TABLE proyecto_equipo ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS peq_select ON proyecto_equipo;
CREATE POLICY peq_select ON proyecto_equipo
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM proyectos p
      WHERE p.id = proyecto_equipo.proyecto_id
        AND (
          p.empresa_id IN (SELECT empresas_del_usuario())
          OR usuario_es_ceo()
          OR p.pm_id = auth.uid()
          OR p.vendedor_id = auth.uid()
          OR proyecto_equipo.usuario_id = auth.uid()
        )
    )
  );

DROP POLICY IF EXISTS peq_modify ON proyecto_equipo;
CREATE POLICY peq_modify ON proyecto_equipo
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM proyectos p
      WHERE p.id = proyecto_equipo.proyecto_id
        AND (
          usuario_es_ceo()
          OR p.pm_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM usuarios_empresas
            WHERE usuario_id = auth.uid()
              AND empresa_id = p.empresa_id
              AND rol IN ('director'::rol_usuario, 'operativo'::rol_usuario)
              AND activo = TRUE
          )
        )
    )
  );

-- Vista: bitácora con info de tarea relacionada
CREATE OR REPLACE VIEW v_proyecto_bitacora AS
SELECT
  b.*,
  t.titulo AS tarea_titulo
FROM proyecto_bitacora b
LEFT JOIN proyecto_tareas t ON t.id = b.tarea_id;
