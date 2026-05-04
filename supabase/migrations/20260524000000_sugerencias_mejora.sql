-- ============================================================================
-- Sprint 5.1 — Tabla de feedback continuo (sugerencias de mejora)
--
-- Permite a cualquier usuario reportar fricciones, bugs o ideas desde la app
-- vía un botón global. CEO ve todas en /admin/sugerencias.
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'categoria_sugerencia') THEN
    CREATE TYPE categoria_sugerencia AS ENUM (
      'bug',
      'mejora_ux',
      'feature_nuevo',
      'rendimiento',
      'otro'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'estado_sugerencia') THEN
    CREATE TYPE estado_sugerencia AS ENUM (
      'nueva',
      'en_revision',
      'planeada',
      'implementada',
      'descartada'
    );
  END IF;
END$$;

CREATE TABLE IF NOT EXISTS sugerencias_mejora (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID NOT NULL REFERENCES auth.users(id),
  empresa_contexto UUID REFERENCES empresas(id),
  categoria categoria_sugerencia NOT NULL DEFAULT 'mejora_ux',
  descripcion TEXT NOT NULL CHECK (length(descripcion) > 0),
  url_contexto TEXT,
  user_agent TEXT,
  estado estado_sugerencia DEFAULT 'nueva' NOT NULL,
  prioridad INTEGER DEFAULT 0 CHECK (prioridad BETWEEN 0 AND 100),
  notas_internas TEXT,
  asignado_a UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sugerencias_estado
  ON sugerencias_mejora(estado);
CREATE INDEX IF NOT EXISTS idx_sugerencias_usuario
  ON sugerencias_mejora(usuario_id);
CREATE INDEX IF NOT EXISTS idx_sugerencias_categoria
  ON sugerencias_mejora(categoria);

-- Touch trigger
CREATE OR REPLACE FUNCTION sugerencias_touch()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sugerencias_touch ON sugerencias_mejora;
CREATE TRIGGER trg_sugerencias_touch
  BEFORE UPDATE ON sugerencias_mejora
  FOR EACH ROW EXECUTE FUNCTION sugerencias_touch();

-- ============================================================================
-- RLS
-- ============================================================================

ALTER TABLE sugerencias_mejora ENABLE ROW LEVEL SECURITY;

-- Cualquier user autenticado puede crear sugerencias propias
DROP POLICY IF EXISTS sm_insert ON sugerencias_mejora;
CREATE POLICY sm_insert ON sugerencias_mejora
  FOR INSERT TO authenticated
  WITH CHECK (usuario_id = auth.uid());

-- Cada usuario ve las suyas; CEO ve todas
DROP POLICY IF EXISTS sm_select ON sugerencias_mejora;
CREATE POLICY sm_select ON sugerencias_mejora
  FOR SELECT TO authenticated
  USING (usuario_id = auth.uid() OR usuario_es_ceo());

-- Solo CEO modifica estado / notas / prioridad / asignación
DROP POLICY IF EXISTS sm_modify ON sugerencias_mejora;
CREATE POLICY sm_modify ON sugerencias_mejora
  FOR UPDATE TO authenticated
  USING (usuario_es_ceo());

DROP POLICY IF EXISTS sm_delete ON sugerencias_mejora;
CREATE POLICY sm_delete ON sugerencias_mejora
  FOR DELETE TO authenticated
  USING (usuario_es_ceo());

COMMENT ON TABLE sugerencias_mejora IS
  'Feedback continuo de usuarios — accesible vía botón global Sugerir mejora.';
