-- ============================================================================
-- Documentación de proveedores (Sprint 4 cierre)
-- ============================================================================
-- - Bucket de Storage `proveedores-docs` con RLS por usuario autenticado.
-- - Función `calcular_semaforo_proveedor` que evalúa vigencia de docs.
-- - Trigger en `proveedores_documentacion` que actualiza el semáforo del
--   proveedor automáticamente al subir/editar/borrar un documento.
-- ============================================================================

-- ---------- Bucket ----------
INSERT INTO storage.buckets (id, name, public)
VALUES ('proveedores-docs', 'proveedores-docs', false)
ON CONFLICT (id) DO NOTHING;

-- ---------- Storage RLS ----------
DROP POLICY IF EXISTS proveedores_docs_select ON storage.objects;
CREATE POLICY proveedores_docs_select ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'proveedores-docs'
    AND usuario_activo_grupo()
  );

DROP POLICY IF EXISTS proveedores_docs_insert ON storage.objects;
CREATE POLICY proveedores_docs_insert ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'proveedores-docs'
    AND usuario_puede_gestionar_catalogos()
  );

DROP POLICY IF EXISTS proveedores_docs_delete ON storage.objects;
CREATE POLICY proveedores_docs_delete ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'proveedores-docs'
    AND usuario_puede_gestionar_catalogos()
  );

-- ---------- Función: calcular semáforo según vigencia de docs ----------
CREATE OR REPLACE FUNCTION calcular_semaforo_proveedor(p_proveedor_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  prov RECORD;
  hoy DATE := CURRENT_DATE;
  has_repse_doc BOOLEAN;
BEGIN
  SELECT requiere_repse, semaforo INTO prov
  FROM proveedores
  WHERE id = p_proveedor_id;

  IF NOT FOUND THEN
    RETURN 'verde';
  END IF;

  -- Negro es manual (lista 69-B confirmada). No auto-degradar.
  IF prov.semaforo = 'negro' THEN
    RETURN 'negro';
  END IF;

  -- Si requiere REPSE y no hay doc REPSE activo → rojo
  IF prov.requiere_repse THEN
    SELECT EXISTS (
      SELECT 1 FROM proveedores_documentacion
      WHERE proveedor_id = p_proveedor_id
        AND tipo_documento = 'repse'
        AND activo = TRUE
    ) INTO has_repse_doc;
    IF NOT has_repse_doc THEN
      RETURN 'rojo';
    END IF;
  END IF;

  -- Si tiene algún doc activo vencido → rojo
  IF EXISTS (
    SELECT 1 FROM proveedores_documentacion
    WHERE proveedor_id = p_proveedor_id
      AND activo = TRUE
      AND fecha_vencimiento IS NOT NULL
      AND fecha_vencimiento < hoy
  ) THEN
    RETURN 'rojo';
  END IF;

  -- Si tiene algún doc por vencer en 30 días → amarillo
  IF EXISTS (
    SELECT 1 FROM proveedores_documentacion
    WHERE proveedor_id = p_proveedor_id
      AND activo = TRUE
      AND fecha_vencimiento IS NOT NULL
      AND fecha_vencimiento BETWEEN hoy AND hoy + INTERVAL '30 days'
  ) THEN
    RETURN 'amarillo';
  END IF;

  RETURN 'verde';
END;
$$;

-- ---------- Trigger ----------
CREATE OR REPLACE FUNCTION trg_actualizar_semaforo_proveedor()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  p_id UUID;
BEGIN
  p_id := COALESCE(NEW.proveedor_id, OLD.proveedor_id);
  UPDATE proveedores
  SET semaforo = calcular_semaforo_proveedor(p_id),
      updated_at = NOW()
  WHERE id = p_id;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS proveedores_doc_semaforo ON proveedores_documentacion;
CREATE TRIGGER proveedores_doc_semaforo
AFTER INSERT OR UPDATE OR DELETE ON proveedores_documentacion
FOR EACH ROW
EXECUTE FUNCTION trg_actualizar_semaforo_proveedor();
