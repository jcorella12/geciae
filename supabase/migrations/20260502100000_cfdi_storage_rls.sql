-- Sprint 6 (versión simplificada — sin PAC) — registro manual de CFDI.
-- Storage bucket + RLS + índice único por UUID.

-- 1. Bucket privado para XML/PDF de CFDI
INSERT INTO storage.buckets (id, name, public)
VALUES ('cfdi', 'cfdi', FALSE)
ON CONFLICT (id) DO NOTHING;

-- 2. Storage policies — usuarios solo ven archivos de CFDI de empresas suyas
DROP POLICY IF EXISTS cfdi_storage_select ON storage.objects;
CREATE POLICY cfdi_storage_select ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'cfdi'
    AND (
      usuario_es_ceo()
      OR EXISTS (
        SELECT 1 FROM cfdi c
        WHERE c.url_xml LIKE '%' || name || '%'
           OR c.url_pdf LIKE '%' || name || '%'
        AND (
          c.empresa_id IN (SELECT empresas_del_usuario())
          OR usuario_tiene_atributo('tesorero_corporativo')
        )
      )
    )
  );

DROP POLICY IF EXISTS cfdi_storage_insert ON storage.objects;
CREATE POLICY cfdi_storage_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'cfdi');

DROP POLICY IF EXISTS cfdi_storage_delete ON storage.objects;
CREATE POLICY cfdi_storage_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'cfdi'
    AND (usuario_es_ceo() OR usuario_tiene_atributo('tesorero_corporativo'))
  );

-- 3. RLS para tabla cfdi
ALTER TABLE cfdi ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS cfdi_select ON cfdi;
CREATE POLICY cfdi_select ON cfdi
  FOR SELECT TO authenticated
  USING (
    empresa_id IN (SELECT empresas_del_usuario())
    OR usuario_es_ceo()
    OR usuario_tiene_atributo('tesorero_corporativo')
    OR usuario_tiene_atributo('auditor_interno')
  );

DROP POLICY IF EXISTS cfdi_insert ON cfdi;
CREATE POLICY cfdi_insert ON cfdi
  FOR INSERT TO authenticated
  WITH CHECK (
    empresa_id IN (SELECT empresas_del_usuario())
    OR usuario_es_ceo()
    OR usuario_tiene_atributo('tesorero_corporativo')
  );

DROP POLICY IF EXISTS cfdi_update ON cfdi;
CREATE POLICY cfdi_update ON cfdi
  FOR UPDATE TO authenticated
  USING (
    empresa_id IN (SELECT empresas_del_usuario())
    OR usuario_es_ceo()
    OR usuario_tiene_atributo('tesorero_corporativo')
  );

DROP POLICY IF EXISTS cfdi_delete ON cfdi;
CREATE POLICY cfdi_delete ON cfdi
  FOR DELETE TO authenticated
  USING (usuario_es_ceo() OR usuario_tiene_atributo('tesorero_corporativo'));

-- 4. RLS para cfdi_conceptos / cfdi_pagos (heredan visibilidad del CFDI padre)
ALTER TABLE cfdi_conceptos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS cfdi_conceptos_all ON cfdi_conceptos;
CREATE POLICY cfdi_conceptos_all ON cfdi_conceptos
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM cfdi
      WHERE cfdi.id = cfdi_conceptos.cfdi_id
        AND (
          cfdi.empresa_id IN (SELECT empresas_del_usuario())
          OR usuario_es_ceo()
          OR usuario_tiene_atributo('tesorero_corporativo')
          OR usuario_tiene_atributo('auditor_interno')
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM cfdi
      WHERE cfdi.id = cfdi_conceptos.cfdi_id
        AND (
          cfdi.empresa_id IN (SELECT empresas_del_usuario())
          OR usuario_es_ceo()
          OR usuario_tiene_atributo('tesorero_corporativo')
        )
    )
  );

ALTER TABLE cfdi_pagos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS cfdi_pagos_select ON cfdi_pagos;
CREATE POLICY cfdi_pagos_select ON cfdi_pagos
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM cfdi
      WHERE cfdi.id = cfdi_pagos.cfdi_id
        AND (
          cfdi.empresa_id IN (SELECT empresas_del_usuario())
          OR usuario_es_ceo()
          OR usuario_tiene_atributo('tesorero_corporativo')
        )
    )
  );

-- 5. Trigger: auto-calcular saldo_pendiente y fecha de actualización
CREATE OR REPLACE FUNCTION actualizar_saldo_cfdi()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.saldo_pendiente := NEW.total - COALESCE(NEW.monto_pagado, 0);
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_saldo_cfdi ON cfdi;
CREATE TRIGGER trg_saldo_cfdi
  BEFORE INSERT OR UPDATE OF total, monto_pagado ON cfdi
  FOR EACH ROW
  EXECUTE FUNCTION actualizar_saldo_cfdi();

-- 6. Constraint: UUID único cuando existe (no permitir duplicados de la misma factura SAT)
DROP INDEX IF EXISTS idx_cfdi_uuid_unique;
CREATE UNIQUE INDEX idx_cfdi_uuid_unique ON cfdi(uuid_sat) WHERE uuid_sat IS NOT NULL;
