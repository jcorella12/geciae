-- ============================================================================
-- Sprint 5.5.4 — Cierre mensual con allocation y funciones de cálculo
--
-- Funciones SQL para reparto + restricciones de no-modificación de cierres
-- ya cerrados.
-- ============================================================================

-- 1. Total de un centro en un mes (gastos directos + repartos recibidos)
CREATE OR REPLACE FUNCTION centro_total_mes(
  p_centro_id UUID,
  p_anio INTEGER,
  p_mes INTEGER
) RETURNS NUMERIC LANGUAGE sql STABLE AS $$
  SELECT COALESCE(SUM(monto), 0)::NUMERIC
  FROM centros_movimientos
  WHERE centro_id = p_centro_id
    AND EXTRACT(YEAR FROM fecha) = p_anio
    AND EXTRACT(MONTH FROM fecha) = p_mes
    AND tipo IN ('gasto_directo', 'reparto_recibido');
$$;

-- 2. # empleados activos por empresa en mes (usa nomina_empleados si existe)
CREATE OR REPLACE FUNCTION empleados_activos_empresa_mes(
  p_empresa_id UUID,
  p_anio INTEGER,
  p_mes INTEGER
) RETURNS INTEGER LANGUAGE plpgsql STABLE AS $$
DECLARE
  v_total INTEGER;
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'empleados') THEN
    EXECUTE format(
      'SELECT COUNT(*)::INTEGER FROM empleados WHERE empresa_id = %L AND activo = TRUE',
      p_empresa_id
    ) INTO v_total;
    RETURN COALESCE(v_total, 0);
  END IF;
  RETURN 0;
END;
$$;

-- 3. # proyectos activos por empresa en mes
CREATE OR REPLACE FUNCTION proyectos_activos_empresa_mes(
  p_empresa_id UUID,
  p_anio INTEGER,
  p_mes INTEGER
) RETURNS INTEGER LANGUAGE sql STABLE AS $$
  SELECT COUNT(*)::INTEGER
  FROM proyectos
  WHERE empresa_id = p_empresa_id
    AND activo = TRUE
    AND estado IN ('en_ejecucion', 'planeacion', 'contrato_firmado', 'en_cierre');
$$;

-- 4. Ingresos empresa en mes (ingreso_directo en cualquier CU + CFDIs cobrados)
CREATE OR REPLACE FUNCTION ingresos_empresa_mes(
  p_empresa_id UUID,
  p_anio INTEGER,
  p_mes INTEGER
) RETURNS NUMERIC LANGUAGE sql STABLE AS $$
  SELECT COALESCE(SUM(monto), 0)::NUMERIC
  FROM centros_movimientos cm
  WHERE cm.empresa_id = p_empresa_id
    AND cm.tipo = 'ingreso_directo'
    AND EXTRACT(YEAR FROM cm.fecha) = p_anio
    AND EXTRACT(MONTH FROM cm.fecha) = p_mes;
$$;

-- ============================================================================
-- Vista P&L por centro y mes (resumen para reportes rápidos)
-- ============================================================================

CREATE OR REPLACE VIEW v_centros_pnl AS
SELECT
  c.id AS centro_id,
  c.empresa_id,
  c.codigo,
  c.nombre,
  c.tipo,
  c.subtipo,
  EXTRACT(YEAR FROM cm.fecha)::INTEGER AS anio,
  EXTRACT(MONTH FROM cm.fecha)::INTEGER AS mes,
  COALESCE(SUM(CASE WHEN cm.tipo = 'gasto_directo' THEN cm.monto ELSE 0 END), 0) AS costos_directos,
  COALESCE(SUM(CASE WHEN cm.tipo = 'reparto_recibido' THEN cm.monto ELSE 0 END), 0) AS costos_compartidos,
  COALESCE(SUM(CASE WHEN cm.tipo = 'ingreso_directo' THEN cm.monto ELSE 0 END), 0) AS ingresos,
  COALESCE(SUM(CASE WHEN cm.tipo = 'reparto_emitido' THEN cm.monto ELSE 0 END), 0) AS repartos_emitidos,
  COALESCE(SUM(CASE WHEN cm.tipo = 'ingreso_directo' THEN cm.monto ELSE 0 END), 0)
    - COALESCE(SUM(CASE WHEN cm.tipo IN ('gasto_directo','reparto_recibido') THEN cm.monto ELSE 0 END), 0)
    AS resultado_neto
FROM centros c
LEFT JOIN centros_movimientos cm ON cm.centro_id = c.id
WHERE c.activo = TRUE
GROUP BY c.id, c.empresa_id, c.codigo, c.nombre, c.tipo, c.subtipo,
  EXTRACT(YEAR FROM cm.fecha), EXTRACT(MONTH FROM cm.fecha);

COMMENT ON VIEW v_centros_pnl IS
  'P&L mensual por centro: costos directos, costos compartidos recibidos, ingresos, repartos emitidos, resultado.';

-- ============================================================================
-- Vista reparto-por-mes: cuánto se le carga a cada empresa por cada CC compartido
-- ============================================================================

CREATE OR REPLACE VIEW v_centros_reparto_mensual AS
SELECT
  cm.empresa_id AS empresa_destino_id,
  cm_origen.centro_id AS centro_origen_id,
  c_origen.codigo AS centro_origen_codigo,
  c_origen.nombre AS centro_origen_nombre,
  c_origen.empresa_id AS empresa_origen_id,
  EXTRACT(YEAR FROM cm.fecha)::INTEGER AS anio,
  EXTRACT(MONTH FROM cm.fecha)::INTEGER AS mes,
  SUM(cm.monto) AS monto_recibido,
  cm.regla_reparto_id
FROM centros_movimientos cm
JOIN centros_movimientos cm_origen ON cm_origen.id = cm.origen_movimiento_id
JOIN centros c_origen ON c_origen.id = cm_origen.centro_id
WHERE cm.tipo = 'reparto_recibido'
GROUP BY cm.empresa_id, cm_origen.centro_id, c_origen.codigo, c_origen.nombre,
  c_origen.empresa_id, EXTRACT(YEAR FROM cm.fecha), EXTRACT(MONTH FROM cm.fecha),
  cm.regla_reparto_id;

COMMENT ON VIEW v_centros_reparto_mensual IS
  'Repartos recibidos por empresa destino: cuánto cargó cada CC compartido a cada empresa por mes.';

-- ============================================================================
-- Trigger: bloquear modificación de centros_movimientos cuando el cierre está cerrado
-- ============================================================================

CREATE OR REPLACE FUNCTION trg_centros_movimientos_no_modificar_cerrado()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_anio INTEGER;
  v_mes INTEGER;
  v_cerrado BOOLEAN;
BEGIN
  v_anio := EXTRACT(YEAR FROM COALESCE(NEW.fecha, OLD.fecha))::INTEGER;
  v_mes := EXTRACT(MONTH FROM COALESCE(NEW.fecha, OLD.fecha))::INTEGER;

  SELECT cerrado INTO v_cerrado
  FROM centros_cierres_mensuales
  WHERE empresa_id = COALESCE(NEW.empresa_id, OLD.empresa_id)
    AND anio = v_anio
    AND mes = v_mes;

  IF v_cerrado THEN
    RAISE EXCEPTION 'No se puede modificar movimientos de un mes ya cerrado (% / %). Reabrir primero el cierre.',
      v_mes, v_anio;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS tr_cm_no_modificar_cerrado_ins ON centros_movimientos;
CREATE TRIGGER tr_cm_no_modificar_cerrado_ins
  BEFORE INSERT OR UPDATE OR DELETE ON centros_movimientos
  FOR EACH ROW EXECUTE FUNCTION trg_centros_movimientos_no_modificar_cerrado();
