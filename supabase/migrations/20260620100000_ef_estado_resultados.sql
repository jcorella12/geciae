-- ============================================================================
-- Sprint EF.2 — Estado de Resultados desde ERP (Estados Gerenciales)
-- ============================================================================

-- 1. Vista: ingresos del período (CFDIs emitidos)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW v_ingresos_detalle AS
SELECT
  c.id AS cfdi_id,
  c.empresa_id,
  c.cliente_id,
  c.proyecto_id,
  c.fecha_emision::DATE AS fecha,
  c.total,
  c.subtotal,
  COALESCE(c.iva_trasladado, 0) AS iva_total,
  c.folio,
  c.uuid_sat
FROM cfdi c
WHERE c.tipo = 'ingreso'
  AND c.es_emitido = TRUE
  AND c.estado IN ('timbrado', 'enviado_cliente', 'pagado');

-- 2. Vista: costos directos del período (proyecto-imputados)
-- ----------------------------------------------------------------------------
-- Schema real: ordenes_compra.estado enum estado_oc con valores
-- 'aprobada','enviada','parcial_recibida','recibida','pagada' (no
-- 'recibida_total' ni 'cerrada'). ordenes_trabajo_inter_co.estado enum
-- estado_ot con 'aprobada','completada_origen','confirmada_destino',
-- 'facturada','cobrada'.
-- inventario_movimientos: tipo TEXT con 'salida_obra','salida_proyecto', etc.
CREATE OR REPLACE VIEW v_costos_directos_detalle AS
SELECT
  'oc'::TEXT AS fuente,
  oc.empresa_id,
  oc.proyecto_id,
  COALESCE(oc.fecha_aprobacion::DATE, oc.fecha_emision) AS fecha,
  oc.subtotal,
  oc.numero AS referencia,
  oc.id AS origen_id
FROM ordenes_compra oc
WHERE oc.estado IN ('aprobada', 'enviada', 'parcial_recibida', 'recibida', 'pagada')
  AND oc.proyecto_id IS NOT NULL

UNION ALL

SELECT
  'inv'::TEXT AS fuente,
  a.empresa_id,
  im.proyecto_id,
  COALESCE(im.fecha, im.created_at::DATE) AS fecha,
  COALESCE(im.cantidad * im.costo_unitario, im.monto_total, 0) AS subtotal,
  COALESCE(im.numero_documento, im.id::TEXT) AS referencia,
  im.id AS origen_id
FROM inventario_movimientos im
JOIN almacenes a ON a.id = im.almacen_id
WHERE im.tipo IN ('salida_obra', 'salida_proyecto')
  AND im.proyecto_id IS NOT NULL

UNION ALL

SELECT
  'ot'::TEXT AS fuente,
  ot.empresa_origen_id AS empresa_id,
  ot.proyecto_id,
  ot.fecha_solicitud AS fecha,
  ot.precio_inter_co AS subtotal,
  ot.numero AS referencia,
  ot.id AS origen_id
FROM ordenes_trabajo_inter_co ot
WHERE ot.estado IN ('aprobada', 'completada_origen', 'confirmada_destino', 'facturada', 'cobrada')
  AND ot.proyecto_id IS NOT NULL;

-- 3. Vista: gastos operativos (no atribuibles a proyecto)
-- ----------------------------------------------------------------------------
-- gastos_recurrentes tiene categoria enum categoria_gasto_recurrente y
-- frecuencia (mensual/bimestral/trimestral/semestral/anual). Para
-- estados gerenciales mensualizamos al monto efectivo del periodo.
CREATE OR REPLACE VIEW v_gastos_operativos_detalle AS
SELECT
  'oc_admin'::TEXT AS fuente,
  oc.empresa_id,
  COALESCE(oc.fecha_aprobacion::DATE, oc.fecha_emision) AS fecha,
  oc.subtotal AS monto,
  oc.numero AS referencia,
  COALESCE(oc.comentarios, '') AS descripcion,
  'gastos_admin'::TEXT AS categoria
FROM ordenes_compra oc
WHERE oc.estado IN ('aprobada', 'enviada', 'parcial_recibida', 'recibida', 'pagada')
  AND oc.proyecto_id IS NULL

UNION ALL

SELECT
  'recurrente'::TEXT AS fuente,
  gr.empresa_id,
  -- Usamos fecha_inicio como aproximación del periodo de devengo
  gr.fecha_inicio AS fecha,
  CASE COALESCE(gr.frecuencia::TEXT, 'mensual')
    WHEN 'mensual' THEN gr.monto
    WHEN 'bimestral' THEN gr.monto / 2
    WHEN 'trimestral' THEN gr.monto / 3
    WHEN 'semestral' THEN gr.monto / 6
    WHEN 'anual' THEN gr.monto / 12
    ELSE gr.monto
  END AS monto,
  gr.id::TEXT AS referencia,
  gr.descripcion,
  COALESCE(gr.categoria::TEXT, 'recurrente') AS categoria
FROM gastos_recurrentes gr
WHERE gr.activo = TRUE

UNION ALL

SELECT
  'reparto'::TEXT AS fuente,
  cm.empresa_id,
  cm.fecha,
  cm.monto,
  cm.id::TEXT AS referencia,
  cm.concepto AS descripcion,
  'reparto_indirectos'::TEXT AS categoria
FROM centros_movimientos cm
WHERE cm.tipo = 'reparto_recibido';

-- 4. Función principal: calcular Estado de Resultados
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION calcular_estado_resultados(
  p_empresa_id UUID,
  p_fecha_inicio DATE,
  p_fecha_fin DATE
)
RETURNS JSONB LANGUAGE plpgsql STABLE AS $$
DECLARE
  v_resultado JSONB;
BEGIN
  WITH ingresos AS (
    SELECT
      COALESCE(SUM(subtotal), 0) AS subtotal_ingresos,
      COALESCE(SUM(total), 0) AS total_ingresos,
      COUNT(*) AS num_cfdis
    FROM v_ingresos_detalle
    WHERE fecha BETWEEN p_fecha_inicio AND p_fecha_fin
      AND (p_empresa_id IS NULL OR empresa_id = p_empresa_id)
  ),
  costos AS (
    SELECT
      COALESCE(SUM(subtotal), 0) AS total_costos,
      COALESCE(SUM(subtotal) FILTER (WHERE fuente = 'oc'), 0) AS materiales,
      COALESCE(SUM(subtotal) FILTER (WHERE fuente = 'inv'), 0) AS inventario,
      COALESCE(SUM(subtotal) FILTER (WHERE fuente = 'ot'), 0) AS subcontratos
    FROM v_costos_directos_detalle
    WHERE fecha BETWEEN p_fecha_inicio AND p_fecha_fin
      AND (p_empresa_id IS NULL OR empresa_id = p_empresa_id)
  ),
  gastos AS (
    SELECT
      COALESCE(SUM(monto), 0) AS total_gastos,
      COALESCE(SUM(monto) FILTER (WHERE categoria = 'gastos_admin'), 0) AS admin,
      COALESCE(SUM(monto) FILTER (WHERE fuente = 'recurrente'), 0) AS recurrentes,
      COALESCE(SUM(monto) FILTER (WHERE categoria = 'reparto_indirectos'), 0) AS indirectos
    FROM v_gastos_operativos_detalle
    WHERE fecha BETWEEN p_fecha_inicio AND p_fecha_fin
      AND (p_empresa_id IS NULL OR empresa_id = p_empresa_id)
  )
  SELECT jsonb_build_object(
    'periodo', jsonb_build_object(
      'inicio', p_fecha_inicio,
      'fin', p_fecha_fin
    ),
    'empresa_id', p_empresa_id,
    'ingresos', jsonb_build_object(
      'subtotal', i.subtotal_ingresos,
      'total', i.total_ingresos,
      'num_cfdis', i.num_cfdis
    ),
    'costo_ventas', jsonb_build_object(
      'materiales', c.materiales,
      'inventario_consumido', c.inventario,
      'subcontratos', c.subcontratos,
      'total', c.total_costos
    ),
    'utilidad_bruta', jsonb_build_object(
      'monto', i.subtotal_ingresos - c.total_costos,
      'pct',
        CASE WHEN i.subtotal_ingresos > 0
             THEN ((i.subtotal_ingresos - c.total_costos) / i.subtotal_ingresos * 100)
             ELSE 0 END
    ),
    'gastos_operativos', jsonb_build_object(
      'admin', g.admin,
      'recurrentes', g.recurrentes,
      'indirectos', g.indirectos,
      'total', g.total_gastos
    ),
    'utilidad_operativa', jsonb_build_object(
      'monto', i.subtotal_ingresos - c.total_costos - g.total_gastos,
      'pct',
        CASE WHEN i.subtotal_ingresos > 0
             THEN ((i.subtotal_ingresos - c.total_costos - g.total_gastos) / i.subtotal_ingresos * 100)
             ELSE 0 END
    )
  ) INTO v_resultado
  FROM ingresos i, costos c, gastos g;

  RETURN v_resultado;
END;
$$;

COMMENT ON FUNCTION calcular_estado_resultados IS
  'Estado de Resultados gerencial desde el ERP. Aproximación, NO oficial fiscalmente.';

-- 5. Función comparativo de períodos
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION comparar_resultados_periodos(
  p_empresa_id UUID,
  p_fecha_inicio_actual DATE,
  p_fecha_fin_actual DATE,
  p_fecha_inicio_anterior DATE,
  p_fecha_fin_anterior DATE
)
RETURNS JSONB LANGUAGE plpgsql STABLE AS $$
DECLARE
  v_actual JSONB;
  v_anterior JSONB;
BEGIN
  v_actual := calcular_estado_resultados(p_empresa_id, p_fecha_inicio_actual, p_fecha_fin_actual);
  v_anterior := calcular_estado_resultados(p_empresa_id, p_fecha_inicio_anterior, p_fecha_fin_anterior);

  RETURN jsonb_build_object(
    'actual', v_actual,
    'anterior', v_anterior,
    'variaciones', jsonb_build_object(
      'ingresos_pct',
        CASE WHEN (v_anterior->'ingresos'->>'subtotal')::NUMERIC > 0
             THEN (((v_actual->'ingresos'->>'subtotal')::NUMERIC -
                    (v_anterior->'ingresos'->>'subtotal')::NUMERIC) /
                   (v_anterior->'ingresos'->>'subtotal')::NUMERIC * 100)
             ELSE 0 END,
      'costos_pct',
        CASE WHEN (v_anterior->'costo_ventas'->>'total')::NUMERIC > 0
             THEN (((v_actual->'costo_ventas'->>'total')::NUMERIC -
                    (v_anterior->'costo_ventas'->>'total')::NUMERIC) /
                   (v_anterior->'costo_ventas'->>'total')::NUMERIC * 100)
             ELSE 0 END,
      'utilidad_neta_pct',
        CASE WHEN (v_anterior->'utilidad_operativa'->>'monto')::NUMERIC <> 0
             THEN (((v_actual->'utilidad_operativa'->>'monto')::NUMERIC -
                    (v_anterior->'utilidad_operativa'->>'monto')::NUMERIC) /
                   ABS((v_anterior->'utilidad_operativa'->>'monto')::NUMERIC) * 100)
             ELSE 0 END
    )
  );
END;
$$;

-- 6. Función drill-down
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION resultados_drill_down(
  p_empresa_id UUID,
  p_categoria TEXT,
  p_fecha_inicio DATE,
  p_fecha_fin DATE
)
RETURNS JSONB LANGUAGE plpgsql STABLE AS $$
DECLARE
  v_resultado JSONB;
BEGIN
  CASE p_categoria
    WHEN 'ingresos' THEN
      SELECT jsonb_agg(jsonb_build_object(
        'cliente_id', cliente_id,
        'folio', folio,
        'fecha', fecha,
        'subtotal', subtotal,
        'iva', iva_total,
        'total', total
      ) ORDER BY fecha DESC) INTO v_resultado
      FROM v_ingresos_detalle
      WHERE fecha BETWEEN p_fecha_inicio AND p_fecha_fin
        AND (p_empresa_id IS NULL OR empresa_id = p_empresa_id);

    WHEN 'costo_ventas' THEN
      SELECT jsonb_agg(jsonb_build_object(
        'fuente', fuente,
        'proyecto_id', proyecto_id,
        'fecha', fecha,
        'subtotal', subtotal,
        'referencia', referencia
      ) ORDER BY fecha DESC) INTO v_resultado
      FROM v_costos_directos_detalle
      WHERE fecha BETWEEN p_fecha_inicio AND p_fecha_fin
        AND (p_empresa_id IS NULL OR empresa_id = p_empresa_id);

    WHEN 'gastos' THEN
      SELECT jsonb_agg(jsonb_build_object(
        'fuente', fuente,
        'fecha', fecha,
        'monto', monto,
        'referencia', referencia,
        'descripcion', descripcion,
        'categoria', categoria
      ) ORDER BY fecha DESC) INTO v_resultado
      FROM v_gastos_operativos_detalle
      WHERE fecha BETWEEN p_fecha_inicio AND p_fecha_fin
        AND (p_empresa_id IS NULL OR empresa_id = p_empresa_id);

    ELSE
      v_resultado := '[]'::JSONB;
  END CASE;

  RETURN COALESCE(v_resultado, '[]'::JSONB);
END;
$$;
