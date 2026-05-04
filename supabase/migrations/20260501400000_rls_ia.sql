-- ============================================================================
-- RLS para tablas de IA (Sprint 3)
-- ============================================================================
-- - ia_invocaciones: cada usuario ve sus propias invocaciones; CEO ve todas.
-- - ia_cache: lectura para autenticados (datos no sensibles, hash + JSON);
--   escritura solo desde server (service_role implícitamente bypassea).
-- - ia_costos_acumulados: solo CEO/Director.
-- - ia_configuracion_autonomia: solo CEO.
-- ============================================================================

ALTER TABLE ia_invocaciones ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ia_inv_select_propias ON ia_invocaciones;
CREATE POLICY ia_inv_select_propias ON ia_invocaciones
  FOR SELECT
  TO authenticated
  USING (usuario_id = auth.uid() OR usuario_es_ceo());

DROP POLICY IF EXISTS ia_inv_insert ON ia_invocaciones;
CREATE POLICY ia_inv_insert ON ia_invocaciones
  FOR INSERT
  TO authenticated
  WITH CHECK (usuario_id = auth.uid());

ALTER TABLE ia_cache ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ia_cache_select ON ia_cache;
CREATE POLICY ia_cache_select ON ia_cache
  FOR SELECT
  TO authenticated
  USING (TRUE);

DROP POLICY IF EXISTS ia_cache_insert ON ia_cache;
CREATE POLICY ia_cache_insert ON ia_cache
  FOR INSERT
  TO authenticated
  WITH CHECK (TRUE);

DROP POLICY IF EXISTS ia_cache_update ON ia_cache;
CREATE POLICY ia_cache_update ON ia_cache
  FOR UPDATE
  TO authenticated
  USING (TRUE);

ALTER TABLE ia_costos_acumulados ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ia_costos_select ON ia_costos_acumulados;
CREATE POLICY ia_costos_select ON ia_costos_acumulados
  FOR SELECT
  TO authenticated
  USING (
    usuario_es_ceo()
    OR EXISTS (
      SELECT 1 FROM usuarios_empresas
      WHERE usuario_id = auth.uid()
        AND rol = 'director'::rol_usuario
        AND activo = TRUE
    )
  );

ALTER TABLE ia_configuracion_autonomia ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ia_config_select ON ia_configuracion_autonomia;
CREATE POLICY ia_config_select ON ia_configuracion_autonomia
  FOR SELECT
  TO authenticated
  USING (usuario_es_ceo());

DROP POLICY IF EXISTS ia_config_modify ON ia_configuracion_autonomia;
CREATE POLICY ia_config_modify ON ia_configuracion_autonomia
  FOR ALL
  TO authenticated
  USING (usuario_es_ceo())
  WITH CHECK (usuario_es_ceo());
