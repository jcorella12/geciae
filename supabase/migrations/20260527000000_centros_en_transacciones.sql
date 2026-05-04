-- ============================================================================
-- Sprint 5.5.3 — Vincular transacciones existentes a centros de costo/utilidad
--
-- Agrega centro_id a OC, CFDI, gastos_recurrentes y centros origen+destino a
-- OT inter-co. También centro_default_gastos_id en empresas para sugerir
-- automáticamente al usuario.
--
-- No fuerza valores: las transacciones existentes quedan con centro_id NULL
-- y se limpian progresivamente (vista v_transacciones_sin_centro).
-- ============================================================================

-- 1. ordenes_compra
ALTER TABLE ordenes_compra
  ADD COLUMN IF NOT EXISTS centro_id UUID REFERENCES centros(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_oc_centro
  ON ordenes_compra(centro_id) WHERE centro_id IS NOT NULL;

-- 2. ordenes_trabajo_inter_co — origen (CC en empresa que paga) + destino (CU en empresa que cobra)
ALTER TABLE ordenes_trabajo_inter_co
  ADD COLUMN IF NOT EXISTS centro_origen_id UUID REFERENCES centros(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS centro_destino_id UUID REFERENCES centros(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_ot_centro_origen
  ON ordenes_trabajo_inter_co(centro_origen_id) WHERE centro_origen_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ot_centro_destino
  ON ordenes_trabajo_inter_co(centro_destino_id) WHERE centro_destino_id IS NOT NULL;

-- 3. cfdi (centro de utilidad asociado al ingreso, o de costo si gasto recibido)
ALTER TABLE cfdi
  ADD COLUMN IF NOT EXISTS centro_id UUID REFERENCES centros(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_cfdi_centro
  ON cfdi(centro_id) WHERE centro_id IS NOT NULL;

-- 4. gastos_recurrentes
ALTER TABLE gastos_recurrentes
  ADD COLUMN IF NOT EXISTS centro_id UUID REFERENCES centros(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_gr_centro
  ON gastos_recurrentes(centro_id) WHERE centro_id IS NOT NULL;

-- 5. empresas: centro default para sugerir cuando el usuario no elige
ALTER TABLE empresas
  ADD COLUMN IF NOT EXISTS centro_default_gastos_id UUID REFERENCES centros(id) ON DELETE SET NULL;

COMMENT ON COLUMN ordenes_compra.centro_id IS
  'Centro de costo donde cae la OC. NULL = sin asignar (warning, no bloqueo).';
COMMENT ON COLUMN ordenes_trabajo_inter_co.centro_origen_id IS
  'Centro de costo en empresa origen que paga la OT.';
COMMENT ON COLUMN ordenes_trabajo_inter_co.centro_destino_id IS
  'Centro de utilidad en empresa destino que recibe el ingreso de la OT.';
COMMENT ON COLUMN cfdi.centro_id IS
  'Centro de utilidad (si emisión) o costo (si gasto recibido) vinculado al CFDI.';
COMMENT ON COLUMN gastos_recurrentes.centro_id IS
  'Centro de costo al que se carga el gasto recurrente.';
COMMENT ON COLUMN empresas.centro_default_gastos_id IS
  'Centro de costo sugerido cuando una transacción no especifica uno.';

-- ============================================================================
-- Vista de transacciones sin centro (para limpieza progresiva)
-- ============================================================================

CREATE OR REPLACE VIEW v_transacciones_sin_centro AS
SELECT
  'oc'::TEXT AS tipo,
  oc.id,
  oc.empresa_id,
  oc.numero,
  oc.fecha_emision AS fecha,
  oc.total AS monto,
  oc.proyecto_id,
  oc.estado::TEXT AS estado
FROM ordenes_compra oc
WHERE oc.centro_id IS NULL
  AND oc.estado IN ('aprobada', 'enviada', 'parcial_recibida', 'recibida', 'pagada')

UNION ALL

SELECT
  'ot'::TEXT AS tipo,
  ot.id,
  ot.empresa_origen_id AS empresa_id,
  ot.numero,
  ot.fecha_solicitud AS fecha,
  ot.total AS monto,
  ot.proyecto_id,
  ot.estado::TEXT AS estado
FROM ordenes_trabajo_inter_co ot
WHERE (ot.centro_origen_id IS NULL OR ot.centro_destino_id IS NULL)
  AND ot.estado IN ('aprobada', 'en_proceso', 'completada_origen', 'confirmada_destino', 'lista_cobrar', 'facturada', 'cobrada')

UNION ALL

SELECT
  'gasto_recurrente'::TEXT AS tipo,
  gr.id,
  gr.empresa_id,
  COALESCE(gr.identificador, gr.descripcion) AS numero,
  gr.fecha_inicio AS fecha,
  gr.monto,
  NULL::UUID AS proyecto_id,
  CASE WHEN gr.activo THEN 'activo' ELSE 'archivado' END AS estado
FROM gastos_recurrentes gr
WHERE gr.centro_id IS NULL
  AND gr.activo = TRUE

UNION ALL

SELECT
  'cfdi'::TEXT AS tipo,
  c.id,
  c.empresa_id,
  COALESCE(c.serie || '-' || c.folio, c.uuid_sat::TEXT) AS numero,
  c.fecha_emision::DATE AS fecha,
  c.total AS monto,
  NULL::UUID AS proyecto_id,
  c.estado::TEXT AS estado
FROM cfdi c
WHERE c.centro_id IS NULL
  AND c.estado IN ('timbrado', 'enviado_cliente', 'pagado');

COMMENT ON VIEW v_transacciones_sin_centro IS
  'Transacciones financieramente relevantes sin centro asignado. Usado por la pantalla de limpieza progresiva (Sprint 5.5.3).';
