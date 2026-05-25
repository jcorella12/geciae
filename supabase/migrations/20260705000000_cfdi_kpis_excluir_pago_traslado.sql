-- Fix bug reportado por contabilidad: la función `cfdi_kpis_filtrados`
-- sumaba complementos de pago (tipo P) y traslados (tipo T) como si fueran
-- ingresos/gastos, inflando el total mostrado en /finanzas/cfdi.
--
-- Caso reportado: CIAE mayo 2026 recibidos
--   App:           $1,473,053.37 (incluía 9 complementos de pago de $237,563.63)
--   Contabilidad:  $1,235,489.74 (correcto — solo facturas reales)
--
-- Los complementos de pago no son un gasto independiente — confirman el
-- pago de una factura PPD que ya se contabilizó cuando se recibió. Sumar
-- ambos = duplicar.
--
-- Cambio: total_emitido, total_recibido, iva_trasladado, iva_acreditable
-- ahora excluyen tipo='pago' y tipo='traslado'. CxC/CxP solo cuentan tipo
-- ingreso/egreso (los únicos con saldo_pendiente que tiene sentido).

CREATE OR REPLACE FUNCTION cfdi_kpis_filtrados(
  p_q TEXT DEFAULT NULL,
  p_direccion TEXT DEFAULT NULL,
  p_estado TEXT DEFAULT NULL,
  p_empresa_id UUID DEFAULT NULL,
  p_desde DATE DEFAULT NULL,
  p_hasta DATE DEFAULT NULL,
  p_forma_pago TEXT DEFAULT NULL,
  p_monto_min NUMERIC DEFAULT NULL
)
RETURNS TABLE (
  total_emitido NUMERIC,
  total_recibido NUMERIC,
  cxc NUMERIC,
  cxp NUMERIC,
  iva_trasladado NUMERIC,
  iva_acreditable NUMERIC,
  n_emitidos BIGINT,
  n_recibidos BIGINT
)
LANGUAGE SQL STABLE
AS $$
  WITH filtrados AS (
    SELECT *
    FROM cfdi c
    WHERE
      (p_direccion IS NULL OR
       (p_direccion = 'emitidos' AND c.es_emitido = TRUE) OR
       (p_direccion = 'recibidos' AND c.es_emitido = FALSE))
      AND (p_estado IS NULL OR c.estado::text = p_estado)
      AND (p_empresa_id IS NULL OR c.empresa_id = p_empresa_id)
      AND (p_desde IS NULL OR c.fecha_emision::date >= p_desde)
      AND (p_hasta IS NULL OR c.fecha_emision::date <= p_hasta)
      AND (p_forma_pago IS NULL OR c.metodo_pago = p_forma_pago)
      AND (p_monto_min IS NULL OR c.total >= p_monto_min)
      AND (p_q IS NULL OR p_q = '' OR (
        c.rfc_emisor ILIKE '%' || p_q || '%' OR
        c.nombre_emisor ILIKE '%' || p_q || '%' OR
        c.rfc_receptor ILIKE '%' || p_q || '%' OR
        c.nombre_receptor ILIKE '%' || p_q || '%' OR
        COALESCE(c.folio, '') ILIKE '%' || p_q || '%' OR
        COALESCE(c.serie, '') ILIKE '%' || p_q || '%' OR
        COALESCE(c.uuid_sat::text, '') ILIKE '%' || p_q || '%'
      ))
  )
  SELECT
    COALESCE(SUM(CASE
      WHEN es_emitido = TRUE
        AND estado != 'cancelado'
        AND tipo::text NOT IN ('pago', 'traslado')
      THEN total ELSE 0
    END), 0)::NUMERIC AS total_emitido,

    COALESCE(SUM(CASE
      WHEN es_emitido = FALSE
        AND estado != 'cancelado'
        AND tipo::text NOT IN ('pago', 'traslado')
      THEN total ELSE 0
    END), 0)::NUMERIC AS total_recibido,

    COALESCE(SUM(CASE
      WHEN es_emitido = TRUE
        AND estado = 'timbrado'
        AND tipo::text = 'ingreso'
        AND saldo_pendiente > 0
      THEN saldo_pendiente ELSE 0
    END), 0)::NUMERIC AS cxc,

    COALESCE(SUM(CASE
      WHEN es_emitido = FALSE
        AND estado = 'timbrado'
        AND tipo::text IN ('ingreso', 'egreso')
        AND saldo_pendiente > 0
      THEN saldo_pendiente ELSE 0
    END), 0)::NUMERIC AS cxp,

    COALESCE(SUM(CASE
      WHEN es_emitido = TRUE
        AND estado != 'cancelado'
        AND tipo::text NOT IN ('pago', 'traslado')
      THEN iva_trasladado ELSE 0
    END), 0)::NUMERIC AS iva_trasladado,

    COALESCE(SUM(CASE
      WHEN es_emitido = FALSE
        AND estado != 'cancelado'
        AND tipo::text NOT IN ('pago', 'traslado')
      THEN iva_trasladado ELSE 0
    END), 0)::NUMERIC AS iva_acreditable,

    COUNT(*) FILTER (WHERE es_emitido = TRUE)::BIGINT AS n_emitidos,
    COUNT(*) FILTER (WHERE es_emitido = FALSE)::BIGINT AS n_recibidos
  FROM filtrados;
$$;
