-- ============================================================================
-- Vehículos: asignación a empleado (no solo a cuenta auth.users) y trazabilidad
-- de quién condujo en cada carga de combustible.
--
-- Hasta ahora `vehiculos.asignado_a` apuntaba a `auth.users(id)`, lo cual
-- excluía a empleados sin cuenta en el ERP. Ahora añadimos `empleado_id` que
-- referencia directo a la tabla `empleados`. Esto permite asignar el vehículo
-- a CUALQUIER empleado (con o sin cuenta) — útil para repartir el costo de
-- gasolina por persona.
--
-- En la bitácora añadimos `empleado_id` opcional para registrar quién hizo
-- cada carga (en caso de que el vehículo lo manejen varios o sea de pool).
-- ============================================================================

ALTER TABLE vehiculos
  ADD COLUMN IF NOT EXISTS empleado_id UUID
    REFERENCES empleados(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_veh_empleado
  ON vehiculos(empleado_id) WHERE empleado_id IS NOT NULL;

COMMENT ON COLUMN vehiculos.empleado_id IS
  'Empleado al que está asignado el vehículo (responsable principal). Se usa para imputar gasolina y mantenimiento. Independiente de asignado_a (que es a auth.users).';

ALTER TABLE vehiculos_bitacora
  ADD COLUMN IF NOT EXISTS empleado_id UUID
    REFERENCES empleados(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_bita_empleado
  ON vehiculos_bitacora(empleado_id) WHERE empleado_id IS NOT NULL;

COMMENT ON COLUMN vehiculos_bitacora.empleado_id IS
  'Empleado que realizó/recibió este evento (carga de combustible, mantenimiento, etc.). Por default hereda del vehiculos.empleado_id.';

-- Vista helper: gasto de gasolina por empleado (últimos 12 meses)
CREATE OR REPLACE VIEW v_gasolina_por_empleado AS
SELECT
  e.id AS empleado_id,
  e.empresa_id,
  e.nombre_completo,
  COUNT(b.id) AS cargas,
  COALESCE(SUM(b.litros), 0)::NUMERIC(10,2) AS litros_total,
  COALESCE(SUM(b.monto), 0)::NUMERIC(14,2) AS monto_total,
  MAX(b.fecha) AS ultima_carga
FROM empleados e
LEFT JOIN vehiculos_bitacora b
  ON b.empleado_id = e.id
  AND b.tipo = 'carga_combustible'
  AND b.fecha >= (CURRENT_DATE - INTERVAL '12 months')
WHERE e.activo = TRUE
GROUP BY e.id, e.empresa_id, e.nombre_completo;
