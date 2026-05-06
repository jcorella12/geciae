-- ============================================================================
-- Sprint Z.4 — Modo usuario simple/avanzado
-- ============================================================================

ALTER TABLE usuarios_empresas
  ADD COLUMN IF NOT EXISTS modo_usuario_preferido TEXT
    CHECK (modo_usuario_preferido IN ('simple', 'avanzado') OR modo_usuario_preferido IS NULL);
