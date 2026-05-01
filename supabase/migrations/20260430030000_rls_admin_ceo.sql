-- ============================================================================
-- RLS: CEO ve TODOS los vínculos del grupo (no solo los suyos)
-- ============================================================================
-- Necesario para el panel /configuracion/usuarios donde el CEO ve y administra
-- a todos los usuarios. La policy "select_own" sigue cubriendo a los demás roles
-- (cada quien ve sus propios vínculos).
-- ============================================================================

DROP POLICY IF EXISTS usuarios_empresas_select_ceo ON usuarios_empresas;
CREATE POLICY usuarios_empresas_select_ceo ON usuarios_empresas
  FOR SELECT
  TO authenticated
  USING (usuario_es_ceo());

-- En empresas y unidades_negocio, CEO ya tenía acceso porque pertenece a las 4
-- empresas. La policy select_pertenecidas le devuelve las 4. No requiere ajuste.
