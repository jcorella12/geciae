-- ============================================================================
-- Sprint X.1 — Importador de XMLs de nómina
-- ============================================================================
-- 5 tablas: nomina_recibos, nomina_conceptos, nomina_uploads,
-- nomina_accesos_log, + bucket Storage 'nomina-xmls'.
-- 2 vistas: v_nomina_empleado_resumen_mensual, v_nomina_deducciones_por_tipo.
-- RLS estricto: empleado ve sus recibos, director/CEO ve los de su empresa.
-- ============================================================================

-- Enums
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tipo_recibo_nomina') THEN
    CREATE TYPE tipo_recibo_nomina AS ENUM (
      'ordinario', 'extraordinario', 'finiquito', 'liquidacion', 'otro'
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'periodicidad_nomina') THEN
    CREATE TYPE periodicidad_nomina AS ENUM (
      'diaria', 'semanal', 'catorcenal', 'quincenal', 'mensual', 'unica'
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tipo_concepto_nomina') THEN
    CREATE TYPE tipo_concepto_nomina AS ENUM ('percepcion', 'deduccion', 'otro_pago');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'estado_upload_nomina') THEN
    CREATE TYPE estado_upload_nomina AS ENUM (
      'procesando', 'completado', 'completado_con_errores', 'fallido'
    );
  END IF;
END$$;

-- 1. Recibos: una fila por CFDI nómina parseado
CREATE TABLE IF NOT EXISTS nomina_recibos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE RESTRICT,
  empleado_id UUID NOT NULL REFERENCES empleados(id),
  uuid_cfdi TEXT UNIQUE NOT NULL,
  serie TEXT,
  folio TEXT,
  fecha_emision TIMESTAMPTZ NOT NULL,
  fecha_pago DATE NOT NULL,
  fecha_inicial_pago DATE NOT NULL,
  fecha_final_pago DATE NOT NULL,
  num_dias_pagados NUMERIC(5, 2),
  periodicidad periodicidad_nomina,
  tipo tipo_recibo_nomina NOT NULL DEFAULT 'ordinario',
  total_percepciones NUMERIC(12, 2) NOT NULL,
  total_deducciones NUMERIC(12, 2) NOT NULL,
  total_otros_pagos NUMERIC(12, 2) DEFAULT 0,
  total_neto NUMERIC(12, 2) NOT NULL,
  sueldo_base_cotizacion NUMERIC(10, 2),
  salario_diario_integrado NUMERIC(10, 2),
  url_xml TEXT NOT NULL,
  url_pdf TEXT,
  upload_id UUID,
  procesado_at TIMESTAMPTZ DEFAULT NOW(),
  observaciones TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_nomina_recibos_empleado
  ON nomina_recibos(empleado_id, fecha_pago DESC);
CREATE INDEX IF NOT EXISTS idx_nomina_recibos_empresa
  ON nomina_recibos(empresa_id, fecha_pago DESC);
CREATE INDEX IF NOT EXISTS idx_nomina_recibos_periodo
  ON nomina_recibos(empresa_id, fecha_inicial_pago, fecha_final_pago);

CREATE TRIGGER trg_nomina_recibos_updated_at
  BEFORE UPDATE ON nomina_recibos
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- 2. Conceptos: cada percepción/deducción del recibo
CREATE TABLE IF NOT EXISTS nomina_conceptos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recibo_id UUID NOT NULL REFERENCES nomina_recibos(id) ON DELETE CASCADE,
  tipo tipo_concepto_nomina NOT NULL,
  clave_sat TEXT NOT NULL,
  tipo_clave TEXT,
  concepto TEXT NOT NULL,
  importe_gravado NUMERIC(12, 2) DEFAULT 0,
  importe_exento NUMERIC(12, 2) DEFAULT 0,
  importe_total NUMERIC(12, 2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_nomina_conceptos_recibo
  ON nomina_conceptos(recibo_id);
CREATE INDEX IF NOT EXISTS idx_nomina_conceptos_clave
  ON nomina_conceptos(clave_sat);

-- 3. Uploads: histórico de cargas masivas
CREATE TABLE IF NOT EXISTS nomina_uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id),
  cargado_por UUID NOT NULL REFERENCES auth.users(id),
  archivo_original_nombre TEXT,
  total_archivos INTEGER NOT NULL,
  archivos_procesados INTEGER DEFAULT 0,
  archivos_fallidos INTEGER DEFAULT 0,
  empleados_nuevos_detectados INTEGER DEFAULT 0,
  empleados_nuevos_creados INTEGER DEFAULT 0,
  total_neto_pagado NUMERIC(14, 2) DEFAULT 0,
  errores JSONB DEFAULT '[]'::JSONB,
  curps_nuevas JSONB DEFAULT '[]'::JSONB,
  estado estado_upload_nomina NOT NULL DEFAULT 'procesando',
  observaciones TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  procesado_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_nomina_uploads_empresa
  ON nomina_uploads(empresa_id, created_at DESC);

-- FK upload (después de crear nomina_uploads)
DO $$
BEGIN
  BEGIN
    ALTER TABLE nomina_recibos
      ADD CONSTRAINT fk_recibo_upload FOREIGN KEY (upload_id)
      REFERENCES nomina_uploads(id) ON DELETE SET NULL;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END$$;

-- 4. Logs de acceso (auditoría privacidad)
CREATE TABLE IF NOT EXISTS nomina_accesos_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID NOT NULL REFERENCES auth.users(id),
  empleado_consultado_id UUID NOT NULL REFERENCES empleados(id),
  recibo_id UUID REFERENCES nomina_recibos(id),
  accion TEXT NOT NULL,
  ip TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_nomina_accesos_empleado
  ON nomina_accesos_log(empleado_consultado_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_nomina_accesos_usuario
  ON nomina_accesos_log(usuario_id, created_at DESC);

-- 5. RLS
ALTER TABLE nomina_recibos ENABLE ROW LEVEL SECURITY;
ALTER TABLE nomina_conceptos ENABLE ROW LEVEL SECURITY;
ALTER TABLE nomina_uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE nomina_accesos_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS nr_select ON nomina_recibos;
CREATE POLICY nr_select ON nomina_recibos FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM empleados e
      WHERE e.id = nomina_recibos.empleado_id AND e.usuario_id = auth.uid()
    )
    OR usuario_es_ceo()
    OR usuario_tiene_rol_en_empresa(nomina_recibos.empresa_id, ARRAY['director'])
  );

DROP POLICY IF EXISTS nr_insert ON nomina_recibos;
CREATE POLICY nr_insert ON nomina_recibos FOR INSERT TO authenticated
  WITH CHECK (
    usuario_es_ceo()
    OR usuario_tiene_rol_en_empresa(nomina_recibos.empresa_id, ARRAY['director'])
  );

DROP POLICY IF EXISTS nr_update ON nomina_recibos;
CREATE POLICY nr_update ON nomina_recibos FOR UPDATE TO authenticated
  USING (
    usuario_es_ceo()
    OR usuario_tiene_rol_en_empresa(nomina_recibos.empresa_id, ARRAY['director'])
  );

DROP POLICY IF EXISTS nc_select ON nomina_conceptos;
CREATE POLICY nc_select ON nomina_conceptos FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM nomina_recibos nr
    WHERE nr.id = nomina_conceptos.recibo_id
      AND (
        EXISTS (SELECT 1 FROM empleados e WHERE e.id = nr.empleado_id AND e.usuario_id = auth.uid())
        OR usuario_es_ceo()
        OR usuario_tiene_rol_en_empresa(nr.empresa_id, ARRAY['director'])
      )
  ));

DROP POLICY IF EXISTS nc_insert ON nomina_conceptos;
CREATE POLICY nc_insert ON nomina_conceptos FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM nomina_recibos nr
    WHERE nr.id = nomina_conceptos.recibo_id
      AND (
        usuario_es_ceo()
        OR usuario_tiene_rol_en_empresa(nr.empresa_id, ARRAY['director'])
      )
  ));

DROP POLICY IF EXISTS nu_select ON nomina_uploads;
CREATE POLICY nu_select ON nomina_uploads FOR SELECT TO authenticated
  USING (
    usuario_es_ceo()
    OR usuario_tiene_rol_en_empresa(nomina_uploads.empresa_id, ARRAY['director'])
  );

DROP POLICY IF EXISTS nu_insert ON nomina_uploads;
CREATE POLICY nu_insert ON nomina_uploads FOR INSERT TO authenticated
  WITH CHECK (cargado_por = auth.uid());

DROP POLICY IF EXISTS nu_update ON nomina_uploads;
CREATE POLICY nu_update ON nomina_uploads FOR UPDATE TO authenticated
  USING (
    usuario_es_ceo()
    OR usuario_tiene_rol_en_empresa(nomina_uploads.empresa_id, ARRAY['director'])
  );

DROP POLICY IF EXISTS nal_select ON nomina_accesos_log;
CREATE POLICY nal_select ON nomina_accesos_log FOR SELECT TO authenticated
  USING (
    usuario_es_ceo()
    OR EXISTS (
      SELECT 1 FROM empleados e
      WHERE e.id = nomina_accesos_log.empleado_consultado_id
        AND usuario_tiene_rol_en_empresa(e.empresa_id, ARRAY['director'])
    )
  );

DROP POLICY IF EXISTS nal_insert ON nomina_accesos_log;
CREATE POLICY nal_insert ON nomina_accesos_log FOR INSERT TO authenticated
  WITH CHECK (usuario_id = auth.uid());

-- 6. Vistas
CREATE OR REPLACE VIEW v_nomina_empleado_resumen_mensual AS
SELECT
  nr.empleado_id,
  nr.empresa_id,
  EXTRACT(YEAR FROM nr.fecha_pago)::INTEGER AS anio,
  EXTRACT(MONTH FROM nr.fecha_pago)::INTEGER AS mes,
  COUNT(*)::INTEGER AS num_recibos,
  SUM(nr.total_percepciones) AS total_percepciones_mes,
  SUM(nr.total_deducciones) AS total_deducciones_mes,
  SUM(nr.total_neto) AS total_neto_mes,
  SUM(nr.total_otros_pagos) AS total_otros_pagos_mes
FROM nomina_recibos nr
GROUP BY nr.empleado_id, nr.empresa_id,
  EXTRACT(YEAR FROM nr.fecha_pago),
  EXTRACT(MONTH FROM nr.fecha_pago);

CREATE OR REPLACE VIEW v_nomina_deducciones_por_tipo AS
SELECT
  nr.empleado_id,
  nr.empresa_id,
  EXTRACT(YEAR FROM nr.fecha_pago)::INTEGER AS anio,
  EXTRACT(MONTH FROM nr.fecha_pago)::INTEGER AS mes,
  nc.clave_sat,
  nc.concepto,
  SUM(nc.importe_total) AS total_periodo
FROM nomina_recibos nr
JOIN nomina_conceptos nc ON nc.recibo_id = nr.id
WHERE nc.tipo = 'deduccion'
GROUP BY nr.empleado_id, nr.empresa_id,
  EXTRACT(YEAR FROM nr.fecha_pago),
  EXTRACT(MONTH FROM nr.fecha_pago),
  nc.clave_sat, nc.concepto;

-- 7. Storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('nomina-xmls', 'nomina-xmls', false)
ON CONFLICT (id) DO NOTHING;

-- Policies del bucket
DROP POLICY IF EXISTS "Empleado descarga su xml" ON storage.objects;
CREATE POLICY "Empleado descarga su xml" ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'nomina-xmls'
    AND (
      EXISTS (
        SELECT 1 FROM nomina_recibos nr
        JOIN empleados e ON e.id = nr.empleado_id
        WHERE nr.url_xml = name AND e.usuario_id = auth.uid()
      )
      OR usuario_es_ceo()
      OR EXISTS (
        SELECT 1 FROM nomina_recibos nr
        WHERE nr.url_xml = name
          AND usuario_tiene_rol_en_empresa(nr.empresa_id, ARRAY['director'])
      )
    )
  );

DROP POLICY IF EXISTS "Director sube xml nomina" ON storage.objects;
CREATE POLICY "Director sube xml nomina" ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'nomina-xmls'
    AND (
      usuario_es_ceo() OR EXISTS (
        SELECT 1 FROM usuarios_empresas
        WHERE usuario_id = auth.uid()
          AND rol = 'director'::rol_usuario
          AND activo = TRUE
      )
    )
  );
