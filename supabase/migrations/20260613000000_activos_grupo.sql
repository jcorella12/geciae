-- ============================================================================
-- Sprint Y.1 — Activos compartidos del grupo (catálogo)
-- ============================================================================

-- 1. Enums
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tipo_activo_grupo') THEN
    CREATE TYPE tipo_activo_grupo AS ENUM (
      'medicion', 'elevacion', 'perforacion', 'energia',
      'transporte', 'taller', 'oficina', 'otro'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'estado_activo_grupo') THEN
    CREATE TYPE estado_activo_grupo AS ENUM (
      'disponible', 'en_uso', 'en_mantenimiento',
      'en_calibracion', 'fuera_servicio', 'baja'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'unidad_uso_activo') THEN
    CREATE TYPE unidad_uso_activo AS ENUM ('hora', 'dia', 'ciclo', 'kilometro');
  END IF;
END$$;

-- 2. Tabla principal
CREATE TABLE IF NOT EXISTS activos_grupo (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo TEXT UNIQUE NOT NULL,
  nombre TEXT NOT NULL,
  descripcion TEXT,
  tipo tipo_activo_grupo NOT NULL,

  marca TEXT,
  modelo TEXT,
  numero_serie TEXT,
  anio_fabricacion INTEGER,
  capacidad TEXT,

  empresa_propietaria_id UUID NOT NULL REFERENCES empresas(id) ON DELETE RESTRICT,
  fecha_adquisicion DATE NOT NULL,
  costo_adquisicion NUMERIC(12,2) NOT NULL CHECK (costo_adquisicion >= 0),
  proveedor_id UUID REFERENCES proveedores(id),
  cfdi_compra_id UUID,

  vida_util_anios INTEGER NOT NULL DEFAULT 8,
  valor_residual_pct NUMERIC(5,2) DEFAULT 10 CHECK (valor_residual_pct >= 0 AND valor_residual_pct <= 100),

  unidad_uso unidad_uso_activo NOT NULL DEFAULT 'hora',
  tarifa_calculada NUMERIC(10,2),
  tarifa_manual NUMERIC(10,2),
  tarifa_vigente NUMERIC(10,2) GENERATED ALWAYS AS (
    COALESCE(tarifa_manual, tarifa_calculada, 0)
  ) STORED,
  uso_estimado_anual NUMERIC(8,2) DEFAULT 200 CHECK (uso_estimado_anual > 0),
  margen_administracion_pct NUMERIC(5,2) DEFAULT 12 CHECK (margen_administracion_pct >= 0),

  estado estado_activo_grupo DEFAULT 'disponible',
  ubicacion_actual_empresa_id UUID REFERENCES empresas(id),
  ubicacion_actual_descripcion TEXT,
  responsable_actual_id UUID REFERENCES auth.users(id),

  requiere_calibracion BOOLEAN DEFAULT FALSE,
  frecuencia_calibracion_meses INTEGER,
  fecha_ultima_calibracion DATE,
  fecha_proxima_calibracion DATE,
  laboratorio_calibracion TEXT,

  requiere_mantenimiento_preventivo BOOLEAN DEFAULT TRUE,
  frecuencia_mantenimiento_meses INTEGER DEFAULT 6,
  fecha_ultimo_mantenimiento DATE,
  fecha_proximo_mantenimiento DATE,

  numero_poliza_seguro TEXT,
  vigencia_seguro_hasta DATE,
  costo_anual_seguro NUMERIC(10,2),

  observaciones TEXT,
  activo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activos_grupo_empresa
  ON activos_grupo(empresa_propietaria_id) WHERE activo = TRUE;
CREATE INDEX IF NOT EXISTS idx_activos_grupo_tipo
  ON activos_grupo(tipo) WHERE activo = TRUE;
CREATE INDEX IF NOT EXISTS idx_activos_grupo_estado ON activos_grupo(estado);
CREATE INDEX IF NOT EXISTS idx_activos_grupo_ubicacion
  ON activos_grupo(ubicacion_actual_empresa_id);

-- 3. Documentos
CREATE TABLE IF NOT EXISTS activos_grupo_documentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  activo_id UUID NOT NULL REFERENCES activos_grupo(id) ON DELETE CASCADE,
  tipo_documento TEXT NOT NULL,
  nombre TEXT NOT NULL,
  url TEXT NOT NULL,
  fecha_documento DATE,
  vencimiento DATE,
  observaciones TEXT,
  subido_por UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_act_docs_activo ON activos_grupo_documentos(activo_id);

-- 4. Costos anuales
CREATE TABLE IF NOT EXISTS activos_grupo_costos_anuales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  activo_id UUID NOT NULL REFERENCES activos_grupo(id) ON DELETE CASCADE,
  anio INTEGER NOT NULL,
  depreciacion NUMERIC(10,2),
  mantenimiento NUMERIC(10,2) DEFAULT 0,
  calibraciones NUMERIC(10,2) DEFAULT 0,
  seguro NUMERIC(10,2) DEFAULT 0,
  refacciones NUMERIC(10,2) DEFAULT 0,
  otros NUMERIC(10,2) DEFAULT 0,
  costo_total NUMERIC(10,2) GENERATED ALWAYS AS (
    COALESCE(depreciacion, 0) + COALESCE(mantenimiento, 0) +
    COALESCE(calibraciones, 0) + COALESCE(seguro, 0) +
    COALESCE(refacciones, 0) + COALESCE(otros, 0)
  ) STORED,
  observaciones TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(activo_id, anio)
);
CREATE INDEX IF NOT EXISTS idx_act_costos_activo ON activos_grupo_costos_anuales(activo_id);

-- 5. Función para calcular tarifa
CREATE OR REPLACE FUNCTION calcular_tarifa_activo_grupo(p_activo_id UUID)
RETURNS NUMERIC LANGUAGE plpgsql AS $$
DECLARE
  v_activo RECORD;
  v_costo_anual NUMERIC := 0;
  v_costo_unitario NUMERIC := 0;
  v_anio_actual INTEGER;
BEGIN
  SELECT * INTO v_activo FROM activos_grupo WHERE id = p_activo_id;
  IF NOT FOUND THEN RETURN 0; END IF;

  v_anio_actual := EXTRACT(YEAR FROM CURRENT_DATE);

  SELECT costo_total INTO v_costo_anual
  FROM activos_grupo_costos_anuales
  WHERE activo_id = p_activo_id AND anio IN (v_anio_actual, v_anio_actual - 1)
  ORDER BY anio DESC LIMIT 1;

  IF v_costo_anual IS NULL OR v_costo_anual = 0 THEN
    v_costo_anual := (v_activo.costo_adquisicion * (1 - v_activo.valor_residual_pct/100)) / v_activo.vida_util_anios;
    v_costo_anual := v_costo_anual * 1.3;
  END IF;

  IF v_activo.uso_estimado_anual > 0 THEN
    v_costo_unitario := v_costo_anual / v_activo.uso_estimado_anual;
  END IF;

  RETURN ROUND(v_costo_unitario * (1 + v_activo.margen_administracion_pct / 100), 2);
END;
$$;

-- 6. Trigger recalcular tarifa
CREATE OR REPLACE FUNCTION trg_actualizar_tarifa_activo()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_activo_id UUID;
  v_nueva_tarifa NUMERIC;
BEGIN
  IF TG_TABLE_NAME = 'activos_grupo' THEN
    v_activo_id := NEW.id;
  ELSE
    v_activo_id := COALESCE(NEW.activo_id, OLD.activo_id);
  END IF;

  v_nueva_tarifa := calcular_tarifa_activo_grupo(v_activo_id);
  UPDATE activos_grupo
  SET tarifa_calculada = v_nueva_tarifa
  WHERE id = v_activo_id AND tarifa_calculada IS DISTINCT FROM v_nueva_tarifa;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_activo_tarifa_self ON activos_grupo;
CREATE TRIGGER trg_activo_tarifa_self
  AFTER INSERT OR UPDATE OF costo_adquisicion, vida_util_anios, valor_residual_pct,
                              uso_estimado_anual, margen_administracion_pct
  ON activos_grupo
  FOR EACH ROW EXECUTE FUNCTION trg_actualizar_tarifa_activo();

DROP TRIGGER IF EXISTS trg_activo_tarifa_costos ON activos_grupo_costos_anuales;
CREATE TRIGGER trg_activo_tarifa_costos
  AFTER INSERT OR UPDATE OR DELETE ON activos_grupo_costos_anuales
  FOR EACH ROW EXECUTE FUNCTION trg_actualizar_tarifa_activo();

-- 7. updated_at
DROP TRIGGER IF EXISTS set_updated_at_activos_grupo ON activos_grupo;
CREATE TRIGGER set_updated_at_activos_grupo BEFORE UPDATE ON activos_grupo
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_act_costos ON activos_grupo_costos_anuales;
CREATE TRIGGER set_updated_at_act_costos BEFORE UPDATE ON activos_grupo_costos_anuales
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- 8. Storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('activos-grupo-docs', 'activos-grupo-docs', false)
ON CONFLICT (id) DO NOTHING;

-- 9. RLS
ALTER TABLE activos_grupo ENABLE ROW LEVEL SECURITY;
ALTER TABLE activos_grupo_documentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE activos_grupo_costos_anuales ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ag_select ON activos_grupo;
CREATE POLICY ag_select ON activos_grupo FOR SELECT TO authenticated
  USING (
    activo = TRUE AND EXISTS (
      SELECT 1 FROM usuarios_empresas
      WHERE usuario_id = auth.uid() AND activo = TRUE
    )
  );

DROP POLICY IF EXISTS ag_modify ON activos_grupo;
CREATE POLICY ag_modify ON activos_grupo FOR ALL TO authenticated
  USING (
    usuario_es_ceo() OR EXISTS (
      SELECT 1 FROM usuarios_empresas ue
      WHERE ue.usuario_id = auth.uid()
        AND ue.empresa_id = activos_grupo.empresa_propietaria_id
        AND (ue.rol = 'director'::rol_usuario OR 'contralor' = ANY(ue.atributos))
        AND ue.activo = TRUE
    )
  );

DROP POLICY IF EXISTS ag_docs_select ON activos_grupo_documentos;
CREATE POLICY ag_docs_select ON activos_grupo_documentos FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM activos_grupo a WHERE a.id = activos_grupo_documentos.activo_id));

DROP POLICY IF EXISTS ag_docs_insert ON activos_grupo_documentos;
CREATE POLICY ag_docs_insert ON activos_grupo_documentos FOR INSERT TO authenticated
  WITH CHECK (
    subido_por = auth.uid()
    AND EXISTS (SELECT 1 FROM activos_grupo a WHERE a.id = activos_grupo_documentos.activo_id)
  );

DROP POLICY IF EXISTS ag_costos_select ON activos_grupo_costos_anuales;
CREATE POLICY ag_costos_select ON activos_grupo_costos_anuales FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM activos_grupo a WHERE a.id = activos_grupo_costos_anuales.activo_id));

DROP POLICY IF EXISTS ag_costos_modify ON activos_grupo_costos_anuales;
CREATE POLICY ag_costos_modify ON activos_grupo_costos_anuales FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM activos_grupo a
    WHERE a.id = activos_grupo_costos_anuales.activo_id
      AND (
        usuario_es_ceo() OR EXISTS (
          SELECT 1 FROM usuarios_empresas
          WHERE usuario_id = auth.uid() AND empresa_id = a.empresa_propietaria_id
            AND (rol = 'director'::rol_usuario OR 'contralor' = ANY(atributos))
            AND activo = TRUE
        )
      )
  ));

-- 10. Vista enriquecida
CREATE OR REPLACE VIEW v_activos_grupo_enriquecido AS
SELECT
  a.*,
  ep.codigo AS empresa_propietaria_codigo,
  ep.nombre_comercial AS empresa_propietaria_nombre,
  eu.codigo AS empresa_ubicacion_codigo,
  eu.nombre_comercial AS empresa_ubicacion_nombre,
  CASE
    WHEN a.fecha_proxima_calibracion IS NOT NULL AND a.fecha_proxima_calibracion < CURRENT_DATE THEN 'calibracion_vencida'
    WHEN a.fecha_proximo_mantenimiento IS NOT NULL AND a.fecha_proximo_mantenimiento < CURRENT_DATE THEN 'mantenimiento_vencido'
    WHEN a.vigencia_seguro_hasta IS NOT NULL AND a.vigencia_seguro_hasta < CURRENT_DATE THEN 'seguro_vencido'
    WHEN a.fecha_proxima_calibracion IS NOT NULL AND a.fecha_proxima_calibracion - CURRENT_DATE <= 30 THEN 'calibracion_proxima'
    WHEN a.fecha_proximo_mantenimiento IS NOT NULL AND a.fecha_proximo_mantenimiento - CURRENT_DATE <= 30 THEN 'mantenimiento_proximo'
    ELSE 'ok'
  END AS alerta
FROM activos_grupo a
LEFT JOIN empresas ep ON ep.id = a.empresa_propietaria_id
LEFT JOIN empresas eu ON eu.id = a.ubicacion_actual_empresa_id
WHERE a.activo = TRUE;
