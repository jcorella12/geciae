-- ============================================================================
-- Fix: cfdi_kpis_filtrados — excluir tipo='pago' y tipo='traslado' de totales
-- ============================================================================
-- Bug reportado por el equipo de contabilidad:
--   CIAE mayo 2026, recibidos:
--     - App muestra:    $1,473,053.37
--     - Contabilidad:   $1,235,489.74
--     - Diferencia:     $  237,563.63
--
-- Diagnóstico: los $237,563.63 son 9 CFDIs tipo `pago` (complementos de
-- pago, SAT tipo P). Estos NO son gastos — son comprobantes administrativos
-- que confirman el pago de una factura PPD ya registrada como gasto. Sumar
-- ambos = duplicar.
--
-- También excluímos tipo='traslado' (cartas porte y similares — no son
-- ingreso/gasto). Mantenemos tipo='ingreso', 'egreso' y 'nomina'.
--
-- KPIs afectados: total_emitido, total_recibido, iva_trasladado,
-- iva_acreditable, cxc, cxp.
-- ============================================================================

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
    -- Total emitido: solo tipo ingreso/egreso/nómina, no cancelados,
    -- excluye complementos de pago (P) y traslados (T) porque NO son
    -- ingreso/gasto sino documentos administrativos.
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

    -- CxC / CxP: solo cuentan facturas pendientes (tipo ingreso). Las
    -- nóminas y complementos no generan cuentas por cobrar/pagar.
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

    -- IVA trasladado / acreditable: solo de facturas reales, no de
    -- complementos de pago (esos ya contabilizaron el IVA en su origen).
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

    -- Conteos: estos sí incluyen todos los tipos para reflejar cuántos
    -- CFDIs hay realmente. La toolbar muestra "X resultados" — los pagos
    -- y traslados sí cuentan como resultados de la búsqueda.
    COUNT(*) FILTER (WHERE es_emitido = TRUE)::BIGINT AS n_emitidos,
    COUNT(*) FILTER (WHERE es_emitido = FALSE)::BIGINT AS n_recibidos
  FROM filtrados;
$$;

-- Verificación: re-corre el caso reportado
SELECT
  'CIAE mayo 2026 recibidos' AS escenario,
  total_recibido,
  n_recibidos
FROM cfdi_kpis_filtrados(
  p_empresa_id := (SELECT id FROM empresas WHERE codigo = 'CIAE'),
  p_direccion := 'recibidos',
  p_desde := '2026-05-01',
  p_hasta := '2026-05-31'
);
