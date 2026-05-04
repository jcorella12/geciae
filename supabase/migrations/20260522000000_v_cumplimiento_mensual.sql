-- ============================================================================
-- Sprint 3.3 — Vista de cumplimiento fiscal mensual
--
-- Une obligaciones_sat + estados_financieros_mensuales por (empresa, año, mes).
-- Calcula semáforo combinado para drill-down desde el dashboard.
-- ============================================================================

CREATE OR REPLACE VIEW v_cumplimiento_mensual AS
WITH obs AS (
  SELECT
    o.empresa_id,
    o.periodo_anio AS anio,
    o.periodo_mes AS mes,
    COUNT(o.id) AS total_obligaciones,
    COUNT(o.id) FILTER (
      WHERE o.estado IN ('presentada', 'pagada')
    ) AS obligaciones_completadas,
    COUNT(o.id) FILTER (
      WHERE o.estado = 'pendiente' AND o.fecha_vencimiento < CURRENT_DATE
    ) AS obligaciones_fuera_plazo,
    COUNT(o.id) FILTER (WHERE o.estado = 'pagada') AS obligaciones_pagadas,
    COALESCE(SUM(o.monto_pagado), 0) AS total_pagado_sat
  FROM obligaciones_sat o
  WHERE o.periodo_mes IS NOT NULL
  GROUP BY o.empresa_id, o.periodo_anio, o.periodo_mes
),
efm AS (
  SELECT
    e.empresa_id,
    e.anio,
    e.mes,
    e.id AS efm_id,
    e.paquete_completo AS efm_completo,
    e.firmados AS efm_firmados,
    e.utilidad_neta,
    e.ingresos_totales,
    e.egresos_totales,
    e.iva_trasladado,
    e.iva_acreditable,
    e.flujo_efectivo
  FROM estados_financieros_mensuales e
)
SELECT
  COALESCE(o.empresa_id, e.empresa_id) AS empresa_id,
  emp.codigo AS empresa_codigo,
  COALESCE(o.anio, e.anio) AS anio,
  COALESCE(o.mes, e.mes) AS mes,
  -- Obligaciones
  COALESCE(o.total_obligaciones, 0) AS total_obligaciones,
  COALESCE(o.obligaciones_completadas, 0) AS obligaciones_completadas,
  COALESCE(o.obligaciones_fuera_plazo, 0) AS obligaciones_fuera_plazo,
  COALESCE(o.obligaciones_pagadas, 0) AS obligaciones_pagadas,
  COALESCE(o.total_pagado_sat, 0) AS total_pagado_sat,
  -- EFM
  e.efm_id,
  COALESCE(e.efm_completo, FALSE) AS efm_completo,
  COALESCE(e.efm_firmados, FALSE) AS efm_firmados,
  e.utilidad_neta,
  e.ingresos_totales,
  e.egresos_totales,
  e.iva_trasladado,
  e.iva_acreditable,
  e.flujo_efectivo,
  -- Semáforo combinado
  CASE
    WHEN COALESCE(o.obligaciones_fuera_plazo, 0) > 0 THEN 'rojo'
    WHEN COALESCE(o.total_obligaciones, 0) > 0
      AND o.total_obligaciones = o.obligaciones_completadas
      AND COALESCE(e.efm_completo, FALSE) = TRUE
      THEN 'verde'
    WHEN COALESCE(o.total_obligaciones, 0) > 0
      AND o.total_obligaciones = o.obligaciones_completadas
      THEN 'verde_parcial'
    WHEN COALESCE(o.total_obligaciones, 0) > 0 THEN 'amarillo'
    WHEN e.efm_id IS NOT NULL THEN 'efm_solo'
    ELSE 'gris'
  END AS semaforo
FROM obs o
FULL OUTER JOIN efm e
  ON o.empresa_id = e.empresa_id AND o.anio = e.anio AND o.mes = e.mes
LEFT JOIN empresas emp ON emp.id = COALESCE(o.empresa_id, e.empresa_id);

COMMENT ON VIEW v_cumplimiento_mensual IS
  'Cumplimiento fiscal mensual: obligaciones SAT + estados financieros + semáforo combinado.';
