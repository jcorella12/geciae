-- ============================================================================
-- Sprint 7 — Parte 1: extender enum plantilla_proyecto con valores Limson
--
-- Postgres no permite usar valores de enum recién agregados en la misma
-- transacción donde se crearon. Por eso esta migración SOLO hace ALTER TYPE.
-- La 20260601100000 hace los INSERTs / seeds que ya pueden usar los nuevos
-- valores porque para entonces el commit ya está consolidado.
-- ============================================================================

ALTER TYPE plantilla_proyecto ADD VALUE IF NOT EXISTS 'limson_mantenimiento_contractual';
ALTER TYPE plantilla_proyecto ADD VALUE IF NOT EXISTS 'limson_servicio_puntual';
ALTER TYPE plantilla_proyecto ADD VALUE IF NOT EXISTS 'limson_instalacion_externa';
