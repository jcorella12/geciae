-- Agregar línea de captura SAT a obligaciones_sat (alfanumérico ~20 chars
-- que viene en la declaración generada para hacer el pago referenciado).
ALTER TABLE obligaciones_sat
  ADD COLUMN IF NOT EXISTS linea_captura TEXT;

CREATE INDEX IF NOT EXISTS idx_oblig_linea_captura
  ON obligaciones_sat(linea_captura) WHERE linea_captura IS NOT NULL;

COMMENT ON COLUMN obligaciones_sat.linea_captura IS
  'Línea de captura SAT (~20 caracteres alfanuméricos) — referencia para pago en banco.';
