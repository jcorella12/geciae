-- CFDI inter-co: el mismo UUID se registra dos veces, una por cada empresa del
-- grupo (emisor + receptor). El UNIQUE pasa de (uuid_sat) a (uuid_sat, empresa_id).

DROP INDEX IF EXISTS idx_cfdi_uuid_unique;

CREATE UNIQUE INDEX idx_cfdi_uuid_empresa
  ON cfdi(uuid_sat, empresa_id)
  WHERE uuid_sat IS NOT NULL;
