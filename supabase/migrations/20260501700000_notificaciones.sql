-- ============================================================================
-- Notificaciones (Sprint 4 — extiende lo previsto en spec)
-- ============================================================================
-- Centro unificado por usuario. Cada acción que requiera atención de otro
-- usuario inserta una fila aquí. UI: campana en topbar con badge.
-- ============================================================================

CREATE TABLE IF NOT EXISTS notificaciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  empresa_id UUID REFERENCES empresas(id) ON DELETE SET NULL,
  tipo TEXT NOT NULL,           -- ej. oc_pendiente_aprobacion, oc_aprobada
  severidad TEXT NOT NULL DEFAULT 'info',  -- info, warning, danger, success
  titulo TEXT NOT NULL,
  mensaje TEXT,
  url TEXT,                      -- ruta a la que dirige al hacer click
  entidad_tipo TEXT,             -- ej. orden_compra
  entidad_id UUID,
  leida BOOLEAN NOT NULL DEFAULT FALSE,
  fecha_lectura TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notif_usuario_unread
  ON notificaciones(usuario_id, created_at DESC)
  WHERE leida = FALSE;

CREATE INDEX IF NOT EXISTS idx_notif_usuario
  ON notificaciones(usuario_id, created_at DESC);

ALTER TABLE notificaciones ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS notif_select_propias ON notificaciones;
CREATE POLICY notif_select_propias ON notificaciones
  FOR SELECT TO authenticated
  USING (usuario_id = auth.uid());

DROP POLICY IF EXISTS notif_update_propias ON notificaciones;
CREATE POLICY notif_update_propias ON notificaciones
  FOR UPDATE TO authenticated
  USING (usuario_id = auth.uid())
  WITH CHECK (usuario_id = auth.uid());

-- INSERT lo hacen server actions con createClient autenticado del caller.
-- Permitimos que cualquier usuario con sesión activa inserte para cualquier
-- destinatario (las acciones validan permisos antes en código).
DROP POLICY IF EXISTS notif_insert ON notificaciones;
CREATE POLICY notif_insert ON notificaciones
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM usuarios_empresas
      WHERE usuario_id = auth.uid() AND activo = TRUE
    )
  );
