-- Fix de Balance Gerencial: excluir CFDIs en estado 'pagado' del cálculo
-- de CxC y CxP.
--
-- Bug encontrado 2026-05-15:
-- Las vistas `v_cxc_por_antiguedad` y `v_cxp_pendientes` filtraban
-- CFDIs cuyo `estado IN ('timbrado','enviado_cliente','pagado')` e
-- intentaban restar lo cobrado/pagado vía `cfdi_pagos`. La intención
-- era que un CFDI marcado 'pagado' netteara su saldo con sus pagos.
--
-- Pero el bulk "marcalas todas como cobradas/pagadas" (sesión anterior)
-- actualizó `cfdi.estado` SIN insertar registros en `cfdi_pagos`. Eso
-- dejó la matemática rota:
--   saldo = total - SUM(cfdi_pagos.monto)
--         = total - 0
--         = total completo
--
-- Resultado: el balance general inflaba "Activos totales" con CxC fantasma
-- (todas las facturas cobradas sumaban como por cobrar) y "Pasivos" con
-- CxP fantasma (todas las pagadas seguían apareciendo como debidas).
--
-- Fix (Opción A): excluir `estado='pagado'` del filtro. Si la factura ya
-- está marcada como cobrada/pagada, no entra al cálculo, sin importar si
-- existe o no su `cfdi_pagos`. Esto coincide con el modelo mental "está
-- cerrada, déjala fuera del balance". Cuando llegue un pago parcial real,
-- la factura se queda en 'timbrado' o 'enviado_cliente' y se agregan los
-- cfdi_pagos para netear el saldo correctamente.

-- ----------------------------------------------------------------------------
-- CxC por antigüedad
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW v_cxc_por_antiguedad AS
WITH ingresos_emitidos AS (
  SELECT
    c.id AS cfdi_id,
    c.empresa_id,
    c.cliente_id,
    c.fecha_emision::DATE AS fecha,
    c.total,
    c.folio,
    c.uuid_sat
  FROM cfdi c
  WHERE c.tipo = 'ingreso'
    AND c.es_emitido = TRUE
    AND c.estado IN ('timbrado', 'enviado_cliente')  -- 'pagado' excluido
),
pagos_recibidos AS (
  SELECT
    cp.cfdi_pagado_id AS cfdi_id,
    SUM(cp.monto) AS pagado
  FROM cfdi_pagos cp
  GROUP BY cp.cfdi_pagado_id
)
SELECT
  i.cfdi_id, i.empresa_id, i.cliente_id, i.fecha, i.folio,
  i.total AS monto_total,
  COALESCE(p.pagado, 0) AS monto_pagado,
  i.total - COALESCE(p.pagado, 0) AS saldo,
  (CURRENT_DATE - i.fecha)::INTEGER AS dias_antiguedad,
  CASE
    WHEN (CURRENT_DATE - i.fecha) <= 30 THEN 'corriente'
    WHEN (CURRENT_DATE - i.fecha) <= 60 THEN '30_60'
    WHEN (CURRENT_DATE - i.fecha) <= 90 THEN '60_90'
    ELSE 'mas_90'
  END AS bucket_antiguedad
FROM ingresos_emitidos i
LEFT JOIN pagos_recibidos p ON p.cfdi_id = i.cfdi_id
WHERE i.total - COALESCE(p.pagado, 0) > 0.50;

-- ----------------------------------------------------------------------------
-- CxP pendientes
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW v_cxp_pendientes AS
WITH egresos_recibidos AS (
  SELECT
    c.id AS cfdi_id,
    c.empresa_id,
    c.proveedor_id,
    c.fecha_emision::DATE AS fecha,
    c.total,
    c.folio
  FROM cfdi c
  WHERE c.tipo = 'ingreso'
    AND c.es_emitido = FALSE
    AND c.estado IN ('timbrado', 'enviado_cliente')  -- 'pagado' excluido
),
pagos_emitidos AS (
  SELECT
    cp.cfdi_pagado_id AS cfdi_id,
    SUM(cp.monto) AS pagado
  FROM cfdi_pagos cp
  GROUP BY cp.cfdi_pagado_id
)
SELECT
  e.cfdi_id, e.empresa_id, e.proveedor_id, e.fecha, e.folio,
  e.total AS monto_total,
  COALESCE(p.pagado, 0) AS monto_pagado,
  e.total - COALESCE(p.pagado, 0) AS saldo,
  (CURRENT_DATE - e.fecha)::INTEGER AS dias_antiguedad
FROM egresos_recibidos e
LEFT JOIN pagos_emitidos p ON p.cfdi_id = e.cfdi_id
WHERE e.total - COALESCE(p.pagado, 0) > 0.50;
