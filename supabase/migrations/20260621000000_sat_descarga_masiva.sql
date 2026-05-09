-- ============================================================================
-- Sprint 8.1 — Descarga directa SAT: FIEL segura + tracking de descargas
-- ============================================================================
-- Acceso restringido a CEO + atributo contralor. Maneja material criptográfico
-- crítico (FIEL) con encriptación AES-256-GCM y storage privado.
-- ============================================================================

-- 1. Enums
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'estado_fiel') THEN
    CREATE TYPE estado_fiel AS ENUM (
      'activa',
      'vencida',
      'revocada',
      'archivada'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tipo_descarga_sat') THEN
    CREATE TYPE tipo_descarga_sat AS ENUM (
      'emitidos', 'recibidos'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'estado_descarga_sat') THEN
    CREATE TYPE estado_descarga_sat AS ENUM (
      'borrador',
      'solicitada',
      'verificando',
      'lista_descargar',
      'descargando',
      'descargada',
      'procesando',
      'completada',
      'error',
      'expirada'
    );
  END IF;
END$$;

-- 2. Tabla sat_credenciales (FIEL)
CREATE TABLE IF NOT EXISTS sat_credenciales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE RESTRICT,
  rfc TEXT NOT NULL,

  cer_storage_path TEXT NOT NULL,
  key_storage_path TEXT NOT NULL,

  password_encrypted TEXT NOT NULL,

  numero_serie TEXT NOT NULL,
  vigencia_desde DATE NOT NULL,
  vigencia_hasta DATE NOT NULL,
  rfc_certificado TEXT NOT NULL,
  razon_social_certificado TEXT,

  estado estado_fiel DEFAULT 'activa',
  observaciones TEXT,

  registrada_por UUID NOT NULL REFERENCES auth.users(id),
  ultima_validacion_at TIMESTAMPTZ,
  veces_usada INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Solo una FIEL activa por empresa
CREATE UNIQUE INDEX IF NOT EXISTS idx_sat_cred_empresa_activa
  ON sat_credenciales(empresa_id) WHERE estado = 'activa';
CREATE INDEX IF NOT EXISTS idx_sat_cred_vigencia
  ON sat_credenciales(vigencia_hasta) WHERE estado = 'activa';

-- 3. Tabla sat_descargas
CREATE TABLE IF NOT EXISTS sat_descargas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE RESTRICT,

  tipo_descarga tipo_descarga_sat NOT NULL,
  fecha_inicio DATE NOT NULL,
  fecha_fin DATE NOT NULL,

  sat_request_id TEXT,
  sat_package_ids TEXT[],
  numero_cfdis_estimados INTEGER,

  estado estado_descarga_sat NOT NULL DEFAULT 'borrador',
  intentos_verificacion INTEGER DEFAULT 0,
  ultima_verificacion_at TIMESTAMPTZ,

  cfdis_descargados INTEGER DEFAULT 0,
  cfdis_importados INTEGER DEFAULT 0,
  cfdis_duplicados INTEGER DEFAULT 0,
  cfdis_con_error INTEGER DEFAULT 0,

  paquetes_storage_paths TEXT[],
  error_mensaje TEXT,
  error_detalles JSONB,

  iniciada_por UUID NOT NULL REFERENCES auth.users(id),
  iniciada_at TIMESTAMPTZ DEFAULT NOW(),
  completada_at TIMESTAMPTZ,
  duracion_segundos INTEGER,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sat_desc_empresa
  ON sat_descargas(empresa_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sat_desc_estado
  ON sat_descargas(estado) WHERE estado IN ('solicitada', 'verificando', 'lista_descargar');
CREATE INDEX IF NOT EXISTS idx_sat_desc_request_id
  ON sat_descargas(sat_request_id) WHERE sat_request_id IS NOT NULL;

-- 4. Triggers updated_at
DROP TRIGGER IF EXISTS set_updated_at_sat_cred ON sat_credenciales;
CREATE TRIGGER set_updated_at_sat_cred BEFORE UPDATE ON sat_credenciales
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_sat_desc ON sat_descargas;
CREATE TRIGGER set_updated_at_sat_desc BEFORE UPDATE ON sat_descargas
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- 5. Storage buckets PRIVADOS
INSERT INTO storage.buckets (id, name, public)
VALUES
  ('sat-fiel', 'sat-fiel', false),
  ('sat-paquetes', 'sat-paquetes', false)
ON CONFLICT (id) DO NOTHING;

-- 6. Helper SQL: solo CEO o contralor
CREATE OR REPLACE FUNCTION usuario_puede_gestionar_sat()
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER AS $$
  SELECT
    usuario_es_ceo()
    OR usuario_tiene_atributo('contralor');
$$;

COMMENT ON FUNCTION usuario_puede_gestionar_sat IS
  'Solo CEO o contralor pueden gestionar FIELs y solicitar descargas SAT.';

-- 7. RLS sat_credenciales
ALTER TABLE sat_credenciales ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS sat_cred_select ON sat_credenciales;
CREATE POLICY sat_cred_select ON sat_credenciales FOR SELECT TO authenticated
  USING (usuario_puede_gestionar_sat());

DROP POLICY IF EXISTS sat_cred_insert ON sat_credenciales;
CREATE POLICY sat_cred_insert ON sat_credenciales FOR INSERT TO authenticated
  WITH CHECK (
    usuario_puede_gestionar_sat()
    AND registrada_por = auth.uid()
  );

DROP POLICY IF EXISTS sat_cred_update ON sat_credenciales;
CREATE POLICY sat_cred_update ON sat_credenciales FOR UPDATE TO authenticated
  USING (usuario_puede_gestionar_sat())
  WITH CHECK (usuario_puede_gestionar_sat());

-- 8. RLS sat_descargas
ALTER TABLE sat_descargas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS sat_desc_select ON sat_descargas;
CREATE POLICY sat_desc_select ON sat_descargas FOR SELECT TO authenticated
  USING (usuario_puede_gestionar_sat());

DROP POLICY IF EXISTS sat_desc_insert ON sat_descargas;
CREATE POLICY sat_desc_insert ON sat_descargas FOR INSERT TO authenticated
  WITH CHECK (
    usuario_puede_gestionar_sat()
    AND iniciada_por = auth.uid()
  );

DROP POLICY IF EXISTS sat_desc_update ON sat_descargas;
CREATE POLICY sat_desc_update ON sat_descargas FOR UPDATE TO authenticated
  USING (usuario_puede_gestionar_sat())
  WITH CHECK (usuario_puede_gestionar_sat());

-- 9. Storage policies: bucket sat-fiel
DROP POLICY IF EXISTS sat_fiel_select ON storage.objects;
CREATE POLICY sat_fiel_select ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'sat-fiel' AND usuario_puede_gestionar_sat());

DROP POLICY IF EXISTS sat_fiel_insert ON storage.objects;
CREATE POLICY sat_fiel_insert ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'sat-fiel' AND usuario_puede_gestionar_sat());

DROP POLICY IF EXISTS sat_fiel_delete ON storage.objects;
CREATE POLICY sat_fiel_delete ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'sat-fiel' AND usuario_puede_gestionar_sat());

-- 10. Storage policies: bucket sat-paquetes
DROP POLICY IF EXISTS sat_paq_select ON storage.objects;
CREATE POLICY sat_paq_select ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'sat-paquetes' AND usuario_puede_gestionar_sat());

DROP POLICY IF EXISTS sat_paq_insert ON storage.objects;
CREATE POLICY sat_paq_insert ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'sat-paquetes' AND usuario_puede_gestionar_sat());

-- 11. Vista enriquecida
CREATE OR REPLACE VIEW v_sat_credenciales_enriquecido AS
SELECT
  sc.id,
  sc.empresa_id,
  e.codigo AS empresa_codigo,
  e.nombre_comercial AS empresa_nombre,
  sc.rfc,
  sc.numero_serie,
  sc.vigencia_desde,
  sc.vigencia_hasta,
  CASE
    WHEN sc.vigencia_hasta < CURRENT_DATE THEN 'vencida'
    WHEN sc.vigencia_hasta < CURRENT_DATE + INTERVAL '30 days' THEN 'por_vencer'
    ELSE 'vigente'
  END AS estatus_vigencia,
  (sc.vigencia_hasta - CURRENT_DATE)::INTEGER AS dias_restantes,
  sc.estado,
  sc.veces_usada,
  sc.ultima_validacion_at,
  sc.created_at
FROM sat_credenciales sc
JOIN empresas e ON e.id = sc.empresa_id
WHERE sc.estado != 'archivada';

COMMENT ON VIEW v_sat_credenciales_enriquecido IS
  'FIELs activas/vencidas con estatus de vigencia calculado.';

COMMENT ON TABLE sat_credenciales IS
  'Credenciales FIEL/eFirma de cada empresa. Material criptografico critico — RLS estricto.';

COMMENT ON TABLE sat_descargas IS
  'Tracking de cada solicitud de descarga masiva al SAT con su flujo completo.';
