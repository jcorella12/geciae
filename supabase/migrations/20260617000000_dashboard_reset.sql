-- ============================================================================
-- Sprint Z.1.5.A — Dashboard Reset
-- Catálogo de widgets, plantillas, alertas inteligentes
-- ============================================================================

-- 1. Extender widget_preferencias_usuario
-- ----------------------------------------------------------------------------
ALTER TABLE widget_preferencias_usuario
  ADD COLUMN IF NOT EXISTS vista_activa TEXT DEFAULT 'personalizada'
    CHECK (vista_activa IN ('personalizada', 'ceo', 'director', 'contralor', 'operativo')),
  ADD COLUMN IF NOT EXISTS modo_compacto BOOLEAN DEFAULT FALSE;

-- 2. Tabla de plantillas
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS widget_plantillas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vista TEXT UNIQUE NOT NULL CHECK (vista IN ('ceo', 'director', 'contralor', 'operativo')),
  pagina TEXT NOT NULL DEFAULT 'dashboard',
  layout_default JSONB NOT NULL,
  -- Estructura: [{ widget_id, orden, visible, tamaño }]
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

DROP TRIGGER IF EXISTS set_updated_at_wp ON widget_plantillas;
CREATE TRIGGER set_updated_at_wp BEFORE UPDATE ON widget_plantillas
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

ALTER TABLE widget_plantillas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS wp_select ON widget_plantillas;
CREATE POLICY wp_select ON widget_plantillas FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS wp_modify ON widget_plantillas;
CREATE POLICY wp_modify ON widget_plantillas FOR ALL TO authenticated
  USING (usuario_es_ceo())
  WITH CHECK (usuario_es_ceo());

-- 3. Seed de plantillas iniciales (4 vistas)
-- ----------------------------------------------------------------------------
INSERT INTO widget_plantillas (vista, pagina, layout_default) VALUES
  ('ceo', 'dashboard', '[
    {"widget_id":"hero_margen_consolidado","orden":1,"visible":true,"tamano":"large"},
    {"widget_id":"hero_cash_grupo","orden":2,"visible":true,"tamano":"medium"},
    {"widget_id":"hero_proyectos_riesgo","orden":3,"visible":true,"tamano":"medium"},
    {"widget_id":"hero_cumplimiento_sat","orden":4,"visible":true,"tamano":"medium"},
    {"widget_id":"hero_alertas_criticas","orden":5,"visible":true,"tamano":"medium"},
    {"widget_id":"posicion_consolidada","orden":6,"visible":true,"tamano":"large"},
    {"widget_id":"cashflow_30d","orden":7,"visible":true,"tamano":"large"},
    {"widget_id":"top_proyectos_margen","orden":8,"visible":true,"tamano":"medium"},
    {"widget_id":"top_clientes_ingreso","orden":9,"visible":true,"tamano":"medium"}
  ]'::JSONB),
  ('director', 'dashboard', '[
    {"widget_id":"hero_margen_empresa","orden":1,"visible":true,"tamano":"large"},
    {"widget_id":"hero_cash_empresa","orden":2,"visible":true,"tamano":"medium"},
    {"widget_id":"hero_ocs_pendientes","orden":3,"visible":true,"tamano":"medium"},
    {"widget_id":"hero_proyectos_riesgo","orden":4,"visible":true,"tamano":"medium"},
    {"widget_id":"hero_alertas_criticas","orden":5,"visible":true,"tamano":"medium"},
    {"widget_id":"posicion_consolidada","orden":6,"visible":true,"tamano":"large"},
    {"widget_id":"mi_equipo_resumen","orden":7,"visible":true,"tamano":"medium"},
    {"widget_id":"obligaciones_proximas","orden":8,"visible":true,"tamano":"medium"}
  ]'::JSONB),
  ('contralor', 'dashboard', '[
    {"widget_id":"hero_cumplimiento_sat","orden":1,"visible":true,"tamano":"large"},
    {"widget_id":"hero_cfdis_sin_centro","orden":2,"visible":true,"tamano":"medium"},
    {"widget_id":"hero_conciliacion_pendiente","orden":3,"visible":true,"tamano":"medium"},
    {"widget_id":"hero_cierre_mensual","orden":4,"visible":true,"tamano":"medium"},
    {"widget_id":"hero_alertas_criticas","orden":5,"visible":true,"tamano":"medium"},
    {"widget_id":"matriz_inter_co","orden":6,"visible":true,"tamano":"large"},
    {"widget_id":"tesoreria_resumen","orden":7,"visible":true,"tamano":"medium"},
    {"widget_id":"top_proveedores_pago","orden":8,"visible":true,"tamano":"medium"},
    {"widget_id":"obligaciones_proximas","orden":9,"visible":true,"tamano":"medium"}
  ]'::JSONB),
  ('operativo', 'dashboard', '[
    {"widget_id":"hero_mis_proyectos","orden":1,"visible":true,"tamano":"large"},
    {"widget_id":"hero_mis_tareas","orden":2,"visible":true,"tamano":"medium"},
    {"widget_id":"hero_mis_aprobaciones","orden":3,"visible":true,"tamano":"medium"},
    {"widget_id":"hero_alertas_criticas","orden":4,"visible":true,"tamano":"medium"},
    {"widget_id":"mis_proyectos_riesgo","orden":5,"visible":true,"tamano":"large"},
    {"widget_id":"mi_equipo_resumen","orden":6,"visible":true,"tamano":"medium"}
  ]'::JSONB)
ON CONFLICT (vista) DO UPDATE SET layout_default = EXCLUDED.layout_default;

-- 4. Tabla de alertas inteligentes (snapshot histórico)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS dashboard_alertas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID REFERENCES empresas(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL,
  severidad TEXT NOT NULL CHECK (severidad IN ('info', 'warning', 'danger')),
  titulo TEXT NOT NULL,
  mensaje TEXT,
  url TEXT,
  entidad_tipo TEXT,
  entidad_id UUID,
  monto NUMERIC(14, 2),
  vigente_hasta DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  resuelta BOOLEAN DEFAULT FALSE,
  resuelta_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_dashboard_alertas_activas
  ON dashboard_alertas(empresa_id, severidad, created_at DESC)
  WHERE resuelta = FALSE;

CREATE INDEX IF NOT EXISTS idx_dashboard_alertas_tipo
  ON dashboard_alertas(empresa_id, tipo)
  WHERE resuelta = FALSE;

ALTER TABLE dashboard_alertas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS da_select ON dashboard_alertas;
CREATE POLICY da_select ON dashboard_alertas FOR SELECT TO authenticated
  USING (
    usuario_es_ceo()
    OR empresa_id IS NULL
    OR empresa_id IN (SELECT empresas_del_usuario())
  );

DROP POLICY IF EXISTS da_modify ON dashboard_alertas;
CREATE POLICY da_modify ON dashboard_alertas FOR ALL TO authenticated
  USING (
    usuario_es_ceo()
    OR EXISTS (
      SELECT 1 FROM usuarios_empresas ue
      WHERE ue.usuario_id = auth.uid()
        AND ue.empresa_id = dashboard_alertas.empresa_id
        AND (ue.rol = 'director' OR 'contralor' = ANY(ue.atributos))
        AND ue.activo = TRUE
    )
  )
  WITH CHECK (
    usuario_es_ceo()
    OR EXISTS (
      SELECT 1 FROM usuarios_empresas ue
      WHERE ue.usuario_id = auth.uid()
        AND ue.empresa_id = dashboard_alertas.empresa_id
        AND (ue.rol = 'director' OR 'contralor' = ANY(ue.atributos))
        AND ue.activo = TRUE
    )
  );

-- 5. Función helper: comparar indirectos vs mes anterior
-- ----------------------------------------------------------------------------
-- Nota: esta función asume que existen las tablas centros y centros_movimientos
-- con columnas (empresa_id, fecha, tipo, monto). Si no, retorna ceros.
CREATE OR REPLACE FUNCTION comparar_indirectos_mes_anterior(p_empresa_id UUID)
RETURNS TABLE(
  mes_actual TEXT,
  mes_anterior TEXT,
  monto_actual NUMERIC,
  monto_anterior NUMERIC,
  diferencia_monto NUMERIC,
  variacion_pct NUMERIC
) LANGUAGE PLPGSQL STABLE AS $$
DECLARE
  v_actual NUMERIC := 0;
  v_anterior NUMERIC := 0;
BEGIN
  -- Solo si las tablas existen
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'centros_movimientos'
  ) THEN
    BEGIN
      EXECUTE format(
        'SELECT COALESCE(SUM(cm.monto), 0)
         FROM centros_movimientos cm
         JOIN centros c ON c.id = cm.centro_id
         WHERE c.empresa_id = %L
           AND cm.tipo = ''reparto_recibido''
           AND DATE_TRUNC(''month'', cm.fecha) = DATE_TRUNC(''month'', CURRENT_DATE)',
        p_empresa_id
      ) INTO v_actual;

      EXECUTE format(
        'SELECT COALESCE(SUM(cm.monto), 0)
         FROM centros_movimientos cm
         JOIN centros c ON c.id = cm.centro_id
         WHERE c.empresa_id = %L
           AND cm.tipo = ''reparto_recibido''
           AND DATE_TRUNC(''month'', cm.fecha) = DATE_TRUNC(''month'', CURRENT_DATE - INTERVAL ''1 month'')',
        p_empresa_id
      ) INTO v_anterior;
    EXCEPTION WHEN OTHERS THEN
      v_actual := 0;
      v_anterior := 0;
    END;
  END IF;

  RETURN QUERY SELECT
    TO_CHAR(CURRENT_DATE, 'TMMonth YYYY'),
    TO_CHAR(CURRENT_DATE - INTERVAL '1 month', 'TMMonth YYYY'),
    v_actual,
    v_anterior,
    v_actual - v_anterior,
    CASE WHEN v_anterior > 0
      THEN ((v_actual - v_anterior) / v_anterior * 100)
      ELSE 0
    END;
END;
$$;
