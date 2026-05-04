-- ============================================================================
-- Sprint 2.2 — Clientes potenciales (sin RFC) para pipeline residencial
--
-- Hoy clientes.rfc es NOT NULL, lo que bloquea el caso típico residencial:
-- "Casa Don Juan" llega como lead sin RFC. Este patch:
--
--  - Hace rfc opcional
--  - Marca el cliente como `es_potencial = TRUE` cuando se crea sin RFC
--  - Restricción: si NO es potencial → RFC obligatorio
--  - Conversión potencial→formal con `fecha_conversion`
--
-- Cero cambios en clientes existentes (todos quedan es_potencial=FALSE).
-- ============================================================================

-- 1. RFC ya no es NOT NULL
ALTER TABLE clientes
  ALTER COLUMN rfc DROP NOT NULL;

-- 2. Columnas nuevas
ALTER TABLE clientes
  ADD COLUMN IF NOT EXISTS es_potencial BOOLEAN DEFAULT FALSE NOT NULL,
  ADD COLUMN IF NOT EXISTS fecha_conversion DATE,
  ADD COLUMN IF NOT EXISTS notas_potencial TEXT,
  ADD COLUMN IF NOT EXISTS telefono_potencial TEXT,
  ADD COLUMN IF NOT EXISTS ciudad_potencial TEXT;

-- 3. Constraint: si NO es potencial, RFC obligatorio.
--    (Si es potencial, RFC puede ser NULL).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_cliente_rfc_potencial'
  ) THEN
    ALTER TABLE clientes
      ADD CONSTRAINT chk_cliente_rfc_potencial
      CHECK (es_potencial = TRUE OR rfc IS NOT NULL);
  END IF;
END$$;

-- 4. Índice parcial para listar potenciales rápido
CREATE INDEX IF NOT EXISTS idx_clientes_es_potencial
  ON clientes(es_potencial) WHERE es_potencial = TRUE;

-- 5. UNIQUE(rfc) sigue valiendo para clientes con RFC; los potenciales sin
--    RFC simplemente quedan fuera del unique. Postgres permite múltiples NULL
--    en columnas con UNIQUE. Si se quiere rigor, podemos cambiar a
--    UNIQUE INDEX con WHERE rfc IS NOT NULL — opcional.

-- 6. Comentarios
COMMENT ON COLUMN clientes.es_potencial IS
  'TRUE = cliente potencial (lead sin RFC). FALSE = cliente formal (default).';
COMMENT ON COLUMN clientes.fecha_conversion IS
  'Fecha en que un cliente potencial fue convertido a formal (RFC capturado).';
COMMENT ON COLUMN clientes.telefono_potencial IS
  'Teléfono de contacto cuando el cliente aún no tiene RFC.';
COMMENT ON COLUMN clientes.ciudad_potencial IS
  'Ciudad cuando el cliente aún no tiene CP fiscal.';
