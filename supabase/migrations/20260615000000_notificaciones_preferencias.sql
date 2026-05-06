-- ============================================================================
-- Sprint Z+.1 — Preferencias de notificaciones por tipo
-- ============================================================================

CREATE TABLE IF NOT EXISTS notificaciones_preferencias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL,
  recibir BOOLEAN DEFAULT TRUE,
  email BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(usuario_id, tipo)
);

ALTER TABLE notificaciones_preferencias ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS np_all ON notificaciones_preferencias;
CREATE POLICY np_all ON notificaciones_preferencias FOR ALL TO authenticated
  USING (usuario_id = auth.uid()) WITH CHECK (usuario_id = auth.uid());

DROP TRIGGER IF EXISTS set_updated_at_np ON notificaciones_preferencias;
CREATE TRIGGER set_updated_at_np BEFORE UPDATE ON notificaciones_preferencias
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE OR REPLACE FUNCTION trg_filtrar_notif_preferencia()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_recibir BOOLEAN;
BEGIN
  SELECT recibir INTO v_recibir
  FROM notificaciones_preferencias
  WHERE usuario_id = NEW.usuario_id AND tipo = NEW.tipo;
  IF v_recibir = FALSE THEN
    RETURN NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_filtrar_notif ON notificaciones;
CREATE TRIGGER trg_filtrar_notif BEFORE INSERT ON notificaciones
  FOR EACH ROW EXECUTE FUNCTION trg_filtrar_notif_preferencia();
