-- ============================================================================
-- Sprint Z.1 — Widgets configurables drag-and-drop
-- ============================================================================

CREATE TABLE IF NOT EXISTS widget_preferencias_usuario (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pagina TEXT NOT NULL CHECK (pagina IN ('mi-dia', 'dashboard')),
  layout JSONB NOT NULL DEFAULT '[]'::JSONB,
  -- Estructura: [{ widget_id, orden, visible, tamaño }]
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(usuario_id, pagina)
);

CREATE INDEX IF NOT EXISTS idx_widget_pref_usuario
  ON widget_preferencias_usuario(usuario_id, pagina);

DROP TRIGGER IF EXISTS set_updated_at_wpu ON widget_preferencias_usuario;
CREATE TRIGGER set_updated_at_wpu BEFORE UPDATE ON widget_preferencias_usuario
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

ALTER TABLE widget_preferencias_usuario ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS wpu_all ON widget_preferencias_usuario;
CREATE POLICY wpu_all ON widget_preferencias_usuario FOR ALL TO authenticated
  USING (usuario_id = auth.uid())
  WITH CHECK (usuario_id = auth.uid());
