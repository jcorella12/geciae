-- ============================================================================
-- Sprint 4 — S4-T5
-- proyectos.cotizacion_id para trazabilidad cotización → proyecto.
--
-- Antes: convertirAProyecto creaba el proyecto perdiendo la referencia
-- a la cotización origen y la oportunidad. Imposible navegar
-- proyecto → cotización origen → conceptos partidos.
--
-- oportunidad_id ya existía (FK desde proyectos). cotizacion_id no.
-- ============================================================================

ALTER TABLE proyectos
  ADD COLUMN IF NOT EXISTS cotizacion_id UUID REFERENCES cotizaciones(id)
    ON DELETE SET NULL;

COMMENT ON COLUMN proyectos.cotizacion_id IS
  'FK opcional a la cotización aceptada que dio origen al proyecto. '
  'NULL si el proyecto se creó sin cotización previa (insourced, '
  'mantenimientos recurrentes, etc.).';

CREATE INDEX IF NOT EXISTS idx_proyectos_cotizacion_id
  ON proyectos(cotizacion_id)
  WHERE cotizacion_id IS NOT NULL;
