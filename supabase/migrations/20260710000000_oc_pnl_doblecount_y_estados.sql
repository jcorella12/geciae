-- ============================================================================
-- OC — fix doble conteo en P&L de proyecto + soporte de estados enviada/pagada
-- ============================================================================
-- BUG: una OC (u OT) con proyecto_id Y centro_id se contaba DOS VECES en el
-- costo del proyecto:
--   1) costos_oc / costos_ot suman ordenes_compra.total / ot.total por proyecto.
--   2) registrarMovimientoOC/OT crea un centros_movimientos gasto_directo CON
--      proyecto_id, que costos_centros volvía a sumar.
-- Fix: en las vistas de P&L, costos_centros excluye los movimientos derivados
-- de OC/OT (oc_id/ot_id NOT NULL) — esos ya están en costos_oc/costos_ot. Se
-- conservan los movimientos "puros" de centro (reparto_recibido, gasto manual,
-- gasto recurrente) que no se cuentan en otro lado.
--
-- Además: fecha_envio para registrar el milestone "enviada al proveedor"
-- (estado enviada). fecha_pago ya existe (milestone pagada).
-- ============================================================================

ALTER TABLE ordenes_compra ADD COLUMN IF NOT EXISTS fecha_envio DATE;

-- ----------------------------------------------------------------------------
-- v_proyecto_pnl_resumen — idéntica salvo el filtro en costos_centros.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW v_proyecto_pnl_resumen AS
WITH ingresos_proyecto AS (
  SELECT proyecto_id, SUM(total) AS facturado
  FROM cfdi
  WHERE proyecto_id IS NOT NULL
    AND tipo = 'ingreso'::tipo_cfdi
    AND es_emitido = TRUE
    AND estado IN ('timbrado'::estado_cfdi, 'enviado_cliente'::estado_cfdi, 'pagado'::estado_cfdi)
  GROUP BY proyecto_id
),
costos_oc AS (
  SELECT proyecto_id, SUM(total) AS costo_materiales_oc
  FROM ordenes_compra
  WHERE proyecto_id IS NOT NULL
    AND estado IN ('aprobada'::estado_oc, 'enviada'::estado_oc, 'parcial_recibida'::estado_oc, 'recibida'::estado_oc, 'pagada'::estado_oc)
  GROUP BY proyecto_id
),
costos_ot AS (
  SELECT proyecto_id, SUM(total) AS costo_ot
  FROM ordenes_trabajo_inter_co
  WHERE proyecto_id IS NOT NULL
    AND estado IN ('aprobada'::estado_ot, 'completada_origen'::estado_ot, 'confirmada_destino'::estado_ot, 'facturada'::estado_ot, 'cobrada'::estado_ot)
  GROUP BY proyecto_id
),
costos_centros AS (
  SELECT proyecto_id,
         SUM(CASE WHEN tipo IN ('gasto_directo'::tipo_movimiento_centro, 'reparto_recibido'::tipo_movimiento_centro) THEN monto ELSE 0 END) AS costos_via_centros
  FROM centros_movimientos
  WHERE proyecto_id IS NOT NULL
    AND oc_id IS NULL   -- ya contado en costos_oc (evita doble conteo)
    AND ot_id IS NULL   -- ya contado en costos_ot (evita doble conteo)
  GROUP BY proyecto_id
),
costos_levantamientos AS (
  SELECT proyecto_destino_id AS proyecto_id, SUM(costo_calculado) AS costo_levantamientos
  FROM levantamientos
  WHERE proyecto_destino_id IS NOT NULL
    AND estado = 'convertido_a_venta'
  GROUP BY proyecto_destino_id
),
costos_horas AS (
  SELECT proyecto_id,
         SUM(CASE WHEN tipo = 'ingenieria_propia'::tipo_hora_trabajada THEN costo_calculado ELSE 0 END) AS costo_horas_ingenieria,
         SUM(CASE WHEN tipo = 'campo_estimado'::tipo_hora_trabajada THEN costo_calculado ELSE 0 END) AS costo_horas_campo
  FROM proyecto_horas_trabajadas
  GROUP BY proyecto_id
),
costos_imputados AS (
  SELECT proyecto_id,
         SUM(CASE WHEN categoria = 'garantia_provision'::categoria_costo_proyecto THEN monto ELSE 0 END) AS provision_garantia,
         SUM(CASE WHEN categoria != 'garantia_provision'::categoria_costo_proyecto THEN monto ELSE 0 END) AS otros_imputados
  FROM proyecto_costos_imputados
  WHERE activo = TRUE
  GROUP BY proyecto_id
)
SELECT
  p.id AS proyecto_id,
  p.codigo, p.nombre, p.empresa_id, p.estado, p.cliente_id,

  pp.ingreso_total AS ingreso_presupuestado,
  COALESCE(pp.presupuesto_materiales, 0) AS presupuesto_materiales,
  COALESCE(pp.presupuesto_mano_obra_ingenieria, 0) AS presupuesto_ing,
  COALESCE(pp.presupuesto_mano_obra_campo, 0) AS presupuesto_campo,
  COALESCE(pp.presupuesto_subcontratos, 0) AS presupuesto_subcontratos,
  COALESCE(pp.presupuesto_indirectos, 0) AS presupuesto_indirectos,
  COALESCE(pp.margen_objetivo_pct, 0) AS margen_objetivo_pct,

  COALESCE(ip.facturado, 0) AS ingreso_facturado,
  COALESCE(pp.ingreso_total, 0) - COALESCE(ip.facturado, 0) AS ingreso_por_facturar,

  COALESCE(co.costo_materiales_oc, 0) AS costo_materiales_oc,
  COALESCE(cot.costo_ot, 0) AS costo_subcontratos,
  COALESCE(ch.costo_horas_ingenieria, 0) AS costo_horas_ingenieria,
  COALESCE(ch.costo_horas_campo, 0) AS costo_horas_campo,
  COALESCE(cl.costo_levantamientos, 0) AS costo_levantamientos,

  COALESCE(co.costo_materiales_oc, 0)
    + COALESCE(cot.costo_ot, 0)
    + COALESCE(ch.costo_horas_ingenieria, 0)
    + COALESCE(ch.costo_horas_campo, 0)
    + COALESCE(cl.costo_levantamientos, 0) AS costos_directos_total,

  COALESCE(cc.costos_via_centros, 0) AS costos_indirectos_centros,
  COALESCE(cim.provision_garantia, 0) AS provision_garantia,
  COALESCE(cim.otros_imputados, 0) AS otros_imputados,
  COALESCE(cc.costos_via_centros, 0) + COALESCE(cim.provision_garantia, 0)
    + COALESCE(cim.otros_imputados, 0) AS costos_indirectos_total,

  COALESCE(co.costo_materiales_oc, 0) + COALESCE(cot.costo_ot, 0)
    + COALESCE(ch.costo_horas_ingenieria, 0) + COALESCE(ch.costo_horas_campo, 0)
    + COALESCE(cl.costo_levantamientos, 0) + COALESCE(cc.costos_via_centros, 0)
    + COALESCE(cim.provision_garantia, 0) + COALESCE(cim.otros_imputados, 0)
    AS costos_totales,

  COALESCE(pp.ingreso_total, 0)
    - (COALESCE(co.costo_materiales_oc, 0)
       + COALESCE(cot.costo_ot, 0) + COALESCE(ch.costo_horas_ingenieria, 0)
       + COALESCE(ch.costo_horas_campo, 0) + COALESCE(cl.costo_levantamientos, 0))
    AS margen_contribucion,

  COALESCE(pp.ingreso_total, 0)
    - (COALESCE(co.costo_materiales_oc, 0)
       + COALESCE(cot.costo_ot, 0) + COALESCE(ch.costo_horas_ingenieria, 0)
       + COALESCE(ch.costo_horas_campo, 0) + COALESCE(cl.costo_levantamientos, 0)
       + COALESCE(cc.costos_via_centros, 0) + COALESCE(cim.provision_garantia, 0)
       + COALESCE(cim.otros_imputados, 0))
    AS margen_neto

FROM proyectos p
LEFT JOIN proyecto_presupuesto pp ON pp.proyecto_id = p.id
LEFT JOIN ingresos_proyecto ip ON ip.proyecto_id = p.id
LEFT JOIN costos_oc co ON co.proyecto_id = p.id
LEFT JOIN costos_ot cot ON cot.proyecto_id = p.id
LEFT JOIN costos_centros cc ON cc.proyecto_id = p.id
LEFT JOIN costos_levantamientos cl ON cl.proyecto_id = p.id
LEFT JOIN costos_horas ch ON ch.proyecto_id = p.id
LEFT JOIN costos_imputados cim ON cim.proyecto_id = p.id;

-- ----------------------------------------------------------------------------
-- v_proyecto_pnl_detalle — idéntica salvo el filtro en la fuente 'centro'.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW v_proyecto_pnl_detalle AS
SELECT 'oc'::TEXT AS fuente, oc.proyecto_id, oc.fecha_emision AS fecha,
       'materiales'::categoria_costo_proyecto AS categoria,
       oc.numero AS referencia, COALESCE(oc.comentarios, 'OC ' || oc.numero) AS descripcion,
       oc.total AS monto
FROM ordenes_compra oc
WHERE oc.proyecto_id IS NOT NULL
  AND oc.estado IN ('aprobada'::estado_oc, 'enviada'::estado_oc, 'parcial_recibida'::estado_oc, 'recibida'::estado_oc, 'pagada'::estado_oc)

UNION ALL
SELECT 'ot'::TEXT, ot.proyecto_id, ot.fecha_solicitud,
       'subcontratos'::categoria_costo_proyecto, ot.numero,
       ot.descripcion, ot.total
FROM ordenes_trabajo_inter_co ot
WHERE ot.proyecto_id IS NOT NULL
  AND ot.estado IN ('aprobada'::estado_ot, 'completada_origen'::estado_ot, 'confirmada_destino'::estado_ot, 'facturada'::estado_ot, 'cobrada'::estado_ot)

UNION ALL
SELECT 'horas'::TEXT, ph.proyecto_id, ph.semana_inicio,
       (CASE ph.tipo WHEN 'ingenieria_propia' THEN 'mano_obra_ingenieria'
                     ELSE 'mano_obra_campo' END)::categoria_costo_proyecto,
       ph.semana_inicio::TEXT,
       (CASE ph.tipo WHEN 'ingenieria_propia' THEN 'Horas ingeniería: ' || ph.horas
                     ELSE 'Horas campo: ' || COALESCE(ph.cuadrilla_descripcion, '') END),
       ph.costo_calculado
FROM proyecto_horas_trabajadas ph

UNION ALL
SELECT 'imp'::TEXT, ci.proyecto_id, ci.fecha,
       ci.categoria, ci.tipo::TEXT, ci.concepto, ci.monto
FROM proyecto_costos_imputados ci
WHERE ci.activo = TRUE

UNION ALL
SELECT 'centro'::TEXT, cm.proyecto_id, cm.fecha,
       'indirectos_centros'::categoria_costo_proyecto, cm.tipo::TEXT,
       cm.concepto, cm.monto
FROM centros_movimientos cm
WHERE cm.proyecto_id IS NOT NULL
  AND cm.tipo IN ('gasto_directo'::tipo_movimiento_centro, 'reparto_recibido'::tipo_movimiento_centro)
  AND cm.oc_id IS NULL AND cm.ot_id IS NULL   -- evitar duplicar OC/OT ya listadas arriba

UNION ALL
SELECT 'cfdi'::TEXT, cfdi.proyecto_id, cfdi.fecha_emision::DATE,
       NULL::categoria_costo_proyecto, COALESCE(cfdi.folio, ''),
       'CFDI emitido a cliente', -cfdi.total
FROM cfdi
WHERE cfdi.proyecto_id IS NOT NULL AND cfdi.tipo = 'ingreso'::tipo_cfdi
  AND cfdi.es_emitido = TRUE
  AND cfdi.estado IN ('timbrado'::estado_cfdi, 'enviado_cliente'::estado_cfdi, 'pagado'::estado_cfdi);
