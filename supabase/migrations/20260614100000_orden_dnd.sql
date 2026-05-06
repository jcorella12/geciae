-- ============================================================================
-- Sprint Z.3 — campos de orden para drag-and-drop
-- ============================================================================

ALTER TABLE proyecto_tareas
  ADD COLUMN IF NOT EXISTS orden INTEGER;

ALTER TABLE plantilla_etapas
  ADD COLUMN IF NOT EXISTS orden INTEGER;

ALTER TABLE proyecto_solicitudes
  ADD COLUMN IF NOT EXISTS prioridad_visual INTEGER;

-- Backfill orden de tareas
UPDATE proyecto_tareas SET orden = idx FROM (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY proyecto_id ORDER BY created_at) AS idx
  FROM proyecto_tareas
  WHERE orden IS NULL
) sub WHERE proyecto_tareas.id = sub.id AND proyecto_tareas.orden IS NULL;

-- Backfill orden de etapas si la tabla y columna existen
DO $$
DECLARE
  has_plantilla_id BOOLEAN;
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'plantilla_etapas') THEN
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'plantilla_etapas' AND column_name = 'plantilla_id'
    ) INTO has_plantilla_id;
    IF has_plantilla_id THEN
      EXECUTE $sql$
        UPDATE plantilla_etapas SET orden = idx FROM (
          SELECT id, ROW_NUMBER() OVER (PARTITION BY plantilla_id ORDER BY created_at) AS idx
          FROM plantilla_etapas
          WHERE orden IS NULL
        ) sub WHERE plantilla_etapas.id = sub.id AND plantilla_etapas.orden IS NULL
      $sql$;
    END IF;
  END IF;
END$$;

CREATE INDEX IF NOT EXISTS idx_proyecto_tareas_orden ON proyecto_tareas(proyecto_id, orden);
