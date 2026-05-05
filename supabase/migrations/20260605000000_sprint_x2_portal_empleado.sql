-- ============================================================================
-- Sprint X.2 — Bonos manuales + Portal del Empleado consolidado
-- ============================================================================
-- - Tabla empleado_bonos_manuales: bonos en efectivo NO timbrados (con flag
--   timbrado=FALSE explícito) para que aparezcan en el portal del empleado
--   junto a sus recibos timbrados
-- - Función calcular_costo_prorrateado_capacitacion: divide costo de curso
--   entre asistentes
-- - Trigger: al modificar empleados_capacitaciones, recalcula costo_prorrateado
-- - 2 vistas: v_empleado_vehiculo_gasolina, v_empleado_compensacion_anual
-- - RLS estricto coherente con nomina_recibos
-- ============================================================================

-- 1. Enum tipo_bono_manual
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tipo_bono_manual') THEN
    CREATE TYPE tipo_bono_manual AS ENUM (
      'productividad',
      'puntualidad',
      'desempeno',
      'antiguedad',
      'evento_especial',
      'navidad',
      'otro'
    );
  END IF;
END$$;

-- 2. Tabla bonos manuales
CREATE TABLE IF NOT EXISTS empleado_bonos_manuales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id),
  empleado_id UUID NOT NULL REFERENCES empleados(id) ON DELETE CASCADE,
  fecha_pago DATE NOT NULL,
  tipo tipo_bono_manual NOT NULL,
  concepto TEXT NOT NULL,
  monto NUMERIC(10, 2) NOT NULL CHECK (monto > 0),
  motivo TEXT,
  autorizado_por UUID NOT NULL REFERENCES auth.users(id),
  comprobante_url TEXT,
  observaciones TEXT,
  -- Flag explícito: el sistema permite registrarlos pero los marca como
  -- no timbrados para visibilidad interna y auditoría.
  timbrado BOOLEAN DEFAULT FALSE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bonos_empleado_fecha
  ON empleado_bonos_manuales(empleado_id, fecha_pago DESC);
CREATE INDEX IF NOT EXISTS idx_bonos_empresa_fecha
  ON empleado_bonos_manuales(empresa_id, fecha_pago DESC);

CREATE TRIGGER trg_bonos_updated_at
  BEFORE UPDATE ON empleado_bonos_manuales
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- 3. Mejoras a empleados_capacitaciones para prorrateo
ALTER TABLE empleados_capacitaciones
  ADD COLUMN IF NOT EXISTS factura_url TEXT,
  ADD COLUMN IF NOT EXISTS costo_prorrateado NUMERIC(10, 2);

-- Función: calcula costo prorrateado para un curso+fecha entre asistentes
CREATE OR REPLACE FUNCTION calcular_costo_prorrateado_capacitacion(
  p_capacitacion_id UUID,
  p_fecha_referencia DATE
) RETURNS NUMERIC LANGUAGE plpgsql AS $$
DECLARE
  v_costo_total NUMERIC;
  v_num_asistentes INTEGER;
BEGIN
  SELECT costo INTO v_costo_total FROM capacitaciones WHERE id = p_capacitacion_id;
  IF v_costo_total IS NULL OR v_costo_total = 0 THEN
    RETURN 0;
  END IF;
  SELECT COUNT(*) INTO v_num_asistentes
  FROM empleados_capacitaciones
  WHERE capacitacion_id = p_capacitacion_id
    AND fecha_inicio = p_fecha_referencia;
  IF v_num_asistentes = 0 THEN
    RETURN v_costo_total;
  END IF;
  RETURN v_costo_total / v_num_asistentes;
END;
$$;

-- Trigger: recalcula costo_prorrateado cuando se agrega/quita asistente
CREATE OR REPLACE FUNCTION trg_recalcular_prorrateo_capacitacion()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  rec RECORD;
  v_capacitacion UUID;
  v_fecha DATE;
BEGIN
  v_capacitacion := COALESCE(NEW.capacitacion_id, OLD.capacitacion_id);
  v_fecha := COALESCE(NEW.fecha_inicio, OLD.fecha_inicio);
  IF v_capacitacion IS NULL OR v_fecha IS NULL THEN
    RETURN NEW;
  END IF;
  FOR rec IN SELECT id FROM empleados_capacitaciones
             WHERE capacitacion_id = v_capacitacion
               AND fecha_inicio = v_fecha
  LOOP
    UPDATE empleados_capacitaciones
    SET costo_prorrateado =
      calcular_costo_prorrateado_capacitacion(v_capacitacion, v_fecha)
    WHERE id = rec.id;
  END LOOP;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_capacitacion_prorrateo ON empleados_capacitaciones;
CREATE TRIGGER trg_capacitacion_prorrateo
  AFTER INSERT OR DELETE OR UPDATE OF capacitacion_id, fecha_inicio
  ON empleados_capacitaciones
  FOR EACH ROW EXECUTE FUNCTION trg_recalcular_prorrateo_capacitacion();

-- 4. Vista: vehículo asignado + gasolina mensual
CREATE OR REPLACE VIEW v_empleado_vehiculo_gasolina AS
SELECT
  v.asignado_a AS usuario_id,
  e.id AS empleado_id,
  e.empresa_id,
  v.id AS vehiculo_id,
  v.placa,
  v.numero_economico,
  v.marca,
  v.modelo,
  v.anio AS anio_vehiculo,
  EXTRACT(YEAR FROM vb.fecha)::INTEGER AS anio,
  EXTRACT(MONTH FROM vb.fecha)::INTEGER AS mes,
  COUNT(*) FILTER (WHERE vb.tipo = 'carga_combustible')::INTEGER AS num_cargas,
  COALESCE(SUM(vb.monto) FILTER (WHERE vb.tipo = 'carga_combustible'), 0)::NUMERIC AS total_combustible,
  COALESCE(SUM(vb.litros) FILTER (WHERE vb.tipo = 'carga_combustible'), 0)::NUMERIC AS total_litros
FROM vehiculos v
JOIN empleados e ON e.usuario_id = v.asignado_a
LEFT JOIN vehiculos_bitacora vb ON vb.vehiculo_id = v.id
WHERE v.asignado_a IS NOT NULL
GROUP BY v.asignado_a, e.id, e.empresa_id, v.id, v.placa, v.numero_economico,
  v.marca, v.modelo, v.anio,
  EXTRACT(YEAR FROM vb.fecha), EXTRACT(MONTH FROM vb.fecha);

-- 5. Vista: compensación anual consolidada
CREATE OR REPLACE VIEW v_empleado_compensacion_anual AS
WITH anios AS (
  SELECT empleado_id, EXTRACT(YEAR FROM fecha_pago)::INTEGER AS anio FROM nomina_recibos
  UNION
  SELECT empleado_id, EXTRACT(YEAR FROM fecha_pago)::INTEGER AS anio FROM empleado_bonos_manuales
)
SELECT
  e.id AS empleado_id,
  e.empresa_id,
  a.anio,
  COALESCE((
    SELECT SUM(total_percepciones) FROM nomina_recibos
    WHERE empleado_id = e.id AND EXTRACT(YEAR FROM fecha_pago) = a.anio
  ), 0)::NUMERIC AS total_percepciones_timbradas,
  COALESCE((
    SELECT SUM(total_deducciones) FROM nomina_recibos
    WHERE empleado_id = e.id AND EXTRACT(YEAR FROM fecha_pago) = a.anio
  ), 0)::NUMERIC AS total_deducciones,
  COALESCE((
    SELECT SUM(total_neto) FROM nomina_recibos
    WHERE empleado_id = e.id AND EXTRACT(YEAR FROM fecha_pago) = a.anio
  ), 0)::NUMERIC AS total_neto_recibido,
  COALESCE((
    SELECT SUM(total_otros_pagos) FROM nomina_recibos
    WHERE empleado_id = e.id AND EXTRACT(YEAR FROM fecha_pago) = a.anio
  ), 0)::NUMERIC AS total_otros_pagos,
  COALESCE((
    SELECT SUM(monto) FROM empleado_bonos_manuales
    WHERE empleado_id = e.id AND EXTRACT(YEAR FROM fecha_pago) = a.anio
  ), 0)::NUMERIC AS total_bonos_no_timbrados,
  COALESCE((
    SELECT SUM(costo_prorrateado) FROM empleados_capacitaciones
    WHERE empleado_id = e.id AND EXTRACT(YEAR FROM fecha_fin) = a.anio
  ), 0)::NUMERIC AS total_capacitacion_recibida,
  COALESCE((
    SELECT SUM(vb.monto) FROM vehiculos_bitacora vb
    JOIN vehiculos v ON v.id = vb.vehiculo_id
    WHERE v.asignado_a = e.usuario_id
      AND vb.tipo = 'carga_combustible'
      AND EXTRACT(YEAR FROM vb.fecha) = a.anio
  ), 0)::NUMERIC AS total_combustible_vehiculo
FROM empleados e
JOIN anios a ON a.empleado_id = e.id;

-- 6. RLS bonos
ALTER TABLE empleado_bonos_manuales ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ebm_select ON empleado_bonos_manuales;
CREATE POLICY ebm_select ON empleado_bonos_manuales FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM empleados e WHERE e.id = empleado_bonos_manuales.empleado_id AND e.usuario_id = auth.uid())
    OR usuario_es_ceo()
    OR usuario_tiene_rol_en_empresa(empleado_bonos_manuales.empresa_id, ARRAY['director'])
  );

DROP POLICY IF EXISTS ebm_modify ON empleado_bonos_manuales;
CREATE POLICY ebm_modify ON empleado_bonos_manuales FOR ALL TO authenticated
  USING (
    usuario_es_ceo()
    OR usuario_tiene_rol_en_empresa(empleado_bonos_manuales.empresa_id, ARRAY['director'])
  );
