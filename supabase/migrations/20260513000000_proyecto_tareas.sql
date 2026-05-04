-- Sprint 20 — Proyectos avanzado: tareas + hitos para Gantt y Kanban.

CREATE TYPE estado_tarea_proyecto AS ENUM (
  'pendiente',
  'en_curso',
  'bloqueada',
  'completada',
  'cancelada'
);

CREATE TYPE prioridad_tarea AS ENUM ('baja', 'media', 'alta', 'urgente');

CREATE TABLE IF NOT EXISTS proyecto_tareas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proyecto_id UUID NOT NULL REFERENCES proyectos(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES proyecto_tareas(id) ON DELETE CASCADE,  -- subtarea
  orden INTEGER NOT NULL DEFAULT 0,
  titulo TEXT NOT NULL,
  descripcion TEXT,
  es_hito BOOLEAN DEFAULT FALSE,
  estado estado_tarea_proyecto NOT NULL DEFAULT 'pendiente',
  prioridad prioridad_tarea DEFAULT 'media',
  -- Fechas
  fecha_inicio_planeada DATE,
  fecha_fin_planeada DATE,
  fecha_inicio_real DATE,
  fecha_fin_real DATE,
  duracion_dias INTEGER,  -- calculado de planeadas
  -- Avance
  porcentaje_avance INTEGER DEFAULT 0 CHECK (porcentaje_avance BETWEEN 0 AND 100),
  -- Asignación
  asignado_a UUID REFERENCES auth.users(id),
  -- Costo / esfuerzo
  horas_estimadas NUMERIC(8, 2),
  horas_reales NUMERIC(8, 2) DEFAULT 0,
  costo_estimado NUMERIC(12, 2),
  costo_real NUMERIC(12, 2) DEFAULT 0,
  -- Dependencias (formato: lista de IDs de otras tareas que deben completarse antes)
  depende_de UUID[],
  -- Vinculación con CFDI/OC
  cfdi_relacionado_id UUID REFERENCES cfdi(id),
  oc_relacionada_id UUID REFERENCES ordenes_compra(id),
  observaciones TEXT,
  capturado_por UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pt_proyecto
  ON proyecto_tareas(proyecto_id, orden);
CREATE INDEX IF NOT EXISTS idx_pt_estado
  ON proyecto_tareas(proyecto_id, estado);
CREATE INDEX IF NOT EXISTS idx_pt_asignado
  ON proyecto_tareas(asignado_a) WHERE estado IN ('pendiente', 'en_curso');

-- RLS
ALTER TABLE proyecto_tareas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS pt_select ON proyecto_tareas;
CREATE POLICY pt_select ON proyecto_tareas
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM proyectos p
      WHERE p.id = proyecto_tareas.proyecto_id
        AND (
          p.empresa_id IN (SELECT empresas_del_usuario())
          OR usuario_es_ceo()
          OR p.pm_id = auth.uid()
          OR p.vendedor_id = auth.uid()
          OR proyecto_tareas.asignado_a = auth.uid()
        )
    )
  );

DROP POLICY IF EXISTS pt_modify ON proyecto_tareas;
CREATE POLICY pt_modify ON proyecto_tareas
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM proyectos p
      WHERE p.id = proyecto_tareas.proyecto_id
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

-- Trigger para auto-calcular duración_dias
CREATE OR REPLACE FUNCTION calcular_duracion_tarea()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.fecha_inicio_planeada IS NOT NULL AND NEW.fecha_fin_planeada IS NOT NULL THEN
    NEW.duracion_dias := (NEW.fecha_fin_planeada - NEW.fecha_inicio_planeada) + 1;
  END IF;
  -- Auto-marcar real si avance = 100
  IF NEW.porcentaje_avance = 100 AND NEW.estado != 'completada' THEN
    NEW.estado := 'completada';
    IF NEW.fecha_fin_real IS NULL THEN
      NEW.fecha_fin_real := CURRENT_DATE;
    END IF;
  END IF;
  -- Si está completada y no tiene fecha_inicio_real, asumir hoy
  IF NEW.estado = 'en_curso' AND NEW.fecha_inicio_real IS NULL THEN
    NEW.fecha_inicio_real := CURRENT_DATE;
  END IF;
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_pt_calc ON proyecto_tareas;
CREATE TRIGGER trg_pt_calc
  BEFORE INSERT OR UPDATE ON proyecto_tareas
  FOR EACH ROW EXECUTE FUNCTION calcular_duracion_tarea();

-- Vista: tareas con info de proyecto
CREATE OR REPLACE VIEW v_proyecto_tareas_lista AS
SELECT
  t.*,
  p.codigo AS proyecto_codigo,
  p.nombre AS proyecto_nombre,
  p.empresa_id AS proyecto_empresa_id
FROM proyecto_tareas t
LEFT JOIN proyectos p ON p.id = t.proyecto_id;

-- Vista: avance ponderado del proyecto (por tareas)
CREATE OR REPLACE VIEW v_proyecto_avance AS
SELECT
  p.id AS proyecto_id,
  p.codigo,
  p.nombre,
  p.estado,
  COUNT(t.id) AS total_tareas,
  COUNT(t.id) FILTER (WHERE t.estado = 'completada') AS tareas_completadas,
  COUNT(t.id) FILTER (WHERE t.estado = 'en_curso') AS tareas_en_curso,
  COUNT(t.id) FILTER (WHERE t.estado = 'bloqueada') AS tareas_bloqueadas,
  COUNT(t.id) FILTER (WHERE t.es_hito = TRUE AND t.estado = 'completada') AS hitos_completados,
  COUNT(t.id) FILTER (WHERE t.es_hito = TRUE) AS total_hitos,
  -- Avance promedio simple
  COALESCE(AVG(t.porcentaje_avance)::INTEGER, 0) AS avance_promedio,
  -- Avance ponderado por horas estimadas
  CASE
    WHEN SUM(t.horas_estimadas) > 0
      THEN ROUND(
        SUM(t.porcentaje_avance * COALESCE(t.horas_estimadas, 1)) /
        SUM(COALESCE(t.horas_estimadas, 1))
      )::INTEGER
    ELSE COALESCE(AVG(t.porcentaje_avance)::INTEGER, 0)
  END AS avance_ponderado,
  SUM(t.horas_estimadas) AS horas_estimadas_total,
  SUM(t.horas_reales) AS horas_reales_total,
  SUM(t.costo_estimado) AS costo_estimado_total,
  SUM(t.costo_real) AS costo_real_total
FROM proyectos p
LEFT JOIN proyecto_tareas t ON t.proyecto_id = p.id
GROUP BY p.id, p.codigo, p.nombre, p.estado;
