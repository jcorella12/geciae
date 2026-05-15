-- ============================================================================
-- Sprint 2 — S2-T4
-- Drop `ordenes_compra.cfdi_recibido_id`.
--
-- Antes:
--   ordenes_compra.cfdi_recibido_id solo "veía" UN cfdi por OC (el primero).
--   Cuando había facturas parciales o un re-timbrado, los CFDIs subsecuentes
--   quedaban huérfanos en el modelo aunque cfdi.oc_id sí los apuntaba.
--
-- Después:
--   La fuente de verdad es cfdi.oc_id (FK inverso). Consultas como
--   "ver facturas de esta OC" deben hacer:
--     SELECT * FROM cfdi WHERE oc_id = <oc_id> ORDER BY fecha_emision;
--
-- Backfill defensivo: antes de drop, garantizar que cualquier CFDI
-- referenciado por OC vía cfdi_recibido_id tenga también oc_id seteado
-- (típicamente ya lo tiene porque crearCfdi lo escribe en el insert).
-- ============================================================================

UPDATE cfdi c
SET oc_id = oc.id
FROM ordenes_compra oc
WHERE oc.cfdi_recibido_id = c.id
  AND c.oc_id IS NULL;

ALTER TABLE ordenes_compra
  DROP COLUMN IF EXISTS cfdi_recibido_id;
