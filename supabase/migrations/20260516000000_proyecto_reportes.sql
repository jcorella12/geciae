-- Reportes formales del proyecto: incidentes, avances, inspecciones, etc.
-- Diferenciado de bitácora (timeline informal) y documentos (archivos sueltos).
-- Un reporte es un documento estructurado con seguimiento y estado.

CREATE TYPE tipo_reporte_proyecto AS ENUM (
  'incidente',
  'avance_semanal',
  'avance_mensual',
  'inspeccion',
  'no_conformidad',
  'hallazgo_seguridad',
  'retraso',
  'cambio_alcance',
  'ejecutivo',
  'cierre_etapa',
  'siniestro',
  'auditoria',
  'otro'
);

CREATE TYPE severidad_reporte AS ENUM ('info', 'baja', 'media', 'alta', 'critica');

CREATE TYPE estado_reporte AS ENUM (
  'borrador',
  'emitido',
  'en_seguimiento',
  'resuelto',
  'cerrado'
);

CREATE TABLE IF NOT EXISTS proyecto_reportes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proyecto_id UUID NOT NULL REFERENCES proyectos(id) ON DELETE CASCADE,
  numero TEXT NOT NULL, -- auto: RPT-{YEAR}-{seq}
  tipo tipo_reporte_proyecto NOT NULL DEFAULT 'otro',
  severidad severidad_reporte DEFAULT 'info',
  estado estado_reporte NOT NULL DEFAULT 'borrador',
  titulo TEXT NOT NULL,
  resumen TEXT, -- 1-2 párrafos para preview en lista
  contenido TEXT, -- cuerpo completo (markdown / texto largo)
  -- Datos del evento
  fecha_evento DATE,
  fecha_reporte DATE NOT NULL DEFAULT CURRENT_DATE,
  ubicacion TEXT,
  impacto TEXT,
  -- Seguimiento
  accion_correctiva TEXT,
  responsable_seguimiento UUID REFERENCES auth.users(id),
  responsable_nombre TEXT,
  fecha_compromiso DATE,
  fecha_resolucion DATE,
  -- Adjuntos (paths en bucket proyecto-archivos bajo carpeta reportes/{id})
  adjuntos JSONB DEFAULT '[]'::jsonb,
  -- Vinculaciones
  tarea_id UUID REFERENCES proyecto_tareas(id) ON DELETE SET NULL,
  -- Visibilidad y envío
  visible_cliente BOOLEAN DEFAULT FALSE,
  enviado_a TEXT[], -- lista de correos a quien se envió
  fecha_envio TIMESTAMPTZ,
  -- Metadatos
  creado_por UUID REFERENCES auth.users(id),
  creado_por_nombre TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(proyecto_id, numero)
);

CREATE INDEX IF NOT EXISTS idx_pr_proyecto
  ON proyecto_reportes(proyecto_id, fecha_reporte DESC);
CREATE INDEX IF NOT EXISTS idx_pr_tipo
  ON proyecto_reportes(proyecto_id, tipo, estado);
CREATE INDEX IF NOT EXISTS idx_pr_responsable
  ON proyecto_reportes(responsable_seguimiento)
  WHERE estado IN ('emitido', 'en_seguimiento');

-- RLS
ALTER TABLE proyecto_reportes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS pr_select ON proyecto_reportes;
CREATE POLICY pr_select ON proyecto_reportes
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM proyectos p
      WHERE p.id = proyecto_reportes.proyecto_id
        AND (
          p.empresa_id IN (SELECT empresas_del_usuario())
          OR usuario_es_ceo()
          OR p.pm_id = auth.uid()
          OR p.vendedor_id = auth.uid()
          OR proyecto_reportes.responsable_seguimiento = auth.uid()
        )
    )
  );

DROP POLICY IF EXISTS pr_modify ON proyecto_reportes;
CREATE POLICY pr_modify ON proyecto_reportes
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM proyectos p
      WHERE p.id = proyecto_reportes.proyecto_id
        AND (
          usuario_es_ceo()
          OR p.pm_id = auth.uid()
          OR proyecto_reportes.responsable_seguimiento = auth.uid()
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

-- Trigger: auto-numerar al insertar (RPT-2026-001 secuencial por proyecto)
CREATE OR REPLACE FUNCTION asignar_numero_reporte()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  yr INT;
  seq INT;
BEGIN
  IF NEW.numero IS NULL OR NEW.numero = '' THEN
    yr := EXTRACT(YEAR FROM COALESCE(NEW.fecha_reporte, CURRENT_DATE));
    SELECT COUNT(*) + 1 INTO seq
      FROM proyecto_reportes
      WHERE proyecto_id = NEW.proyecto_id
        AND numero LIKE 'RPT-' || yr || '-%';
    NEW.numero := 'RPT-' || yr || '-' || LPAD(seq::text, 3, '0');
  END IF;
  NEW.updated_at := NOW();
  -- Si pasamos a resuelto sin fecha_resolucion, ponerla hoy
  IF NEW.estado = 'resuelto' AND NEW.fecha_resolucion IS NULL THEN
    NEW.fecha_resolucion := CURRENT_DATE;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_pr_numero ON proyecto_reportes;
CREATE TRIGGER trg_pr_numero
  BEFORE INSERT OR UPDATE ON proyecto_reportes
  FOR EACH ROW EXECUTE FUNCTION asignar_numero_reporte();

-- Vista: reportes con info de proyecto y tarea
CREATE OR REPLACE VIEW v_proyecto_reportes_lista AS
SELECT
  r.*,
  p.codigo AS proyecto_codigo,
  p.nombre AS proyecto_nombre,
  p.empresa_id AS proyecto_empresa_id,
  t.titulo AS tarea_titulo
FROM proyecto_reportes r
LEFT JOIN proyectos p ON p.id = r.proyecto_id
LEFT JOIN proyecto_tareas t ON t.id = r.tarea_id;
