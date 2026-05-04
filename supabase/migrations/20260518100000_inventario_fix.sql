-- Fix: añadir columna updated_at a catalogo_productos (referenciada por trigger)
ALTER TABLE catalogo_productos
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
