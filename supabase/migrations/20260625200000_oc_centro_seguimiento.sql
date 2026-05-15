-- ============================================================================
-- Sprint S.3.3 — Seguimiento de registro de movimientos en centros.
--
-- Antes: try/catch que ignoraba errores. Ahora: campos en OC para detectar
-- y reintentar movimientos fallidos, más vista para detectar deuda histórica.
-- ============================================================================

ALTER TABLE ordenes_compra
  ADD COLUMN IF NOT EXISTS centro_movimiento_registrado_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS centro_movimiento_error TEXT;

COMMENT ON COLUMN ordenes_compra.centro_movimiento_registrado_at IS
  'Cuando se registró exitosamente el movimiento en centros_movimientos. '
  'NULL si no se intentó (sin centro_id) o si falló (ver _error).';

COMMENT ON COLUMN ordenes_compra.centro_movimiento_error IS
  'Si NO es NULL, el último intento de registrar movimiento falló. '
  'Permite reintentar y exponer en UI.';

-- Vista para detectar OCs con centro pero sin movimiento registrado
CREATE OR REPLACE VIEW v_oc_centros_pendientes_registro AS
SELECT
  oc.id,
  oc.numero,
  oc.empresa_id,
  oc.estado,
  oc.centro_id,
  oc.total,
  oc.fecha_aprobacion,
  oc.centro_movimiento_error
FROM ordenes_compra oc
WHERE oc.centro_id IS NOT NULL
  AND oc.estado IN ('aprobada', 'recibida', 'pagada')
  AND oc.centro_movimiento_registrado_at IS NULL
ORDER BY oc.fecha_aprobacion DESC;

COMMENT ON VIEW v_oc_centros_pendientes_registro IS
  'OCs aprobadas/recibidas/pagadas con centro asignado pero sin movimiento '
  'registrado en centros_movimientos. Indica que algo falló y los reportes '
  'de P&L están incompletos. Reintentar manualmente o vía cron.';

-- Backfill: marcar las OCs históricas que SÍ tienen movimiento como OK.
-- NOTA: este proyecto registra movimientos con FK `oc_id` y tipo
-- 'gasto_directo' (cf. lib/centros/registrar.ts), no `referencia_id` /
-- 'egreso_oc' como asumía el spec original del patch.
UPDATE ordenes_compra oc
SET centro_movimiento_registrado_at = COALESCE(oc.fecha_aprobacion, oc.created_at)
WHERE oc.centro_id IS NOT NULL
  AND oc.estado IN ('aprobada', 'recibida', 'pagada')
  AND oc.centro_movimiento_registrado_at IS NULL
  AND EXISTS (
    SELECT 1 FROM centros_movimientos cm
    WHERE cm.oc_id = oc.id
      AND cm.tipo = 'gasto_directo'
  );
