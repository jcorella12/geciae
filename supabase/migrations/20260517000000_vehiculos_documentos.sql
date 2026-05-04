-- Documentos de vehículos: factura, seguro, tarjeta de circulación, etc.

CREATE TYPE categoria_documento_vehiculo AS ENUM (
  'factura',
  'seguro',
  'tarjeta_circulacion',
  'verificacion',
  'tenencia',
  'permiso_carga',
  'permiso_federal',
  'manual',
  'contrato_arrendamiento',
  'foto',
  'placas',
  'tarjeton_acceso',
  'otro'
);

CREATE TABLE IF NOT EXISTS vehiculos_documentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehiculo_id UUID NOT NULL REFERENCES vehiculos(id) ON DELETE CASCADE,
  categoria categoria_documento_vehiculo NOT NULL DEFAULT 'otro',
  nombre TEXT NOT NULL,
  descripcion TEXT,
  -- Datos clave del documento
  numero_documento TEXT,    -- folio, núm póliza, núm factura, etc.
  emisor TEXT,              -- aseguradora, dependencia gubernamental, agencia
  fecha_emision DATE,
  fecha_vencimiento DATE,   -- crítico para seguros, verificación, tenencia
  monto NUMERIC(14,2),      -- factura, tenencia, póliza
  -- Storage
  storage_path TEXT NOT NULL,
  mime_type TEXT,
  tamano_bytes BIGINT,
  -- Visibilidad
  visible_conductor BOOLEAN DEFAULT TRUE, -- visible para el asignado
  -- Metadatos
  subido_por UUID REFERENCES auth.users(id),
  subido_por_nombre TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vd_vehiculo
  ON vehiculos_documentos(vehiculo_id, categoria);
CREATE INDEX IF NOT EXISTS idx_vd_vencimiento
  ON vehiculos_documentos(fecha_vencimiento)
  WHERE fecha_vencimiento IS NOT NULL;

-- RLS
ALTER TABLE vehiculos_documentos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS vd_select ON vehiculos_documentos;
CREATE POLICY vd_select ON vehiculos_documentos
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM vehiculos v
      WHERE v.id = vehiculos_documentos.vehiculo_id
        AND (
          v.empresa_id IN (SELECT empresas_del_usuario())
          OR usuario_es_ceo()
          OR v.asignado_a = auth.uid()
        )
    )
  );

DROP POLICY IF EXISTS vd_modify ON vehiculos_documentos;
CREATE POLICY vd_modify ON vehiculos_documentos
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM vehiculos v
      WHERE v.id = vehiculos_documentos.vehiculo_id
        AND (
          usuario_es_ceo()
          OR EXISTS (
            SELECT 1 FROM usuarios_empresas
            WHERE usuario_id = auth.uid()
              AND empresa_id = v.empresa_id
              AND rol IN ('director'::rol_usuario, 'operativo'::rol_usuario)
              AND activo = TRUE
          )
        )
    )
  );

-- Bucket de Storage
INSERT INTO storage.buckets (id, name, public)
VALUES ('vehiculos-archivos', 'vehiculos-archivos', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS vehiculos_archivos_select ON storage.objects;
CREATE POLICY vehiculos_archivos_select ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'vehiculos-archivos'
    AND usuario_activo_grupo()
  );

DROP POLICY IF EXISTS vehiculos_archivos_insert ON storage.objects;
CREATE POLICY vehiculos_archivos_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'vehiculos-archivos'
    AND usuario_activo_grupo()
  );

DROP POLICY IF EXISTS vehiculos_archivos_delete ON storage.objects;
CREATE POLICY vehiculos_archivos_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'vehiculos-archivos'
    AND usuario_activo_grupo()
  );

-- Trigger updated_at
CREATE OR REPLACE FUNCTION trg_vehiculos_documentos_updated()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_vd_updated ON vehiculos_documentos;
CREATE TRIGGER trg_vd_updated
  BEFORE UPDATE ON vehiculos_documentos
  FOR EACH ROW EXECUTE FUNCTION trg_vehiculos_documentos_updated();

-- Vista: documentos con info de vencimiento agrupados
CREATE OR REPLACE VIEW v_vehiculos_documentos_alertas AS
SELECT
  d.*,
  v.empresa_id,
  v.placa,
  v.marca,
  v.modelo,
  CASE
    WHEN d.fecha_vencimiento IS NULL THEN 'sin_vencimiento'
    WHEN d.fecha_vencimiento < CURRENT_DATE THEN 'vencido'
    WHEN d.fecha_vencimiento <= CURRENT_DATE + INTERVAL '15 days' THEN 'urgente'
    WHEN d.fecha_vencimiento <= CURRENT_DATE + INTERVAL '60 days' THEN 'proximo'
    ELSE 'vigente'
  END AS estado_vencimiento,
  CASE
    WHEN d.fecha_vencimiento IS NULL THEN NULL
    ELSE (d.fecha_vencimiento - CURRENT_DATE)
  END AS dias_para_vencer
FROM vehiculos_documentos d
LEFT JOIN vehiculos v ON v.id = d.vehiculo_id;
