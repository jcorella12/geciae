-- ============================================================================
-- Sprint 3 — S3-T6
-- Auto-conciliación: dado un CFDI con saldo pendiente, sugerir
-- movimientos bancarios candidatos.
--
-- Inversa de `sugerir_match_movimiento`. El RPC original sugiere CFDIs
-- desde un movimiento; este sugiere movimientos desde un CFDI.
--
-- Útil en la pantalla de detalle del CFDI cuando el saldo > 0: muestra
-- panel "Posibles pagos detectados" con candidatos del extracto bancario
-- y permite vincular con un click.
-- ============================================================================

CREATE OR REPLACE FUNCTION sugerir_movimientos_para_cfdi(p_cfdi_id UUID)
RETURNS TABLE (
  movimiento_id UUID,
  cuenta_id UUID,
  cuenta_alias TEXT,
  fecha DATE,
  concepto TEXT,
  monto NUMERIC,
  tipo TEXT, -- cargo o abono
  similitud NUMERIC
)
LANGUAGE plpgsql STABLE
AS $$
DECLARE
  v_total NUMERIC;
  v_monto_pagado NUMERIC;
  v_saldo NUMERIC;
  v_fecha DATE;
  v_empresa_id UUID;
  v_es_emitido BOOLEAN;
BEGIN
  SELECT c.total, COALESCE(c.monto_pagado, 0), c.fecha_emision::DATE, c.empresa_id, c.es_emitido
    INTO v_total, v_monto_pagado, v_fecha, v_empresa_id, v_es_emitido
  FROM cfdi c
  WHERE c.id = p_cfdi_id;

  IF v_total IS NULL THEN
    RETURN;
  END IF;

  v_saldo := v_total - v_monto_pagado;
  IF v_saldo < 0.50 THEN
    RETURN;  -- Ya está totalmente pagado, no hay nada que sugerir.
  END IF;

  RETURN QUERY
    SELECT
      m.id AS movimiento_id,
      m.cuenta_id,
      COALESCE(bc.alias, bc.banco || ' ' || bc.numero_cuenta) AS cuenta_alias,
      m.fecha,
      m.concepto::TEXT,
      m.monto,
      m.tipo::TEXT,
      (1.0 - LEAST(ABS(ABS(m.monto) - v_saldo) / GREATEST(v_saldo, 1), 1))::NUMERIC
        AS similitud
    FROM bancos_movimientos m
    JOIN bancos_cuentas bc ON bc.id = m.cuenta_id
    WHERE bc.empresa_id = v_empresa_id
      AND m.conciliado = FALSE
      -- CFDI emitido (ingreso para nosotros) → abono en banco.
      -- CFDI recibido (egreso para nosotros) → cargo en banco.
      AND m.tipo = (CASE WHEN v_es_emitido THEN 'abono' ELSE 'cargo' END)
      -- Monto similar (±5% o ±$5 absoluto)
      AND ABS(ABS(m.monto) - v_saldo) <= GREATEST(v_saldo * 0.05, 5.0)
      -- Ventana de fecha amplia: pagos típicos llegan en 0-60 días tras emisión
      AND m.fecha BETWEEN (v_fecha - INTERVAL '15 days')
                     AND (v_fecha + INTERVAL '90 days')
    ORDER BY similitud DESC, ABS(m.fecha - v_fecha)
    LIMIT 5;
END;
$$;

COMMENT ON FUNCTION sugerir_movimientos_para_cfdi IS
  'Para un CFDI con saldo pendiente, devuelve hasta 5 movimientos '
  'bancarios candidatos (mismo empresa, monto ±5%, tipo cargo/abono '
  'correcto, fecha razonable). Inversa de sugerir_match_movimiento.';
