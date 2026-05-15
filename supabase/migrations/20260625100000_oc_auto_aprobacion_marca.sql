-- ============================================================================
-- Sprint S.3.2 — Marcar OC auto-aprobadas (capturador con umbral).
--
-- Distingue "yo aprobé mi propia OC bajo mi umbral" vs "alguien me aprobó",
-- crítico para auditoría externa, REPSE, contraloría interna.
-- ============================================================================

ALTER TABLE ordenes_compra
  ADD COLUMN IF NOT EXISTS auto_aprobada BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS aprobacion_metodo TEXT
    CHECK (aprobacion_metodo IN ('manual', 'auto_umbral', 'sustitucion'))
    DEFAULT NULL;

COMMENT ON COLUMN ordenes_compra.auto_aprobada IS
  'TRUE si la OC fue auto-aprobada por su capturador bajo su umbral. '
  'Mantener separado de aprobado_por para auditoría.';

COMMENT ON COLUMN ordenes_compra.aprobacion_metodo IS
  'manual = otro usuario la aprobó | auto_umbral = capturador con umbral '
  '| sustitucion = aprobación por delegación';

-- Backfill defensivo: las OCs históricas donde capturado_por == aprobado_por
-- y estado != borrador son retrospectivamente auto-aprobadas.
UPDATE ordenes_compra
SET auto_aprobada = TRUE,
    aprobacion_metodo = 'auto_umbral'
WHERE estado IN ('aprobada', 'recibida', 'pagada')
  AND aprobado_por IS NOT NULL
  AND capturado_por = aprobado_por
  AND auto_aprobada = FALSE;

UPDATE ordenes_compra
SET aprobacion_metodo = 'manual'
WHERE aprobado_por IS NOT NULL
  AND aprobacion_metodo IS NULL;

-- Índice para reportes de auditoría
CREATE INDEX IF NOT EXISTS idx_oc_auto_aprobadas
  ON ordenes_compra (empresa_id, auto_aprobada, fecha_aprobacion DESC)
  WHERE auto_aprobada = TRUE;

-- Vista para reportes.
-- NOTA: este proyecto NO tiene tabla `usuarios` propia; usa auth.users
-- directamente (cf. patrón en 20260619000000_ajustes_gerenciales.sql:275).
CREATE OR REPLACE VIEW v_oc_auditoria_auto_aprobadas AS
SELECT
  oc.id,
  oc.numero,
  oc.empresa_id,
  e.codigo AS empresa_codigo,
  oc.fecha_aprobacion,
  oc.total,
  (SELECT email FROM auth.users WHERE id = oc.aprobado_por) AS aprobador_email,
  oc.auto_aprobada,
  oc.aprobacion_metodo
FROM ordenes_compra oc
JOIN empresas e ON e.id = oc.empresa_id
WHERE oc.auto_aprobada = TRUE
  AND oc.estado != 'cancelada'
ORDER BY oc.fecha_aprobacion DESC;

COMMENT ON VIEW v_oc_auditoria_auto_aprobadas IS
  'Reporte para auditor interno / contralor: todas las OCs que fueron '
  'auto-aprobadas por su capturador bajo su umbral.';
