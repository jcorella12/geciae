-- ============================================================================
-- Sprint Z+.2 — Favoritos por usuario
-- ============================================================================

CREATE TABLE IF NOT EXISTS favoritos_usuario (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entidad_tipo TEXT NOT NULL,
  entidad_id UUID NOT NULL,
  etiqueta TEXT,
  notas TEXT,
  orden INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(usuario_id, entidad_tipo, entidad_id)
);

CREATE INDEX IF NOT EXISTS idx_favoritos_usuario
  ON favoritos_usuario(usuario_id, entidad_tipo, orden);

ALTER TABLE favoritos_usuario ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS fu_all ON favoritos_usuario;
CREATE POLICY fu_all ON favoritos_usuario FOR ALL TO authenticated
  USING (usuario_id = auth.uid()) WITH CHECK (usuario_id = auth.uid());
