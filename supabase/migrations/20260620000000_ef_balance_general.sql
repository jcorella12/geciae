-- ============================================================================
-- Sprint EF.1 — Balance General desde ERP (Estados Gerenciales)
-- ============================================================================
-- NO oficiales fiscalmente. Capa generada desde datos del ERP en tiempo real
-- para complementar PDFs del despacho. Acceso restringido a CEO + contralor +
-- tesorero_corporativo (mismo perfil que Sprint S - ajustes_gerenciales).
--
-- Este script construye:
--   1. Snapshots opcionales (cache mensual)
--   2. Helper de permisos
--   3. Vistas auxiliares: CxC por antigüedad, CxP, valor en libros de
--      vehículos y activos del grupo, saldos bancarios actuales
--   4. Función calcular_balance_general(empresa_id, fecha_corte)
--   5. Función balance_drill_down(empresa_id, categoria, fecha_corte)
-- ============================================================================

-- 1. Snapshots
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS balance_gerencial_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID REFERENCES empresas(id) ON DELETE CASCADE,
  fecha_corte DATE NOT NULL,
  generado_at TIMESTAMPTZ DEFAULT NOW(),
  generado_por UUID REFERENCES auth.users(id),
  payload JSONB NOT NULL,
  UNIQUE(empresa_id, fecha_corte)
);

CREATE INDEX IF NOT EXISTS idx_bgs_empresa_fecha
  ON balance_gerencial_snapshots(empresa_id, fecha_corte DESC);

ALTER TABLE balance_gerencial_snapshots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS bgs_select ON balance_gerencial_snapshots;
DROP POLICY IF EXISTS bgs_insert ON balance_gerencial_snapshots;

-- 2. Helper de permisos
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION usuario_puede_ver_estados_gerenciales()
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER AS $$
  SELECT
    usuario_es_ceo()
    OR usuario_tiene_atributo('contralor')
    OR usuario_tiene_atributo('tesorero_corporativo');
$$;

CREATE POLICY bgs_select ON balance_gerencial_snapshots FOR SELECT TO authenticated
  USING (usuario_puede_ver_estados_gerenciales());

CREATE POLICY bgs_insert ON balance_gerencial_snapshots FOR INSERT TO authenticated
  WITH CHECK (
    usuario_puede_ver_estados_gerenciales()
    AND generado_por = auth.uid()
  );

-- 3. Vista: CxC por antigüedad
-- ----------------------------------------------------------------------------
-- Schema real: cfdi.tipo enum tipo_cfdi ('ingreso'|'egreso'),
--   cfdi.es_emitido (TRUE = emitido por el grupo), cfdi.empresa_id,
--   cfdi.estado enum estado_cfdi ('borrador'|'timbrado'|'enviado_cliente'|'pagado'|'cancelado'),
--   cfdi_pagos.cfdi_pagado_id (FK al CFDI ingreso pagado), cfdi_pagos.monto.
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
    AND c.estado IN ('timbrado', 'enviado_cliente', 'pagado')
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

-- 4. Vista: CxP pendientes
-- ----------------------------------------------------------------------------
-- CFDIs de Ingreso recibidos por nosotros (es_emitido=FALSE) representan
-- gastos que debemos pagar.
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
    AND c.estado IN ('timbrado', 'enviado_cliente', 'pagado')
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

-- 5. Vista: valor en libros de vehículos
-- ----------------------------------------------------------------------------
-- Schema: vehiculos.estatus = 'activo' (no `activo` boolean).
-- vida_util_anios y valor_residual_pct no están en la tabla vehiculos —
-- usamos defaults razonables (8 años, 10% residual).
CREATE OR REPLACE VIEW v_vehiculos_valor_libros AS
SELECT
  v.id, v.empresa_id, v.placa, v.marca, v.modelo,
  v.costo_adquisicion,
  8 AS vida_util_anios,
  10 AS valor_residual_pct,
  v.fecha_adquisicion,
  CASE
    WHEN v.fecha_adquisicion IS NULL OR v.costo_adquisicion IS NULL THEN
      COALESCE(v.costo_adquisicion, 0)
    ELSE
      GREATEST(
        v.costo_adquisicion * 0.10,
        v.costo_adquisicion - (
          v.costo_adquisicion * 0.90 *
          LEAST(EXTRACT(YEAR FROM AGE(CURRENT_DATE, v.fecha_adquisicion)), 8) / 8
        )
      )
  END AS valor_en_libros,
  CASE
    WHEN v.fecha_adquisicion IS NULL OR v.costo_adquisicion IS NULL THEN 0
    ELSE
      v.costo_adquisicion * 0.90 *
      LEAST(EXTRACT(YEAR FROM AGE(CURRENT_DATE, v.fecha_adquisicion)), 8) / 8
  END AS depreciacion_acumulada
FROM vehiculos v
WHERE v.estatus = 'activo';

-- 6. Vista: valor en libros de activos del grupo
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW v_activos_grupo_valor_libros AS
SELECT
  a.id,
  a.empresa_propietaria_id AS empresa_id,
  a.codigo,
  a.nombre,
  a.costo_adquisicion,
  a.vida_util_anios,
  a.valor_residual_pct,
  a.fecha_adquisicion,
  GREATEST(
    a.costo_adquisicion * (a.valor_residual_pct / 100),
    a.costo_adquisicion - (
      a.costo_adquisicion * (1 - a.valor_residual_pct / 100) *
      LEAST(EXTRACT(YEAR FROM AGE(CURRENT_DATE, a.fecha_adquisicion)), a.vida_util_anios) /
      a.vida_util_anios
    )
  ) AS valor_en_libros
FROM activos_grupo a
WHERE a.activo = TRUE;

-- 7. Vista: saldos actuales en bancos
-- ----------------------------------------------------------------------------
-- Schema real: bancos_cuentas.saldo_actual (campo directo). Si quieres derivarlo
-- de los movimientos, podemos ajustarlo más adelante.
CREATE OR REPLACE VIEW v_bancos_saldos_actuales AS
SELECT
  b.id,
  b.empresa_id,
  b.banco AS banco_nombre,
  COALESCE(b.alias, b.numero_cuenta) AS numero_cuenta_alias,
  COALESCE(b.moneda, 'MXN') AS moneda,
  COALESCE(b.saldo_actual, 0) AS saldo_actual
FROM bancos_cuentas b
WHERE b.activa = TRUE;

-- 8. FUNCIÓN PRINCIPAL: calcular Balance General
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION calcular_balance_general(
  p_empresa_id UUID,
  p_fecha_corte DATE DEFAULT CURRENT_DATE
)
RETURNS JSONB LANGUAGE plpgsql STABLE AS $$
DECLARE
  v_resultado JSONB;
BEGIN
  WITH activos_circ AS (
    SELECT
      COALESCE((
        SELECT SUM(saldo_actual)
        FROM v_bancos_saldos_actuales
        WHERE p_empresa_id IS NULL OR empresa_id = p_empresa_id
      ), 0) AS bancos,
      COALESCE((
        SELECT SUM(saldo)
        FROM v_cxc_por_antiguedad
        WHERE p_empresa_id IS NULL OR empresa_id = p_empresa_id
      ), 0) AS cxc,
      COALESCE((
        SELECT SUM(saldo)
        FROM v_cxc_por_antiguedad
        WHERE bucket_antiguedad IN ('60_90', 'mas_90')
          AND (p_empresa_id IS NULL OR empresa_id = p_empresa_id)
      ), 0) AS cxc_vencida,
      -- Inventario: stock × costo_promedio del producto
      COALESCE((
        SELECT SUM(i.stock * COALESCE(cp.costo_promedio, 0))
        FROM inventario i
        JOIN catalogo_productos cp ON cp.id = i.producto_id
        JOIN almacenes a ON a.id = i.almacen_id
        WHERE i.stock > 0
          AND (p_empresa_id IS NULL
               OR a.empresa_id = p_empresa_id
               OR cp.empresa_id = p_empresa_id)
      ), 0) AS inventario
  ),
  activos_fijos AS (
    SELECT
      COALESCE((
        SELECT SUM(valor_en_libros)
        FROM v_vehiculos_valor_libros
        WHERE p_empresa_id IS NULL OR empresa_id = p_empresa_id
      ), 0) AS vehiculos,
      COALESCE((
        SELECT SUM(valor_en_libros)
        FROM v_activos_grupo_valor_libros
        WHERE p_empresa_id IS NULL OR empresa_id = p_empresa_id
      ), 0) AS activos_grupo
  ),
  pasivos_corto AS (
    SELECT
      COALESCE((
        SELECT SUM(saldo)
        FROM v_cxp_pendientes
        WHERE p_empresa_id IS NULL OR empresa_id = p_empresa_id
      ), 0) AS cxp
  ),
  pasivos_largo AS (
    SELECT
      COALESCE((
        SELECT SUM(monto_utilizado)
        FROM lineas_credito_inter_co
        WHERE empresa_deudora_id = p_empresa_id
          AND p_empresa_id IS NOT NULL
      ), 0) AS creditos_inter_co
  )
  SELECT jsonb_build_object(
    'fecha_corte', p_fecha_corte,
    'empresa_id', p_empresa_id,
    'activos', jsonb_build_object(
      'circulantes', jsonb_build_object(
        'bancos', ac.bancos,
        'cxc_total', ac.cxc,
        'cxc_vencida', ac.cxc_vencida,
        'inventario', ac.inventario,
        'total', ac.bancos + ac.cxc + ac.inventario
      ),
      'fijos', jsonb_build_object(
        'vehiculos', af.vehiculos,
        'activos_grupo', af.activos_grupo,
        'total', af.vehiculos + af.activos_grupo
      ),
      'total', ac.bancos + ac.cxc + ac.inventario + af.vehiculos + af.activos_grupo
    ),
    'pasivos', jsonb_build_object(
      'corto_plazo', jsonb_build_object(
        'cxp', pc.cxp,
        'total', pc.cxp
      ),
      'largo_plazo', jsonb_build_object(
        'creditos_inter_co', pl.creditos_inter_co,
        'total', pl.creditos_inter_co
      ),
      'total', pc.cxp + pl.creditos_inter_co
    ),
    'capital', jsonb_build_object(
      'calculado',
        (ac.bancos + ac.cxc + ac.inventario + af.vehiculos + af.activos_grupo)
        - (pc.cxp + pl.creditos_inter_co)
    )
  ) INTO v_resultado
  FROM activos_circ ac, activos_fijos af, pasivos_corto pc, pasivos_largo pl;

  RETURN v_resultado;
END;
$$;

COMMENT ON FUNCTION calcular_balance_general IS
  'Balance General gerencial desde datos del ERP. NO oficial fiscalmente.';

-- 9. Función drill-down
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION balance_drill_down(
  p_empresa_id UUID,
  p_categoria TEXT,
  p_fecha_corte DATE DEFAULT CURRENT_DATE
)
RETURNS JSONB LANGUAGE plpgsql STABLE AS $$
DECLARE
  v_resultado JSONB;
BEGIN
  CASE p_categoria
    WHEN 'bancos' THEN
      SELECT jsonb_agg(jsonb_build_object(
        'cuenta', banco_nombre || ' ' || numero_cuenta_alias,
        'moneda', moneda,
        'saldo', saldo_actual
      ) ORDER BY saldo_actual DESC) INTO v_resultado
      FROM v_bancos_saldos_actuales
      WHERE p_empresa_id IS NULL OR empresa_id = p_empresa_id;

    WHEN 'cxc' THEN
      SELECT jsonb_agg(jsonb_build_object(
        'cliente_id', cliente_id,
        'folio', folio,
        'fecha', fecha,
        'total', monto_total,
        'pagado', monto_pagado,
        'saldo', saldo,
        'dias_antiguedad', dias_antiguedad,
        'bucket', bucket_antiguedad
      ) ORDER BY dias_antiguedad DESC) INTO v_resultado
      FROM v_cxc_por_antiguedad
      WHERE p_empresa_id IS NULL OR empresa_id = p_empresa_id;

    WHEN 'cxp' THEN
      SELECT jsonb_agg(jsonb_build_object(
        'proveedor_id', proveedor_id,
        'folio', folio,
        'fecha', fecha,
        'total', monto_total,
        'saldo', saldo,
        'dias_antiguedad', dias_antiguedad
      ) ORDER BY dias_antiguedad DESC) INTO v_resultado
      FROM v_cxp_pendientes
      WHERE p_empresa_id IS NULL OR empresa_id = p_empresa_id;

    WHEN 'vehiculos' THEN
      SELECT jsonb_agg(jsonb_build_object(
        'placa', placa,
        'marca', marca,
        'modelo', modelo,
        'costo_adquisicion', costo_adquisicion,
        'depreciacion_acum', depreciacion_acumulada,
        'valor_libros', valor_en_libros
      ) ORDER BY valor_en_libros DESC) INTO v_resultado
      FROM v_vehiculos_valor_libros
      WHERE p_empresa_id IS NULL OR empresa_id = p_empresa_id;

    WHEN 'activos_grupo' THEN
      SELECT jsonb_agg(jsonb_build_object(
        'codigo', codigo,
        'nombre', nombre,
        'costo_adquisicion', costo_adquisicion,
        'valor_libros', valor_en_libros
      ) ORDER BY valor_en_libros DESC) INTO v_resultado
      FROM v_activos_grupo_valor_libros
      WHERE p_empresa_id IS NULL OR empresa_id = p_empresa_id;

    WHEN 'inventario' THEN
      SELECT jsonb_agg(jsonb_build_object(
        'sku', cp.codigo,
        'descripcion', cp.nombre,
        'cantidad', i.stock,
        'costo_unitario', cp.costo_promedio,
        'valor_total', i.stock * COALESCE(cp.costo_promedio, 0)
      ) ORDER BY i.stock * COALESCE(cp.costo_promedio, 0) DESC) INTO v_resultado
      FROM inventario i
      JOIN catalogo_productos cp ON cp.id = i.producto_id
      JOIN almacenes a ON a.id = i.almacen_id
      WHERE i.stock > 0
        AND (p_empresa_id IS NULL
             OR a.empresa_id = p_empresa_id
             OR cp.empresa_id = p_empresa_id);

    ELSE
      v_resultado := '[]'::JSONB;
  END CASE;

  RETURN COALESCE(v_resultado, '[]'::JSONB);
END;
$$;

COMMENT ON FUNCTION balance_drill_down IS
  'Detalle por categoría del Balance gerencial: bancos, cxc, cxp, vehiculos, activos_grupo, inventario.';
