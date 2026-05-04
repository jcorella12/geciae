-- ============================================================================
-- Sprint 5.5.1 — Centros de costo y utilidad (base)
--
-- Tabla unificada `centros` (CC y CU) con campo tipo. Permite reportes de
-- rentabilidad por línea de negocio y allocation de servicios compartidos.
--
-- Este sprint solo crea schema + server actions CRUD básicos. NO toca
-- transacciones existentes (eso es 5.5.3) ni genera repartos automáticos
-- (eso es 5.5.4).
-- ============================================================================

-- 1. Enums
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tipo_centro') THEN
    CREATE TYPE tipo_centro AS ENUM ('costo', 'utilidad');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'subtipo_centro') THEN
    CREATE TYPE subtipo_centro AS ENUM (
      'servicio_compartido',  -- Admin, RH, Marketing, Calidad → se reparte
      'operativo',            -- Ingeniería, Ventas → CC interno de empresa
      'comercial',            -- CU línea de venta directa
      'mantenimiento',        -- CU línea de mantenimiento
      'capacitacion',         -- CU línea CIAE
      'certificacion',        -- CU línea CIAE
      'otro'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'metodo_reparto') THEN
    CREATE TYPE metodo_reparto AS ENUM (
      'porcentaje_fijo',
      'por_ingresos',
      'por_empleados',
      'por_proyectos',
      'por_horas'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tipo_emision_reparto') THEN
    CREATE TYPE tipo_emision_reparto AS ENUM (
      'cfdi_inter_co',     -- emite CFDI mensual de empresa origen → empresa destino
      'asiento_interno'    -- solo asiento contable, sin CFDI
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tipo_movimiento_centro') THEN
    CREATE TYPE tipo_movimiento_centro AS ENUM (
      'gasto_directo',
      'reparto_recibido',
      'ingreso_directo',
      'ajuste',
      'cierre_mensual',
      'reparto_emitido'
    );
  END IF;
END$$;

-- ============================================================================
-- 2. Tabla principal: centros
-- ============================================================================

CREATE TABLE IF NOT EXISTS centros (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE RESTRICT,
  codigo TEXT NOT NULL,
  nombre TEXT NOT NULL,
  descripcion TEXT,
  tipo tipo_centro NOT NULL,
  subtipo subtipo_centro NOT NULL,
  responsable_id UUID REFERENCES auth.users(id),
  -- Sub-centros (ej. levantamientos por vendedor dentro de "Ventas PSE")
  centro_padre_id UUID REFERENCES centros(id),
  presupuesto_anual NUMERIC(14, 2),
  activo BOOLEAN DEFAULT TRUE NOT NULL,
  observaciones TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(empresa_id, codigo)
);

CREATE INDEX IF NOT EXISTS idx_centros_empresa
  ON centros(empresa_id) WHERE activo = TRUE;
CREATE INDEX IF NOT EXISTS idx_centros_tipo
  ON centros(tipo, subtipo) WHERE activo = TRUE;
CREATE INDEX IF NOT EXISTS idx_centros_padre
  ON centros(centro_padre_id);
CREATE INDEX IF NOT EXISTS idx_centros_responsable
  ON centros(responsable_id) WHERE responsable_id IS NOT NULL;

CREATE TRIGGER set_updated_at_centros
  BEFORE UPDATE ON centros
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

COMMENT ON TABLE centros IS
  'Centros de costo y utilidad unificados. Subtipo distingue servicios compartidos (se reparten) de operativos/comerciales (no se reparten).';

-- ============================================================================
-- 3. Reglas de reparto: cómo un CC compartido se distribuye
-- ============================================================================

CREATE TABLE IF NOT EXISTS centros_reglas_reparto (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  centro_origen_id UUID NOT NULL REFERENCES centros(id) ON DELETE CASCADE,
  empresa_destino_id UUID NOT NULL REFERENCES empresas(id),
  -- Si NULL: cae al "sin centro" de la empresa destino (gasto general)
  centro_destino_id UUID REFERENCES centros(id),
  metodo metodo_reparto NOT NULL,
  -- Significado depende de método:
  --   porcentaje_fijo: 0–100
  --   por_ingresos / por_empleados / por_proyectos / por_horas: factor opcional
  valor NUMERIC(10, 4),
  emision tipo_emision_reparto NOT NULL DEFAULT 'asiento_interno',
  vigencia_desde DATE NOT NULL,
  vigencia_hasta DATE,
  activa BOOLEAN DEFAULT TRUE NOT NULL,
  observaciones TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reglas_origen
  ON centros_reglas_reparto(centro_origen_id) WHERE activa = TRUE;
CREATE INDEX IF NOT EXISTS idx_reglas_destino_empresa
  ON centros_reglas_reparto(empresa_destino_id);
CREATE INDEX IF NOT EXISTS idx_reglas_vigencia
  ON centros_reglas_reparto(vigencia_desde, vigencia_hasta);

-- Constraint blando: si método = porcentaje_fijo, valor BETWEEN 0 AND 100
ALTER TABLE centros_reglas_reparto
  DROP CONSTRAINT IF EXISTS chk_reglas_pct_rango;
ALTER TABLE centros_reglas_reparto
  ADD CONSTRAINT chk_reglas_pct_rango CHECK (
    metodo <> 'porcentaje_fijo'
    OR (valor IS NOT NULL AND valor >= 0 AND valor <= 100)
  );

ALTER TABLE centros_reglas_reparto
  DROP CONSTRAINT IF EXISTS chk_reglas_vigencia;
ALTER TABLE centros_reglas_reparto
  ADD CONSTRAINT chk_reglas_vigencia CHECK (
    vigencia_hasta IS NULL OR vigencia_hasta >= vigencia_desde
  );

COMMENT ON TABLE centros_reglas_reparto IS
  'Una regla por destino. Cada cierre mensual aplica las activas vigentes para el periodo y genera asientos.';

-- ============================================================================
-- 4. Movimientos asignados a centros
-- ============================================================================

CREATE TABLE IF NOT EXISTS centros_movimientos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  centro_id UUID NOT NULL REFERENCES centros(id) ON DELETE RESTRICT,
  empresa_id UUID NOT NULL REFERENCES empresas(id),
  fecha DATE NOT NULL,
  tipo tipo_movimiento_centro NOT NULL,
  concepto TEXT NOT NULL,
  monto NUMERIC(14, 2) NOT NULL,
  -- Vínculos opcionales con entidades existentes
  oc_id UUID REFERENCES ordenes_compra(id) ON DELETE SET NULL,
  ot_id UUID REFERENCES ordenes_trabajo_inter_co(id) ON DELETE SET NULL,
  cfdi_id UUID REFERENCES cfdi(id) ON DELETE SET NULL,
  gasto_recurrente_id UUID,  -- FK a gastos_recurrentes (existe)
  proyecto_id UUID REFERENCES proyectos(id) ON DELETE SET NULL,
  -- Si es reparto: regla y movimiento original
  regla_reparto_id UUID REFERENCES centros_reglas_reparto(id) ON DELETE SET NULL,
  origen_movimiento_id UUID REFERENCES centros_movimientos(id) ON DELETE SET NULL,
  observaciones TEXT,
  capturado_por UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- FK condicional a gastos_recurrentes (la tabla existe en migración 20260512)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'gastos_recurrentes') THEN
    BEGIN
      ALTER TABLE centros_movimientos
        ADD CONSTRAINT fk_cm_gasto_recurrente
        FOREIGN KEY (gasto_recurrente_id) REFERENCES gastos_recurrentes(id) ON DELETE SET NULL;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
  END IF;
END$$;

CREATE INDEX IF NOT EXISTS idx_cm_centro_fecha
  ON centros_movimientos(centro_id, fecha DESC);
CREATE INDEX IF NOT EXISTS idx_cm_empresa_fecha
  ON centros_movimientos(empresa_id, fecha DESC);
CREATE INDEX IF NOT EXISTS idx_cm_oc
  ON centros_movimientos(oc_id) WHERE oc_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_cm_ot
  ON centros_movimientos(ot_id) WHERE ot_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_cm_cfdi
  ON centros_movimientos(cfdi_id) WHERE cfdi_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_cm_proyecto
  ON centros_movimientos(proyecto_id) WHERE proyecto_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_cm_anio_mes
  ON centros_movimientos(EXTRACT(YEAR FROM fecha), EXTRACT(MONTH FROM fecha));

-- Validación: monto > 0 (los montos negativos se modelan con tipo, no signo)
ALTER TABLE centros_movimientos
  DROP CONSTRAINT IF EXISTS chk_cm_monto_positivo;
ALTER TABLE centros_movimientos
  ADD CONSTRAINT chk_cm_monto_positivo CHECK (monto >= 0);

-- ============================================================================
-- 5. Cierres mensuales: auditoría y prevenir reabrir meses cerrados
-- ============================================================================

CREATE TABLE IF NOT EXISTS centros_cierres_mensuales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id),
  anio INTEGER NOT NULL CHECK (anio BETWEEN 2020 AND 2099),
  mes INTEGER NOT NULL CHECK (mes BETWEEN 1 AND 12),
  cerrado BOOLEAN DEFAULT FALSE NOT NULL,
  cerrado_por UUID REFERENCES auth.users(id),
  cerrado_at TIMESTAMPTZ,
  total_gastos NUMERIC(14, 2),
  total_repartos_emitidos NUMERIC(14, 2),
  total_repartos_recibidos NUMERIC(14, 2),
  observaciones TEXT,
  -- Auditoría de re-apertura
  reabierto_por UUID REFERENCES auth.users(id),
  reabierto_at TIMESTAMPTZ,
  reabierto_motivo TEXT,
  UNIQUE(empresa_id, anio, mes)
);

CREATE INDEX IF NOT EXISTS idx_cierres_empresa_periodo
  ON centros_cierres_mensuales(empresa_id, anio DESC, mes DESC);

-- ============================================================================
-- 6. Vista: balance mensual por centro
-- ============================================================================

CREATE OR REPLACE VIEW v_centros_balance AS
SELECT
  c.id AS centro_id,
  c.empresa_id,
  c.codigo,
  c.nombre,
  c.tipo,
  c.subtipo,
  c.centro_padre_id,
  EXTRACT(YEAR FROM cm.fecha)::INTEGER AS anio,
  EXTRACT(MONTH FROM cm.fecha)::INTEGER AS mes,
  COALESCE(SUM(
    CASE WHEN cm.tipo IN ('gasto_directo', 'reparto_recibido')
      THEN cm.monto ELSE 0 END
  ), 0) AS total_costos,
  COALESCE(SUM(
    CASE WHEN cm.tipo = 'ingreso_directo'
      THEN cm.monto ELSE 0 END
  ), 0) AS total_ingresos,
  COALESCE(SUM(
    CASE WHEN cm.tipo = 'reparto_emitido'
      THEN cm.monto ELSE 0 END
  ), 0) AS total_repartos_emitidos,
  COALESCE(SUM(
    CASE WHEN cm.tipo = 'ingreso_directo'
      THEN cm.monto ELSE 0 END
  ), 0) - COALESCE(SUM(
    CASE WHEN cm.tipo IN ('gasto_directo', 'reparto_recibido')
      THEN cm.monto ELSE 0 END
  ), 0) AS resultado_neto,
  COUNT(cm.id)::INTEGER AS num_movimientos
FROM centros c
LEFT JOIN centros_movimientos cm ON cm.centro_id = c.id
WHERE c.activo = TRUE
GROUP BY c.id, c.empresa_id, c.codigo, c.nombre, c.tipo, c.subtipo, c.centro_padre_id,
         EXTRACT(YEAR FROM cm.fecha), EXTRACT(MONTH FROM cm.fecha);

COMMENT ON VIEW v_centros_balance IS
  'Balance mensual agregado por centro: costos, ingresos, repartos emitidos, resultado neto.';

-- ============================================================================
-- 7. RLS
-- ============================================================================

ALTER TABLE centros ENABLE ROW LEVEL SECURITY;
ALTER TABLE centros_reglas_reparto ENABLE ROW LEVEL SECURITY;
ALTER TABLE centros_movimientos ENABLE ROW LEVEL SECURITY;
ALTER TABLE centros_cierres_mensuales ENABLE ROW LEVEL SECURITY;

-- Centros: lectura para usuarios de la empresa o CEO
DROP POLICY IF EXISTS centros_select ON centros;
CREATE POLICY centros_select ON centros
  FOR SELECT TO authenticated
  USING (
    empresa_id IN (SELECT empresas_del_usuario())
    OR usuario_es_ceo()
    OR usuario_tiene_atributo('tesorero_corporativo')
    OR usuario_tiene_atributo('auditor_interno')
  );

-- Modificación: CEO o director de la empresa
DROP POLICY IF EXISTS centros_modify ON centros;
CREATE POLICY centros_modify ON centros
  FOR ALL TO authenticated
  USING (
    usuario_es_ceo()
    OR usuario_tiene_atributo('tesorero_corporativo')
    OR usuario_tiene_rol_en_empresa(centros.empresa_id, ARRAY['director'])
  );

-- Reglas: lectura por usuarios del origen o CEO/tesorero
DROP POLICY IF EXISTS reglas_select ON centros_reglas_reparto;
CREATE POLICY reglas_select ON centros_reglas_reparto
  FOR SELECT TO authenticated
  USING (
    usuario_es_ceo()
    OR usuario_tiene_atributo('tesorero_corporativo')
    OR EXISTS (
      SELECT 1 FROM centros c
      WHERE c.id = centros_reglas_reparto.centro_origen_id
        AND c.empresa_id IN (SELECT empresas_del_usuario())
    )
  );

-- Modificación de reglas: solo CEO o tesorero corporativo (impacto financiero alto)
DROP POLICY IF EXISTS reglas_modify ON centros_reglas_reparto;
CREATE POLICY reglas_modify ON centros_reglas_reparto
  FOR ALL TO authenticated
  USING (
    usuario_es_ceo()
    OR usuario_tiene_atributo('tesorero_corporativo')
  );

-- Movimientos: lectura por empresa o CEO
DROP POLICY IF EXISTS cm_select ON centros_movimientos;
CREATE POLICY cm_select ON centros_movimientos
  FOR SELECT TO authenticated
  USING (
    empresa_id IN (SELECT empresas_del_usuario())
    OR usuario_es_ceo()
    OR usuario_tiene_atributo('tesorero_corporativo')
    OR usuario_tiene_atributo('auditor_interno')
  );

-- Inserción manual: CEO, tesorero o director (los registros automáticos vienen
-- de hooks que ya pasaron por permiso de la transacción origen).
DROP POLICY IF EXISTS cm_insert ON centros_movimientos;
CREATE POLICY cm_insert ON centros_movimientos
  FOR INSERT TO authenticated
  WITH CHECK (
    capturado_por = auth.uid()
    AND (
      usuario_es_ceo()
      OR usuario_tiene_atributo('tesorero_corporativo')
      OR usuario_tiene_rol_en_empresa(empresa_id, ARRAY['director', 'operativo'])
    )
  );

-- Cierres: lectura por empresa o CEO/tesorero/auditor
DROP POLICY IF EXISTS cierres_select ON centros_cierres_mensuales;
CREATE POLICY cierres_select ON centros_cierres_mensuales
  FOR SELECT TO authenticated
  USING (
    empresa_id IN (SELECT empresas_del_usuario())
    OR usuario_es_ceo()
    OR usuario_tiene_atributo('tesorero_corporativo')
    OR usuario_tiene_atributo('auditor_interno')
  );

-- Modificación de cierres: solo CEO o tesorero corporativo
DROP POLICY IF EXISTS cierres_modify ON centros_cierres_mensuales;
CREATE POLICY cierres_modify ON centros_cierres_mensuales
  FOR ALL TO authenticated
  USING (
    usuario_es_ceo()
    OR usuario_tiene_atributo('tesorero_corporativo')
  );
