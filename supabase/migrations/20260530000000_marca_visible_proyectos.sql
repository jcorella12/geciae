-- ============================================================================
-- Sprint 5.7 — Marca visible y separación de branding
--
-- Limson puede ejecutar proyectos bajo marca PSE (cuando el cliente fue
-- vendido por PSE) o bajo su propia marca (cuando es cliente directo).
-- Esto afecta documentos (cotizaciones, contratos, reportes), uniformes
-- y trato al cliente. NO afecta CFDIs (siempre desde empresa operativa).
-- ============================================================================

-- 1. Columnas en proyectos
ALTER TABLE proyectos
  ADD COLUMN IF NOT EXISTS marca_visible_id UUID REFERENCES empresas(id),
  ADD COLUMN IF NOT EXISTS uniforme_marca TEXT;

-- Backfill: marca = empresa para proyectos existentes
UPDATE proyectos SET marca_visible_id = empresa_id WHERE marca_visible_id IS NULL;

-- Hacer NOT NULL después del backfill
ALTER TABLE proyectos ALTER COLUMN marca_visible_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_proyectos_marca ON proyectos(marca_visible_id);

COMMENT ON COLUMN proyectos.marca_visible_id IS
  'Empresa cuya marca se mostrará al cliente (logo, nombre comercial, contacto). Default = empresa_id. Útil cuando Limson ejecuta bajo marca PSE.';
COMMENT ON COLUMN proyectos.uniforme_marca IS
  'Marca/empresa cuya identidad visual usa la cuadrilla en sitio. Texto libre.';

-- 2. Trigger de validación cliente↔marca (warning, no bloqueo)
CREATE OR REPLACE FUNCTION validar_cliente_marca_proyecto()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_cliente_empresa UUID;
BEGIN
  IF NEW.cliente_id IS NOT NULL AND NEW.marca_visible_id IS NOT NULL THEN
    -- clientes.empresa_id NO existe en este schema (los clientes son globales),
    -- así que esta validación se queda como hook reservado para el futuro
    -- cuando se agregue empresa_id a clientes (Sprint 7 plan).
    NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validar_cliente_marca ON proyectos;
CREATE TRIGGER trg_validar_cliente_marca
  BEFORE INSERT OR UPDATE OF cliente_id, marca_visible_id ON proyectos
  FOR EACH ROW EXECUTE FUNCTION validar_cliente_marca_proyecto();

-- 3. Vista: proyectos con marca distinta a empresa (informativo)
CREATE OR REPLACE VIEW v_proyectos_marca_diferente AS
SELECT
  p.id,
  p.nombre,
  p.empresa_id AS empresa_operativa_id,
  emp_op.codigo AS empresa_operativa_codigo,
  p.marca_visible_id,
  emp_marca.codigo AS marca_codigo,
  p.cliente_id,
  p.uniforme_marca,
  p.estado
FROM proyectos p
JOIN empresas emp_op ON emp_op.id = p.empresa_id
JOIN empresas emp_marca ON emp_marca.id = p.marca_visible_id
WHERE p.empresa_id <> p.marca_visible_id
  AND p.activo = TRUE;

COMMENT ON VIEW v_proyectos_marca_diferente IS
  'Proyectos donde la marca visible difiere de la empresa operativa (Limson bajo marca PSE, etc.).';
