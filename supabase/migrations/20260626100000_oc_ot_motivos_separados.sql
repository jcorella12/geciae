-- ============================================================================
-- Sprint 2 — S2-T7
-- Separar motivo_rechazo / motivo_cancelacion en OC y OT.
--
-- Antes: el motivo se sobrescribía sobre `comentarios` (OC) o
-- `observaciones` (OT) destruyendo el texto original. Imposible distinguir
-- "rechazada por monto incorrecto" de "cancelada por error del capturador".
--
-- Backfill: parsea los prefijos "RECHAZADA:" / "CANCELADA:" históricos
-- para no perder los motivos ya capturados.
-- ============================================================================

-- OC ------------------------------------------------------------------------
ALTER TABLE ordenes_compra
  ADD COLUMN IF NOT EXISTS motivo_rechazo TEXT,
  ADD COLUMN IF NOT EXISTS motivo_cancelacion TEXT;

COMMENT ON COLUMN ordenes_compra.motivo_rechazo IS
  'Texto del motivo cuando la OC fue rechazada en aprobación. '
  'Solo aplica si el estado pasó por "cancelada" via rechazarOC.';

COMMENT ON COLUMN ordenes_compra.motivo_cancelacion IS
  'Texto del motivo cuando la OC fue cancelada explícitamente '
  '(cancelarOC). Distinto de motivo_rechazo (que viene de la aprobación).';

-- Backfill OC: parsear los prefijos del campo `comentarios` para no
-- perder los motivos históricos.
UPDATE ordenes_compra
SET motivo_rechazo = REGEXP_REPLACE(comentarios, '^RECHAZADA:\s*', '')
WHERE comentarios LIKE 'RECHAZADA:%'
  AND motivo_rechazo IS NULL;

UPDATE ordenes_compra
SET motivo_cancelacion = REGEXP_REPLACE(comentarios, '^CANCELADA:\s*', '')
WHERE comentarios LIKE 'CANCELADA:%'
  AND motivo_cancelacion IS NULL;

-- Limpiar el campo `comentarios` SOLO en filas donde habíamos clavado el
-- motivo como prefijo. Si el usuario añadió comentarios originales antes
-- del rechazo/cancelación los perdería — por eso solo limpiamos cuando
-- el campo coincide 1:1 con el patrón (no hay sufijo después del motivo).
-- Conservador: si hubiera "RECHAZADA: X\nOriginal: Y" no lo tocamos.
UPDATE ordenes_compra
SET comentarios = NULL
WHERE (comentarios LIKE 'RECHAZADA:%' OR comentarios LIKE 'CANCELADA:%')
  AND comentarios NOT LIKE '%' || E'\n' || '%';

-- OT ------------------------------------------------------------------------
ALTER TABLE ordenes_trabajo_inter_co
  ADD COLUMN IF NOT EXISTS motivo_cancelacion TEXT;

COMMENT ON COLUMN ordenes_trabajo_inter_co.motivo_cancelacion IS
  'Texto del motivo cuando la OT inter-co fue cancelada.';

UPDATE ordenes_trabajo_inter_co
SET motivo_cancelacion = REGEXP_REPLACE(observaciones, '^CANCELADA:\s*', '')
WHERE observaciones LIKE 'CANCELADA:%'
  AND motivo_cancelacion IS NULL;

UPDATE ordenes_trabajo_inter_co
SET observaciones = NULL
WHERE observaciones LIKE 'CANCELADA:%'
  AND observaciones NOT LIKE '%' || E'\n' || '%';
