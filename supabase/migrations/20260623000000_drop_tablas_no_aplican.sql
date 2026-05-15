-- Limpieza de schema — drop de 7 tablas declaradas en init.sql que
-- nunca se usaron y que el cliente confirmó que no aplican al alcance
-- real de GECIAE (sesión 2026-05-15 con Joaquín).
--
-- Auditoría previa verificó:
--   - Ninguna de estas 7 tablas tiene referencias `.from()`/`.rpc()` en
--     app/, lib/ o components/.
--   - Las únicas FKs son internas dentro de la familia EMA (las 3 EMA
--     se dropean juntas con CASCADE, así que las FKs caen solas).
--   - El módulo `viaticos` (sprint8_personas) ya cubre lo que pretendía
--     `viajes_solicitudes`. El cliente nunca usó esta última.
--   - El cliente decidió que el módulo EMA (acreditaciones EMA,
--     dictámenes UVIE, certificaciones EC) NO va a vivir en este ERP;
--     será un sistema aparte.
--
-- CASCADE asegura que cualquier RLS policy, trigger o índice asociado
-- también se elimine sin necesidad de listar cada uno.

-- Familia EMA (no aplica — sistema separado)
DROP TABLE IF EXISTS ema_certificaciones_emitidas CASCADE;
DROP TABLE IF EXISTS ema_dictamenes_uvie CASCADE;
DROP TABLE IF EXISTS ema_acreditaciones CASCADE;

-- Compliance PLD (GECIAE no es actividad vulnerable bajo LFPIORPI;
-- reporte UIF se hace por el portal SAT, no por ERP)
DROP TABLE IF EXISTS pld_operaciones_inusuales CASCADE;

-- RH corporativo over-engineered para grupo de 4 empresas chicas
DROP TABLE IF EXISTS bolsa_talento CASCADE;
DROP TABLE IF EXISTS encuestas_satisfaccion CASCADE;

-- Duplicado funcional de la tabla `viaticos` ya en producción
DROP TABLE IF EXISTS viajes_solicitudes CASCADE;
