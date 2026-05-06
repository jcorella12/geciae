-- ============================================================================
-- Sprint Y.2 — Préstamos de activos entre empresas
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'estado_prestamo_activo') THEN
    CREATE TYPE estado_prestamo_activo AS ENUM (
      'solicitado', 'aprobado', 'rechazado',
      'recogido', 'devuelto', 'facturado', 'cancelado'
    );
  END IF;
END$$;

CREATE TABLE IF NOT EXISTS prestamos_activos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero TEXT UNIQUE,
  activo_id UUID NOT NULL REFERENCES activos_grupo(id) ON DELETE RESTRICT,
  empresa_solicitante_id UUID NOT NULL REFERENCES empresas(id),
  empresa_propietaria_id UUID NOT NULL REFERENCES empresas(id),

  solicitante_id UUID NOT NULL REFERENCES auth.users(id),
  fecha_solicitud TIMESTAMPTZ DEFAULT NOW(),
  motivo TEXT NOT NULL,
  proyecto_id UUID REFERENCES proyectos(id) ON DELETE SET NULL,
  centro_destino_id UUID REFERENCES centros(id) ON DELETE SET NULL,

  fecha_recogida_prevista DATE NOT NULL,
  fecha_devolucion_prevista DATE NOT NULL,
  uso_estimado NUMERIC(8,2),

  aprobador_id UUID REFERENCES auth.users(id),
  fecha_aprobacion TIMESTAMPTZ,
  observaciones_aprobacion TEXT,

  responsable_recogida_id UUID REFERENCES auth.users(id),
  fecha_recogida_real TIMESTAMPTZ,
  estado_inicial_descripcion TEXT,

  responsable_devolucion_id UUID REFERENCES auth.users(id),
  fecha_devolucion_real TIMESTAMPTZ,
  uso_real NUMERIC(8,2),
  estado_final_descripcion TEXT,
  daños_reportados TEXT,
  requiere_mantenimiento BOOLEAN DEFAULT FALSE,
  requiere_calibracion BOOLEAN DEFAULT FALSE,

  tarifa_aplicada NUMERIC(10,2),
  costo_calculado NUMERIC(10,2),
  ajuste_manual NUMERIC(10,2) DEFAULT 0,
  costo_total NUMERIC(10,2) GENERATED ALWAYS AS (
    COALESCE(costo_calculado, 0) + COALESCE(ajuste_manual, 0)
  ) STORED,
  motivo_ajuste TEXT,

  estado estado_prestamo_activo DEFAULT 'solicitado',
  movimiento_centro_id UUID,
  facturado_en_periodo TEXT,
  cfdi_consolidado_id UUID,

  observaciones TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CHECK (fecha_devolucion_prevista >= fecha_recogida_prevista)
);

CREATE INDEX IF NOT EXISTS idx_prestamos_activo
  ON prestamos_activos(activo_id, fecha_solicitud DESC);
CREATE INDEX IF NOT EXISTS idx_prestamos_solicitante_emp
  ON prestamos_activos(empresa_solicitante_id, estado);
CREATE INDEX IF NOT EXISTS idx_prestamos_propietaria
  ON prestamos_activos(empresa_propietaria_id, estado);
CREATE INDEX IF NOT EXISTS idx_prestamos_estado_activo
  ON prestamos_activos(estado)
  WHERE estado IN ('solicitado', 'aprobado', 'recogido', 'devuelto');
CREATE INDEX IF NOT EXISTS idx_prestamos_facturacion
  ON prestamos_activos(facturado_en_periodo)
  WHERE estado = 'facturado';

CREATE TABLE IF NOT EXISTS prestamo_estados_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prestamo_id UUID NOT NULL REFERENCES prestamos_activos(id) ON DELETE CASCADE,
  estado_anterior estado_prestamo_activo,
  estado_nuevo estado_prestamo_activo NOT NULL,
  cambiado_por UUID NOT NULL REFERENCES auth.users(id),
  observaciones TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_prestamo_log_prestamo
  ON prestamo_estados_log(prestamo_id, created_at DESC);

CREATE TABLE IF NOT EXISTS prestamo_fotos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prestamo_id UUID NOT NULL REFERENCES prestamos_activos(id) ON DELETE CASCADE,
  momento TEXT NOT NULL CHECK (momento IN ('recogida', 'devolucion')),
  url TEXT NOT NULL,
  descripcion TEXT,
  subida_por UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_prestamo_fotos_prestamo
  ON prestamo_fotos(prestamo_id);

-- Trigger: número PA-AAAA-NNNN
CREATE OR REPLACE FUNCTION trg_prestamo_numero()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_anio INTEGER;
  v_secuencial INTEGER;
BEGIN
  IF NEW.numero IS NULL THEN
    v_anio := EXTRACT(YEAR FROM NOW());
    SELECT COALESCE(MAX(
      CAST(SUBSTRING(numero FROM 'PA-' || v_anio || '-(\d+)') AS INTEGER)
    ), 0) + 1
    INTO v_secuencial
    FROM prestamos_activos
    WHERE numero LIKE 'PA-' || v_anio || '-%';
    NEW.numero := 'PA-' || v_anio || '-' || LPAD(v_secuencial::TEXT, 4, '0');
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_prestamo_numero_insert ON prestamos_activos;
CREATE TRIGGER trg_prestamo_numero_insert
  BEFORE INSERT ON prestamos_activos
  FOR EACH ROW EXECUTE FUNCTION trg_prestamo_numero();

-- Trigger: log
CREATE OR REPLACE FUNCTION trg_prestamo_log_estado()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF (TG_OP = 'INSERT') OR (OLD.estado IS DISTINCT FROM NEW.estado) THEN
    INSERT INTO prestamo_estados_log (prestamo_id, estado_anterior, estado_nuevo, cambiado_por, observaciones)
    VALUES (
      NEW.id,
      CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE OLD.estado END,
      NEW.estado,
      auth.uid(),
      CASE NEW.estado
        WHEN 'aprobado' THEN NEW.observaciones_aprobacion
        WHEN 'recogido' THEN NEW.estado_inicial_descripcion
        WHEN 'devuelto' THEN NEW.estado_final_descripcion
        ELSE NEW.observaciones
      END
    );
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_prestamo_log_estado_change ON prestamos_activos;
CREATE TRIGGER trg_prestamo_log_estado_change
  AFTER INSERT OR UPDATE OF estado ON prestamos_activos
  FOR EACH ROW EXECUTE FUNCTION trg_prestamo_log_estado();

-- Trigger: actualizar activo
CREATE OR REPLACE FUNCTION trg_prestamo_actualiza_activo()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.estado = 'recogido' AND (OLD.estado IS NULL OR OLD.estado != 'recogido') THEN
    UPDATE activos_grupo
    SET estado = 'en_uso',
        ubicacion_actual_empresa_id = NEW.empresa_solicitante_id,
        responsable_actual_id = NEW.responsable_recogida_id
    WHERE id = NEW.activo_id;
  ELSIF NEW.estado = 'devuelto' AND OLD.estado = 'recogido' THEN
    UPDATE activos_grupo
    SET estado = CASE
      WHEN NEW.requiere_mantenimiento THEN 'en_mantenimiento'::estado_activo_grupo
      WHEN NEW.requiere_calibracion THEN 'en_calibracion'::estado_activo_grupo
      ELSE 'disponible'::estado_activo_grupo
    END,
    ubicacion_actual_empresa_id = NEW.empresa_propietaria_id,
    responsable_actual_id = NULL
    WHERE id = NEW.activo_id;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_prestamo_actualiza_activo_change ON prestamos_activos;
CREATE TRIGGER trg_prestamo_actualiza_activo_change
  AFTER UPDATE OF estado ON prestamos_activos
  FOR EACH ROW EXECUTE FUNCTION trg_prestamo_actualiza_activo();

DROP TRIGGER IF EXISTS set_updated_at_prestamos ON prestamos_activos;
CREATE TRIGGER set_updated_at_prestamos BEFORE UPDATE ON prestamos_activos
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- RLS
ALTER TABLE prestamos_activos ENABLE ROW LEVEL SECURITY;
ALTER TABLE prestamo_estados_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE prestamo_fotos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS pa_select ON prestamos_activos;
CREATE POLICY pa_select ON prestamos_activos FOR SELECT TO authenticated
  USING (
    usuario_es_ceo()
    OR empresa_solicitante_id IN (SELECT empresas_del_usuario())
    OR empresa_propietaria_id IN (SELECT empresas_del_usuario())
  );

DROP POLICY IF EXISTS pa_insert ON prestamos_activos;
CREATE POLICY pa_insert ON prestamos_activos FOR INSERT TO authenticated
  WITH CHECK (
    solicitante_id = auth.uid()
    AND empresa_solicitante_id IN (SELECT empresas_del_usuario())
  );

DROP POLICY IF EXISTS pa_update ON prestamos_activos;
CREATE POLICY pa_update ON prestamos_activos FOR UPDATE TO authenticated
  USING (
    usuario_es_ceo()
    OR (solicitante_id = auth.uid() AND estado = 'solicitado')
    OR EXISTS (
      SELECT 1 FROM usuarios_empresas
      WHERE usuario_id = auth.uid()
        AND empresa_id = prestamos_activos.empresa_propietaria_id
        AND (rol = 'director'::rol_usuario OR 'contralor' = ANY(atributos))
        AND activo = TRUE
    )
    OR EXISTS (
      SELECT 1 FROM usuarios_empresas
      WHERE usuario_id = auth.uid()
        AND empresa_id = prestamos_activos.empresa_solicitante_id
        AND rol = 'director'::rol_usuario
        AND activo = TRUE
    )
  );

DROP POLICY IF EXISTS pel_select ON prestamo_estados_log;
CREATE POLICY pel_select ON prestamo_estados_log FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM prestamos_activos WHERE id = prestamo_estados_log.prestamo_id));

DROP POLICY IF EXISTS pf_all ON prestamo_fotos;
CREATE POLICY pf_all ON prestamo_fotos FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM prestamos_activos WHERE id = prestamo_fotos.prestamo_id));

-- Vista enriquecida
CREATE OR REPLACE VIEW v_prestamos_activos_enriquecido AS
SELECT
  p.*,
  a.codigo AS activo_codigo,
  a.nombre AS activo_nombre,
  a.tipo AS activo_tipo,
  a.unidad_uso,
  es.codigo AS empresa_solicitante_codigo,
  es.nombre_comercial AS empresa_solicitante_nombre,
  ep.codigo AS empresa_propietaria_codigo,
  ep.nombre_comercial AS empresa_propietaria_nombre,
  CASE WHEN p.estado = 'recogido' AND p.fecha_recogida_real IS NOT NULL
       THEN EXTRACT(DAY FROM NOW() - p.fecha_recogida_real)
       ELSE NULL END AS dias_en_uso,
  CASE WHEN p.estado IN ('recogido') AND p.fecha_devolucion_prevista < CURRENT_DATE
       THEN (CURRENT_DATE - p.fecha_devolucion_prevista)
       ELSE NULL END AS dias_retraso
FROM prestamos_activos p
LEFT JOIN activos_grupo a ON a.id = p.activo_id
LEFT JOIN empresas es ON es.id = p.empresa_solicitante_id
LEFT JOIN empresas ep ON ep.id = p.empresa_propietaria_id;
