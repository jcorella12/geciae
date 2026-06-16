-- ============================================================================
-- ROLES Fase 2 (1/2) — Expandir el enum rol_usuario
-- ============================================================================
-- Decisión CEO (2026-06-10): colapsar a 3 roles (directivo/administrativo/
-- operativo). Ver docs/sprint-roles-plan-fase2.md.
--
-- ⚠️ Postgres NO permite USAR un valor de enum recién agregado en la MISMA
-- transacción que lo agrega. Por eso esto va en su PROPIA migración (se
-- commitea aquí); los helpers, políticas y la migración de datos que usan
-- los nuevos valores van en 20260708000100.
--
-- ADD VALUE es aditivo y reversible-en-la-práctica: los valores viejos
-- (ceo, director, empleado, operativo, cliente) se conservan. No se borran.
-- ============================================================================

ALTER TYPE rol_usuario ADD VALUE IF NOT EXISTS 'directivo';
ALTER TYPE rol_usuario ADD VALUE IF NOT EXISTS 'administrativo';
