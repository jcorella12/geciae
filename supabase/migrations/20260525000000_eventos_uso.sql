-- ============================================================================
-- Sprint 5.3 — Eventos de uso (telemetría interna ligera, sin PII)
--
-- Registra pageviews y acciones del usuario en una tabla append-only.
-- NO se trackea contenido sensible (RFC, montos, etc.) — solo metadatos.
-- Solo CEO ve el agregado en /admin/uso.
-- ============================================================================

CREATE TABLE IF NOT EXISTS eventos_uso (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID REFERENCES auth.users(id),
  empresa_id UUID REFERENCES empresas(id),
  tipo TEXT NOT NULL CHECK (tipo IN ('pageview', 'action', 'error_user')),
  pagina TEXT,
  detalle JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_eventos_usuario
  ON eventos_uso(usuario_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_eventos_pagina
  ON eventos_uso(pagina) WHERE tipo = 'pageview';
CREATE INDEX IF NOT EXISTS idx_eventos_fecha
  ON eventos_uso(created_at DESC);

-- ============================================================================
-- RLS
-- ============================================================================

ALTER TABLE eventos_uso ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS eu_insert ON eventos_uso;
CREATE POLICY eu_insert ON eventos_uso
  FOR INSERT TO authenticated
  WITH CHECK (usuario_id = auth.uid());

DROP POLICY IF EXISTS eu_select ON eventos_uso;
CREATE POLICY eu_select ON eventos_uso
  FOR SELECT TO authenticated
  USING (usuario_es_ceo());

-- ============================================================================
-- Función auxiliar: top páginas últimos N días
-- ============================================================================

CREATE OR REPLACE FUNCTION top_paginas_uso(p_dias INTEGER DEFAULT 30)
RETURNS TABLE (
  pagina TEXT,
  visitas BIGINT,
  usuarios_unicos BIGINT
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT
    pagina,
    COUNT(*)::BIGINT AS visitas,
    COUNT(DISTINCT usuario_id)::BIGINT AS usuarios_unicos
  FROM eventos_uso
  WHERE
    tipo = 'pageview'
    AND created_at >= NOW() - (p_dias || ' days')::INTERVAL
    AND pagina IS NOT NULL
  GROUP BY pagina
  ORDER BY visitas DESC
  LIMIT 50;
$$;

GRANT EXECUTE ON FUNCTION top_paginas_uso(INTEGER) TO authenticated;

-- Cleanup: el CEO puede borrar registros antiguos para mantener la tabla
-- pequeña (ej. > 90 días). Manual por ahora.
CREATE OR REPLACE FUNCTION limpiar_eventos_uso_antiguos(p_dias INTEGER DEFAULT 90)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  borrados INTEGER;
BEGIN
  IF NOT usuario_es_ceo() THEN
    RAISE EXCEPTION 'Solo CEO puede limpiar eventos';
  END IF;
  DELETE FROM eventos_uso
  WHERE created_at < NOW() - (p_dias || ' days')::INTERVAL;
  GET DIAGNOSTICS borrados = ROW_COUNT;
  RETURN borrados;
END;
$$;

GRANT EXECUTE ON FUNCTION limpiar_eventos_uso_antiguos(INTEGER) TO authenticated;

COMMENT ON TABLE eventos_uso IS
  'Telemetría interna ligera: pageviews + acciones, sin PII. RLS bloquea lectura a no-CEO.';
