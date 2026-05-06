-- ============================================================================
-- Sprint V — fix: relajar CHECK de horas para soportar cuadrillas
--
-- El CHECK original (horas <= 60) asumía que era horas por persona. Pero el
-- modelo guarda horas totales de la cuadrilla (horas × num_personas), que
-- pueden exceder 60 fácilmente (ej. cuadrilla de 4 × 40h = 160).
-- ============================================================================

ALTER TABLE proyecto_horas_trabajadas
  DROP CONSTRAINT IF EXISTS proyecto_horas_trabajadas_horas_check;

ALTER TABLE proyecto_horas_trabajadas
  ADD CONSTRAINT proyecto_horas_trabajadas_horas_check
  CHECK (horas >= 0 AND horas <= 1000);
