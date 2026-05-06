-- ============================================================================
-- Sprint S.1 — Ajustes Gerenciales (capa paralela a contabilidad fiscal)
-- ============================================================================
-- Capa interna restringida a CEO + contralor + tesorero_corporativo. Documenta
-- activos, pasivos y capital que NO están en la contabilidad fiscal (PDFs del
-- despacho) pero existen económicamente. Convive con estados_financieros_mensuales,
-- no los reemplaza.
-- ============================================================================

-- 1. Enums
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tipo_ajuste_gerencial') THEN
    CREATE TYPE tipo_ajuste_gerencial AS ENUM (
      'inventario_gastado_existente',
      'construccion_remodelacion_oficina',
      'equipo_herramienta_gastado',
      'prestamo_personal_negocio',
      'aportacion_no_formalizada'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'naturaleza_ajuste') THEN
    CREATE TYPE naturaleza_ajuste AS ENUM (
      'activo',          -- suma a activos (inventario, equipo, construcción)
      'pasivo',          -- suma a pasivos (préstamos personales)
      'capital'          -- suma a capital (aportaciones)
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'estado_ajuste_gerencial') THEN
    CREATE TYPE estado_ajuste_gerencial AS ENUM (
      'borrador',        -- aún no aplicado a vista real
      'vigente',         -- activo en vista real
      'regularizado',    -- ya pasó a contabilidad fiscal
      'cancelado'        -- error o decisión, soft-delete
    );
  END IF;
END$$;

-- 2. Tabla principal
CREATE TABLE IF NOT EXISTS ajustes_gerenciales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  codigo TEXT UNIQUE,
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE RESTRICT,

  tipo tipo_ajuste_gerencial NOT NULL,
  naturaleza naturaleza_ajuste NOT NULL,

  descripcion TEXT NOT NULL,
  valor NUMERIC(14, 2) NOT NULL CHECK (valor >= 0),

  fecha_adquisicion DATE NOT NULL,
  fecha_registro DATE NOT NULL DEFAULT CURRENT_DATE,

  vida_util_anios INTEGER CHECK (vida_util_anios IS NULL OR vida_util_anios > 0),
  valor_residual_pct NUMERIC(5, 2) DEFAULT 10
    CHECK (valor_residual_pct >= 0 AND valor_residual_pct <= 100),

  justificacion TEXT NOT NULL CHECK (LENGTH(justificacion) >= 20),

  oc_origen_id UUID REFERENCES ordenes_compra(id) ON DELETE SET NULL,
  cfdi_origen_id UUID REFERENCES cfdi(id) ON DELETE SET NULL,
  observaciones_origen TEXT,

  contraparte_nombre TEXT,
  contraparte_relacion TEXT CHECK (
    contraparte_relacion IS NULL
    OR contraparte_relacion IN ('fundador', 'socio', 'familiar', 'tercero')
  ),

  estado estado_ajuste_gerencial DEFAULT 'borrador',

  regularizado_fecha DATE,
  regularizado_observaciones TEXT,

  registrado_por UUID NOT NULL REFERENCES auth.users(id),
  modificado_por UUID REFERENCES auth.users(id),

  observaciones TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ajustes_empresa
  ON ajustes_gerenciales(empresa_id, estado);
CREATE INDEX IF NOT EXISTS idx_ajustes_tipo
  ON ajustes_gerenciales(tipo, estado);
CREATE INDEX IF NOT EXISTS idx_ajustes_fecha
  ON ajustes_gerenciales(fecha_adquisicion DESC);

-- 3. Documentos de soporte
CREATE TABLE IF NOT EXISTS ajustes_gerenciales_documentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ajuste_id UUID NOT NULL REFERENCES ajustes_gerenciales(id) ON DELETE CASCADE,
  tipo_documento TEXT NOT NULL CHECK (tipo_documento IN (
    'factura_origen', 'foto_activo', 'pagare',
    'evidencia_aportacion', 'avaluo', 'otro'
  )),
  nombre TEXT NOT NULL,
  url TEXT NOT NULL,
  fecha_documento DATE,
  observaciones TEXT,
  subido_por UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ajustes_docs_ajuste
  ON ajustes_gerenciales_documentos(ajuste_id);

-- 4. Log de auditoría (cada visualización + cada cambio)
CREATE TABLE IF NOT EXISTS ajustes_gerenciales_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID NOT NULL REFERENCES auth.users(id),
  accion TEXT NOT NULL CHECK (accion IN (
    'visualizacion_lista',
    'visualizacion_detalle',
    'visualizacion_dual',
    'crear', 'actualizar', 'cancelar', 'regularizar',
    'agregar_documento', 'eliminar_documento',
    'exportar_excel'
  )),
  ajuste_id UUID REFERENCES ajustes_gerenciales(id) ON DELETE CASCADE,
  detalles JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ajustes_audit_usuario
  ON ajustes_gerenciales_audit(usuario_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ajustes_audit_ajuste
  ON ajustes_gerenciales_audit(ajuste_id, created_at DESC);

-- 5. Trigger para código secuencial AG-AAAA-NNNN
CREATE OR REPLACE FUNCTION trg_ajuste_gerencial_codigo()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_anio INTEGER;
  v_seq INTEGER;
BEGIN
  IF NEW.codigo IS NULL THEN
    v_anio := EXTRACT(YEAR FROM NOW());
    SELECT COALESCE(MAX(
      CAST(SUBSTRING(codigo FROM 'AG-' || v_anio || '-(\d+)') AS INTEGER)
    ), 0) + 1
    INTO v_seq
    FROM ajustes_gerenciales
    WHERE codigo LIKE 'AG-' || v_anio || '-%';
    NEW.codigo := 'AG-' || v_anio || '-' || LPAD(v_seq::TEXT, 4, '0');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ajuste_codigo_insert ON ajustes_gerenciales;
CREATE TRIGGER trg_ajuste_codigo_insert
  BEFORE INSERT ON ajustes_gerenciales
  FOR EACH ROW EXECUTE FUNCTION trg_ajuste_gerencial_codigo();

-- 6. Trigger updated_at
DROP TRIGGER IF EXISTS set_updated_at_ajustes ON ajustes_gerenciales;
CREATE TRIGGER set_updated_at_ajustes BEFORE UPDATE ON ajustes_gerenciales
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- 7. Storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('ajustes-gerenciales-docs', 'ajustes-gerenciales-docs', false)
ON CONFLICT (id) DO NOTHING;

-- 8. Helper SQL: ¿usuario puede ver ajustes gerenciales?
CREATE OR REPLACE FUNCTION usuario_puede_ver_ajustes_gerenciales()
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER AS $$
  SELECT
    usuario_es_ceo()
    OR usuario_tiene_atributo('contralor')
    OR usuario_tiene_atributo('tesorero_corporativo');
$$;

-- 9. RLS estricto
ALTER TABLE ajustes_gerenciales ENABLE ROW LEVEL SECURITY;
ALTER TABLE ajustes_gerenciales_documentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE ajustes_gerenciales_audit ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ag_select ON ajustes_gerenciales;
CREATE POLICY ag_select ON ajustes_gerenciales FOR SELECT TO authenticated
  USING (usuario_puede_ver_ajustes_gerenciales());

DROP POLICY IF EXISTS ag_insert ON ajustes_gerenciales;
CREATE POLICY ag_insert ON ajustes_gerenciales FOR INSERT TO authenticated
  WITH CHECK (
    usuario_puede_ver_ajustes_gerenciales()
    AND registrado_por = auth.uid()
  );

DROP POLICY IF EXISTS ag_update ON ajustes_gerenciales;
CREATE POLICY ag_update ON ajustes_gerenciales FOR UPDATE TO authenticated
  USING (usuario_puede_ver_ajustes_gerenciales())
  WITH CHECK (usuario_puede_ver_ajustes_gerenciales());

-- NO DELETE policy: solo soft delete vía estado='cancelado'

-- Documentos
DROP POLICY IF EXISTS agd_select ON ajustes_gerenciales_documentos;
CREATE POLICY agd_select ON ajustes_gerenciales_documentos FOR SELECT TO authenticated
  USING (usuario_puede_ver_ajustes_gerenciales());

DROP POLICY IF EXISTS agd_insert ON ajustes_gerenciales_documentos;
CREATE POLICY agd_insert ON ajustes_gerenciales_documentos FOR INSERT TO authenticated
  WITH CHECK (
    usuario_puede_ver_ajustes_gerenciales()
    AND subido_por = auth.uid()
  );

DROP POLICY IF EXISTS agd_delete ON ajustes_gerenciales_documentos;
CREATE POLICY agd_delete ON ajustes_gerenciales_documentos FOR DELETE TO authenticated
  USING (usuario_puede_ver_ajustes_gerenciales());

-- Audit: solo CEO ve los logs
DROP POLICY IF EXISTS aga_select ON ajustes_gerenciales_audit;
CREATE POLICY aga_select ON ajustes_gerenciales_audit FOR SELECT TO authenticated
  USING (usuario_es_ceo());

DROP POLICY IF EXISTS aga_insert ON ajustes_gerenciales_audit;
CREATE POLICY aga_insert ON ajustes_gerenciales_audit FOR INSERT TO authenticated
  WITH CHECK (
    usuario_id = auth.uid()
    AND usuario_puede_ver_ajustes_gerenciales()
  );

-- 10. Storage policies
DROP POLICY IF EXISTS ag_storage_select ON storage.objects;
CREATE POLICY ag_storage_select ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'ajustes-gerenciales-docs' AND usuario_puede_ver_ajustes_gerenciales());

DROP POLICY IF EXISTS ag_storage_insert ON storage.objects;
CREATE POLICY ag_storage_insert ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'ajustes-gerenciales-docs' AND usuario_puede_ver_ajustes_gerenciales());

DROP POLICY IF EXISTS ag_storage_delete ON storage.objects;
CREATE POLICY ag_storage_delete ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'ajustes-gerenciales-docs' AND usuario_puede_ver_ajustes_gerenciales());

-- 11. Vista enriquecida para listado
CREATE OR REPLACE VIEW v_ajustes_gerenciales_enriquecido AS
SELECT
  a.id, a.codigo, a.empresa_id, a.tipo, a.naturaleza,
  a.descripcion, a.valor,
  a.fecha_adquisicion, a.fecha_registro,
  a.vida_util_anios, a.valor_residual_pct,
  a.justificacion,
  a.oc_origen_id, a.cfdi_origen_id, a.observaciones_origen,
  a.contraparte_nombre, a.contraparte_relacion,
  a.estado,
  a.regularizado_fecha, a.regularizado_observaciones,
  a.registrado_por, a.modificado_por,
  a.observaciones,
  a.created_at, a.updated_at,
  e.codigo AS empresa_codigo,
  e.nombre_comercial AS empresa_nombre,
  CASE
    WHEN a.vida_util_anios IS NOT NULL THEN
      GREATEST(
        a.valor * (a.valor_residual_pct / 100),
        a.valor - (
          a.valor * (1 - a.valor_residual_pct / 100) *
          LEAST(EXTRACT(YEAR FROM AGE(CURRENT_DATE, a.fecha_adquisicion)), a.vida_util_anios) /
          a.vida_util_anios
        )
      )
    ELSE a.valor
  END AS valor_en_libros,
  (SELECT COUNT(*) FROM ajustes_gerenciales_documentos d WHERE d.ajuste_id = a.id) AS num_documentos,
  (SELECT email FROM auth.users WHERE id = a.registrado_por) AS registrado_por_email
FROM ajustes_gerenciales a
LEFT JOIN empresas e ON e.id = a.empresa_id
WHERE a.estado != 'cancelado';

-- 12. Vista de totales por naturaleza
CREATE OR REPLACE VIEW v_ajustes_gerenciales_totales AS
SELECT
  empresa_id,
  naturaleza,
  tipo,
  COUNT(*) AS num_ajustes,
  SUM(valor) AS valor_total,
  SUM(
    CASE
      WHEN vida_util_anios IS NOT NULL THEN
        GREATEST(
          valor * (valor_residual_pct / 100),
          valor - (
            valor * (1 - valor_residual_pct / 100) *
            LEAST(EXTRACT(YEAR FROM AGE(CURRENT_DATE, fecha_adquisicion)), vida_util_anios) /
            vida_util_anios
          )
        )
      ELSE valor
    END
  ) AS valor_en_libros_total
FROM ajustes_gerenciales
WHERE estado = 'vigente'
GROUP BY empresa_id, naturaleza, tipo;

-- 13. Funciones helper para vista dual (S.3)
CREATE OR REPLACE FUNCTION ajustes_totales_por_empresa(p_empresa_id UUID)
RETURNS TABLE(
  naturaleza naturaleza_ajuste,
  tipo tipo_ajuste_gerencial,
  num_ajustes BIGINT,
  valor_total NUMERIC,
  valor_en_libros_total NUMERIC
) LANGUAGE SQL STABLE AS $$
  SELECT
    naturaleza, tipo, num_ajustes, valor_total, valor_en_libros_total
  FROM v_ajustes_gerenciales_totales
  WHERE empresa_id = p_empresa_id;
$$;

CREATE OR REPLACE FUNCTION resumen_ajustes_grupo()
RETURNS TABLE(
  total_activos_ocultos NUMERIC,
  total_pasivos_no_registrados NUMERIC,
  total_capital_no_formalizado NUMERIC,
  num_ajustes_vigentes BIGINT,
  num_ajustes_borrador BIGINT
) LANGUAGE SQL STABLE AS $$
  SELECT
    COALESCE((SELECT SUM(valor_en_libros_total) FROM v_ajustes_gerenciales_totales WHERE naturaleza = 'activo'), 0),
    COALESCE((SELECT SUM(valor_total) FROM v_ajustes_gerenciales_totales WHERE naturaleza = 'pasivo'), 0),
    COALESCE((SELECT SUM(valor_total) FROM v_ajustes_gerenciales_totales WHERE naturaleza = 'capital'), 0),
    (SELECT COUNT(*) FROM ajustes_gerenciales WHERE estado = 'vigente'),
    (SELECT COUNT(*) FROM ajustes_gerenciales WHERE estado = 'borrador');
$$;

COMMENT ON TABLE ajustes_gerenciales IS
  'Ajustes gerenciales: activos, pasivos y capital no registrados en contabilidad fiscal. Capa interna paralela a estados-financieros (PDFs del despacho). Acceso restringido a CEO + contralor + tesorero_corporativo.';

COMMENT ON VIEW v_ajustes_gerenciales_totales IS
  'Totales por naturaleza (activo/pasivo/capital) y tipo. Usado para vista dual en /finanzas/vista-real.';
