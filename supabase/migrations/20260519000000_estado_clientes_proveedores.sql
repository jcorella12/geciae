-- ============================================================================
-- Sprint 1.5 — Sistema de archivado para clientes y proveedores
--
-- Objetivo: limpiar pickers/listas de la base histórica importada (10 años)
-- sin perder los datos. Tres estados:
--   - activo (default): aparece en pickers y listas
--   - inactivo: NO aparece en pickers, sí en listas con filtro
--   - archivado: solo visible con filtro explícito
--
-- Mantiene el campo legacy `activo BOOLEAN` para no romper código existente:
-- un trigger lo sincroniza con el nuevo `estado` (activo cuando estado='activo').
-- ============================================================================

-- 1. Enum del estado
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'estado_entidad') THEN
    CREATE TYPE estado_entidad AS ENUM ('activo', 'inactivo', 'archivado');
  END IF;
END$$;

-- 2. Columnas en clientes
ALTER TABLE clientes
  ADD COLUMN IF NOT EXISTS estado estado_entidad DEFAULT 'activo' NOT NULL,
  ADD COLUMN IF NOT EXISTS estado_motivo TEXT,
  ADD COLUMN IF NOT EXISTS estado_modificado_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS estado_modificado_por UUID REFERENCES auth.users(id);

-- 3. Columnas en proveedores
ALTER TABLE proveedores
  ADD COLUMN IF NOT EXISTS estado estado_entidad DEFAULT 'activo' NOT NULL,
  ADD COLUMN IF NOT EXISTS estado_motivo TEXT,
  ADD COLUMN IF NOT EXISTS estado_modificado_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS estado_modificado_por UUID REFERENCES auth.users(id);

-- 4. Índices
CREATE INDEX IF NOT EXISTS idx_clientes_estado ON clientes(estado);
CREATE INDEX IF NOT EXISTS idx_proveedores_estado ON proveedores(estado);

-- 5. Sincronizar `activo` (legacy) con `estado` mediante trigger.
--    Esto deja invariante el código viejo que filtra por `activo = true`.
CREATE OR REPLACE FUNCTION sync_estado_activo()
RETURNS TRIGGER AS $$
BEGIN
  -- Cuando cambia estado, ajusta activo
  IF (TG_OP = 'INSERT' OR NEW.estado IS DISTINCT FROM OLD.estado) THEN
    NEW.activo := (NEW.estado = 'activo');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_clientes_sync_estado ON clientes;
CREATE TRIGGER trg_clientes_sync_estado
  BEFORE INSERT OR UPDATE ON clientes
  FOR EACH ROW EXECUTE FUNCTION sync_estado_activo();

DROP TRIGGER IF EXISTS trg_proveedores_sync_estado ON proveedores;
CREATE TRIGGER trg_proveedores_sync_estado
  BEFORE INSERT OR UPDATE ON proveedores
  FOR EACH ROW EXECUTE FUNCTION sync_estado_activo();

-- 6. Vista de candidatos a archivar para CLIENTES
--    Última actividad = max(fecha_emision CFDI con cliente_id, created_at proyecto).
--    Sugerido si > 18 meses sin actividad y NO está ya archivado.
CREATE OR REPLACE VIEW v_clientes_inactividad AS
SELECT
  c.*,
  COALESCE(
    GREATEST(
      (SELECT MAX(fecha_emision) FROM cfdi WHERE cliente_id = c.id),
      (SELECT MAX(created_at) FROM proyectos WHERE cliente_id = c.id)
    )::DATE,
    NULL
  ) AS ultima_actividad,
  CASE
    WHEN c.estado = 'archivado' THEN FALSE
    WHEN COALESCE(
      GREATEST(
        (SELECT MAX(fecha_emision) FROM cfdi WHERE cliente_id = c.id),
        (SELECT MAX(created_at) FROM proyectos WHERE cliente_id = c.id)
      ),
      '1900-01-01'::TIMESTAMPTZ
    ) < (NOW() - INTERVAL '18 months') THEN TRUE
    ELSE FALSE
  END AS sugerido_archivar
FROM clientes c;

-- 7. Vista de candidatos a archivar para PROVEEDORES
--    Última actividad = max(fecha_emision CFDI con proveedor_id, fecha_emision OC).
CREATE OR REPLACE VIEW v_proveedores_inactividad AS
SELECT
  p.*,
  COALESCE(
    GREATEST(
      (SELECT MAX(fecha_emision) FROM cfdi WHERE proveedor_id = p.id),
      (SELECT MAX(fecha_emision) FROM ordenes_compra WHERE proveedor_id = p.id)
    )::DATE,
    NULL
  ) AS ultima_actividad,
  CASE
    WHEN p.estado = 'archivado' THEN FALSE
    WHEN COALESCE(
      GREATEST(
        (SELECT MAX(fecha_emision) FROM cfdi WHERE proveedor_id = p.id),
        (SELECT MAX(fecha_emision) FROM ordenes_compra WHERE proveedor_id = p.id)
      ),
      '1900-01-01'::TIMESTAMPTZ
    ) < (NOW() - INTERVAL '18 months') THEN TRUE
    ELSE FALSE
  END AS sugerido_archivar
FROM proveedores p;

-- 8. Comentarios para documentación
COMMENT ON COLUMN clientes.estado IS
  'Estado de archivado: activo (default), inactivo (oculto en pickers), archivado (oculto salvo filtro explícito).';
COMMENT ON COLUMN proveedores.estado IS
  'Estado de archivado: activo (default), inactivo (oculto en pickers), archivado (oculto salvo filtro explícito).';
COMMENT ON VIEW v_clientes_inactividad IS
  'Sugiere clientes para archivar: sin actividad CFDI/proyecto en 18+ meses.';
COMMENT ON VIEW v_proveedores_inactividad IS
  'Sugiere proveedores para archivar: sin actividad CFDI/OC en 18+ meses.';
