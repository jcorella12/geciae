-- ============================================================================
-- Sprint EF.3 — Flujo de Efectivo desde ERP
-- ============================================================================
-- Schema real: bancos_movimientos.tipo TEXT con valores 'abono'|'cargo'
-- (no 'entrada'|'salida'). El monto puede venir signed (cargos negativos)
-- o no — usamos ABS para clasificar y el tipo para signo.
-- ============================================================================

-- 1. Vista: movimientos clasificados
CREATE OR REPLACE VIEW v_movimientos_clasificados AS
SELECT
  bm.id,
  bm.cuenta_id,
  bc.empresa_id,
  bm.fecha,
  bm.tipo,                                       -- 'abono'|'cargo'
  ABS(bm.monto) AS monto_abs,
  bm.monto AS monto_signed,
  bm.concepto,
  bm.referencia,
  bm.cfdi_relacionado_id AS cfdi_id,
  bm.observaciones,
  CASE
    WHEN bm.tipo = 'abono' THEN 'entrada'
    WHEN bm.tipo = 'cargo' THEN 'salida'
    ELSE
      CASE WHEN bm.monto >= 0 THEN 'entrada' ELSE 'salida' END
  END AS direccion,
  CASE
    -- Entradas
    WHEN bm.tipo = 'abono' AND bm.cfdi_relacionado_id IS NOT NULL THEN 'cobro_cliente'
    WHEN bm.tipo = 'abono' AND (bm.concepto ILIKE '%spei recibido%' OR bm.concepto ILIKE '%transferencia%' OR bm.concepto ILIKE '%deposito de tercero%') THEN 'transferencia_recibida'
    WHEN bm.tipo = 'abono' AND bm.concepto ILIKE '%traspaso entre cuentas%' THEN 'traspaso_interno'
    WHEN bm.tipo = 'abono' THEN 'entrada_otra'
    -- Salidas
    WHEN bm.tipo = 'cargo' AND bm.cfdi_relacionado_id IS NOT NULL THEN 'pago_proveedor'
    WHEN bm.tipo = 'cargo' AND bm.concepto ILIKE '%nomina%' THEN 'nomina'
    WHEN bm.tipo = 'cargo' AND (
      bm.concepto ILIKE '%imss%' OR bm.concepto ILIKE '%infonavit%' OR
      bm.concepto ILIKE '%afore%'
    ) THEN 'nomina'
    WHEN bm.tipo = 'cargo' AND (
      bm.concepto ILIKE '%sat%' OR bm.concepto ILIKE '%hacienda%' OR
      bm.concepto ILIKE '%impuesto%' OR bm.concepto ILIKE '%iva%' OR
      bm.concepto ILIKE '%isr%'
    ) THEN 'impuestos'
    WHEN bm.tipo = 'cargo' AND (
      bm.concepto ILIKE '%servicio%' OR bm.concepto ILIKE '%telmex%' OR
      bm.concepto ILIKE '%cfe%' OR bm.concepto ILIKE '%agua%'
    ) THEN 'servicios'
    WHEN bm.tipo = 'cargo' AND bm.concepto ILIKE '%spei enviado%' THEN 'transferencia_emitida'
    WHEN bm.tipo = 'cargo' AND bm.concepto ILIKE '%traspaso entre cuentas%' THEN 'traspaso_interno'
    WHEN bm.tipo = 'cargo' AND (
      bm.concepto ILIKE '%comision%' OR bm.concepto ILIKE '%serv banca%' OR
      bm.concepto ILIKE '%iva com%'
    ) THEN 'comisiones_banco'
    WHEN bm.tipo = 'cargo' THEN 'salida_otra'
    ELSE 'sin_clasificar'
  END AS categoria
FROM bancos_movimientos bm
JOIN bancos_cuentas bc ON bc.id = bm.cuenta_id;

-- 2. Función principal: calcular Flujo de Efectivo
CREATE OR REPLACE FUNCTION calcular_flujo_efectivo(
  p_empresa_id UUID,
  p_fecha_inicio DATE,
  p_fecha_fin DATE
)
RETURNS JSONB LANGUAGE plpgsql STABLE AS $$
DECLARE
  v_saldo_inicial NUMERIC := 0;
  v_resultado JSONB;
BEGIN
  -- Saldo inicial: saldo_resultante del último movimiento ANTES de p_fecha_inicio
  SELECT COALESCE(SUM(saldo), 0) INTO v_saldo_inicial
  FROM (
    SELECT DISTINCT ON (bm.cuenta_id)
      COALESCE(bm.saldo_resultante, 0) AS saldo
    FROM bancos_movimientos bm
    JOIN bancos_cuentas bc ON bc.id = bm.cuenta_id
    WHERE bm.fecha < p_fecha_inicio
      AND (p_empresa_id IS NULL OR bc.empresa_id = p_empresa_id)
    ORDER BY bm.cuenta_id, bm.fecha DESC, bm.created_at DESC
  ) sub;

  WITH movimientos AS (
    SELECT * FROM v_movimientos_clasificados
    WHERE fecha BETWEEN p_fecha_inicio AND p_fecha_fin
      AND (p_empresa_id IS NULL OR empresa_id = p_empresa_id)
      AND categoria != 'traspaso_interno'  -- excluir traspasos entre cuentas propias
  ),
  entradas AS (
    SELECT
      COALESCE(SUM(monto_abs), 0) AS total_entradas,
      COALESCE(SUM(monto_abs) FILTER (WHERE categoria = 'cobro_cliente'), 0) AS cobros_clientes,
      COALESCE(SUM(monto_abs) FILTER (WHERE categoria = 'transferencia_recibida'), 0) AS transferencias,
      COALESCE(SUM(monto_abs) FILTER (WHERE categoria = 'entrada_otra'), 0) AS otras
    FROM movimientos
    WHERE direccion = 'entrada'
  ),
  salidas AS (
    SELECT
      COALESCE(SUM(monto_abs), 0) AS total_salidas,
      COALESCE(SUM(monto_abs) FILTER (WHERE categoria = 'pago_proveedor'), 0) AS pagos_proveedores,
      COALESCE(SUM(monto_abs) FILTER (WHERE categoria = 'nomina'), 0) AS nomina,
      COALESCE(SUM(monto_abs) FILTER (WHERE categoria = 'impuestos'), 0) AS impuestos,
      COALESCE(SUM(monto_abs) FILTER (WHERE categoria = 'servicios'), 0) AS servicios,
      COALESCE(SUM(monto_abs) FILTER (WHERE categoria = 'transferencia_emitida'), 0) AS transferencias,
      COALESCE(SUM(monto_abs) FILTER (WHERE categoria = 'comisiones_banco'), 0) AS comisiones,
      COALESCE(SUM(monto_abs) FILTER (WHERE categoria = 'salida_otra'), 0) AS otras
    FROM movimientos
    WHERE direccion = 'salida'
  )
  SELECT jsonb_build_object(
    'periodo', jsonb_build_object('inicio', p_fecha_inicio, 'fin', p_fecha_fin),
    'empresa_id', p_empresa_id,
    'saldo_inicial', v_saldo_inicial,
    'entradas', jsonb_build_object(
      'cobros_clientes', e.cobros_clientes,
      'transferencias', e.transferencias,
      'otras', e.otras,
      'total', e.total_entradas
    ),
    'salidas', jsonb_build_object(
      'pagos_proveedores', s.pagos_proveedores,
      'nomina', s.nomina,
      'impuestos', s.impuestos,
      'servicios', s.servicios,
      'transferencias', s.transferencias,
      'comisiones_banco', s.comisiones,
      'otras', s.otras,
      'total', s.total_salidas
    ),
    'flujo_neto', e.total_entradas - s.total_salidas,
    'saldo_final', v_saldo_inicial + (e.total_entradas - s.total_salidas)
  ) INTO v_resultado
  FROM entradas e, salidas s;

  RETURN v_resultado;
END;
$$;

COMMENT ON FUNCTION calcular_flujo_efectivo IS
  'Flujo de efectivo gerencial desde bancos_movimientos clasificados.';

-- 3. Función drill-down de flujo
CREATE OR REPLACE FUNCTION flujo_drill_down(
  p_empresa_id UUID,
  p_categoria TEXT,
  p_fecha_inicio DATE,
  p_fecha_fin DATE
)
RETURNS JSONB LANGUAGE plpgsql STABLE AS $$
DECLARE
  v_resultado JSONB;
BEGIN
  SELECT jsonb_agg(jsonb_build_object(
    'fecha', fecha,
    'concepto', concepto,
    'referencia', referencia,
    'monto', monto_abs,
    'direccion', direccion,
    'categoria', categoria
  ) ORDER BY fecha DESC) INTO v_resultado
  FROM v_movimientos_clasificados
  WHERE fecha BETWEEN p_fecha_inicio AND p_fecha_fin
    AND (p_empresa_id IS NULL OR empresa_id = p_empresa_id)
    AND categoria = p_categoria;

  RETURN COALESCE(v_resultado, '[]'::JSONB);
END;
$$;

-- 4. Proyección de flujo próximas N semanas
-- ----------------------------------------------------------------------------
-- Aproximación basada en CxC y CxP existentes distribuidas en el horizonte.
-- Es heurística — el usuario debería refinar al confirmar fechas reales de
-- cobro/pago.
CREATE OR REPLACE FUNCTION proyeccion_flujo_proximas_semanas(
  p_empresa_id UUID,
  p_semanas INTEGER DEFAULT 8
)
RETURNS JSONB LANGUAGE plpgsql STABLE AS $$
DECLARE
  v_resultado JSONB;
  v_saldo_actual NUMERIC;
  v_total_cxc NUMERIC;
  v_total_cxp NUMERIC;
BEGIN
  SELECT COALESCE(SUM(saldo_actual), 0) INTO v_saldo_actual
  FROM v_bancos_saldos_actuales
  WHERE p_empresa_id IS NULL OR empresa_id = p_empresa_id;

  SELECT COALESCE(SUM(saldo), 0) INTO v_total_cxc
  FROM v_cxc_por_antiguedad
  WHERE p_empresa_id IS NULL OR empresa_id = p_empresa_id;

  SELECT COALESCE(SUM(saldo), 0) INTO v_total_cxp
  FROM v_cxp_pendientes
  WHERE p_empresa_id IS NULL OR empresa_id = p_empresa_id;

  WITH semanas AS (
    SELECT generate_series(0, p_semanas - 1) AS n
  ),
  proyeccion AS (
    SELECT
      n,
      (DATE_TRUNC('week', CURRENT_DATE) + (n * INTERVAL '7 days'))::DATE AS semana_inicio,
      (DATE_TRUNC('week', CURRENT_DATE) + (n * INTERVAL '7 days') + INTERVAL '6 days')::DATE AS semana_fin,
      (v_total_cxc / GREATEST(p_semanas, 1)) AS cobros_esperados,
      (v_total_cxp / GREATEST(p_semanas, 1)) AS pagos_planeados
    FROM semanas
  ),
  proyeccion_acum AS (
    SELECT
      n, semana_inicio, semana_fin, cobros_esperados, pagos_planeados,
      cobros_esperados - pagos_planeados AS flujo_neto,
      v_saldo_actual + SUM(cobros_esperados - pagos_planeados)
        OVER (ORDER BY n ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW)
        AS saldo_proyectado
    FROM proyeccion
  )
  SELECT jsonb_build_object(
    'saldo_actual', v_saldo_actual,
    'cxc_total', v_total_cxc,
    'cxp_total', v_total_cxp,
    'horizonte_semanas', p_semanas,
    'proyeccion', jsonb_agg(jsonb_build_object(
      'semana_n', n + 1,
      'inicio', semana_inicio,
      'fin', semana_fin,
      'cobros_esperados', cobros_esperados,
      'pagos_planeados', pagos_planeados,
      'flujo_neto', flujo_neto,
      'saldo_proyectado', saldo_proyectado,
      'riesgo', saldo_proyectado < 0
    ) ORDER BY n)
  ) INTO v_resultado
  FROM proyeccion_acum;

  RETURN v_resultado;
END;
$$;

COMMENT ON FUNCTION proyeccion_flujo_proximas_semanas IS
  'Proyección heurística de flujo de efectivo basada en CxC y CxP distribuidas en el horizonte.';
