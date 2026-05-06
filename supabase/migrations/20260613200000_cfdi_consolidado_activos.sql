-- ============================================================================
-- Sprint Y.3 — CFDI consolidado de activos
-- ============================================================================

CREATE TABLE IF NOT EXISTS cfdi_consolidado_activos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero TEXT UNIQUE NOT NULL,

  empresa_emisora_id UUID NOT NULL REFERENCES empresas(id),
  empresa_receptora_id UUID NOT NULL REFERENCES empresas(id),

  periodo_anio INTEGER NOT NULL,
  periodo_mes INTEGER NOT NULL CHECK (periodo_mes BETWEEN 1 AND 12),

  num_prestamos INTEGER NOT NULL,
  subtotal NUMERIC(12,2) NOT NULL,
  iva NUMERIC(12,2) NOT NULL DEFAULT 0,
  total NUMERIC(12,2) NOT NULL,

  estado TEXT DEFAULT 'borrador' CHECK (estado IN ('borrador', 'listo_timbrar', 'timbrado', 'cancelado')),
  fecha_generacion TIMESTAMPTZ DEFAULT NOW(),
  generado_por UUID NOT NULL REFERENCES auth.users(id),

  cfdi_id UUID REFERENCES cfdi(id) ON DELETE SET NULL,
  uuid_sat TEXT,
  fecha_timbrado TIMESTAMPTZ,

  observaciones TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(empresa_emisora_id, empresa_receptora_id, periodo_anio, periodo_mes)
);

CREATE INDEX IF NOT EXISTS idx_cfdi_cons_periodo
  ON cfdi_consolidado_activos(periodo_anio, periodo_mes);
CREATE INDEX IF NOT EXISTS idx_cfdi_cons_emisora
  ON cfdi_consolidado_activos(empresa_emisora_id, estado);
CREATE INDEX IF NOT EXISTS idx_cfdi_cons_receptora
  ON cfdi_consolidado_activos(empresa_receptora_id, estado);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage
    WHERE constraint_name = 'fk_prestamo_cfdi_cons'
  ) THEN
    BEGIN
      ALTER TABLE prestamos_activos
        ADD CONSTRAINT fk_prestamo_cfdi_cons
        FOREIGN KEY (cfdi_consolidado_id) REFERENCES cfdi_consolidado_activos(id) ON DELETE SET NULL;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
  END IF;
END$$;

DROP TRIGGER IF EXISTS set_updated_at_cfdi_cons ON cfdi_consolidado_activos;
CREATE TRIGGER set_updated_at_cfdi_cons BEFORE UPDATE ON cfdi_consolidado_activos
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

ALTER TABLE cfdi_consolidado_activos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ccac_select ON cfdi_consolidado_activos;
CREATE POLICY ccac_select ON cfdi_consolidado_activos FOR SELECT TO authenticated
  USING (
    usuario_es_ceo()
    OR empresa_emisora_id IN (SELECT empresas_del_usuario())
    OR empresa_receptora_id IN (SELECT empresas_del_usuario())
  );

DROP POLICY IF EXISTS ccac_modify ON cfdi_consolidado_activos;
CREATE POLICY ccac_modify ON cfdi_consolidado_activos FOR ALL TO authenticated
  USING (
    usuario_es_ceo() OR EXISTS (
      SELECT 1 FROM usuarios_empresas
      WHERE usuario_id = auth.uid()
        AND empresa_id = cfdi_consolidado_activos.empresa_emisora_id
        AND (rol = 'director'::rol_usuario OR 'tesorero_corporativo' = ANY(atributos) OR 'contralor' = ANY(atributos))
        AND activo = TRUE
    )
  );

CREATE OR REPLACE VIEW v_prestamos_pendientes_facturar AS
SELECT p.*, a.codigo AS activo_codigo, a.nombre AS activo_nombre,
       es.codigo AS empresa_solicitante_codigo, ep.codigo AS empresa_propietaria_codigo
FROM prestamos_activos p
JOIN activos_grupo a ON a.id = p.activo_id
JOIN empresas es ON es.id = p.empresa_solicitante_id
JOIN empresas ep ON ep.id = p.empresa_propietaria_id
WHERE p.estado = 'devuelto' AND p.cfdi_consolidado_id IS NULL;

-- Seed CU Renta de Activos para empresas con activos
DO $$
DECLARE
  emp RECORD;
BEGIN
  FOR emp IN SELECT DISTINCT empresa_propietaria_id FROM activos_grupo WHERE activo = TRUE
  LOOP
    INSERT INTO centros (empresa_id, codigo, nombre, tipo, subtipo, activo)
    VALUES (emp.empresa_propietaria_id, 'CU-RENTA-ACTIVOS', 'Renta de Activos', 'utilidad', 'otro', TRUE)
    ON CONFLICT DO NOTHING;
  END LOOP;
END$$;
