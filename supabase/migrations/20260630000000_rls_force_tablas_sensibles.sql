-- ============================================================================
-- Sprint 5 (parcial) — RLS FORCE en tablas sensibles
--
-- Hallazgo del audit: 151 tablas tienen RLS pero ninguna con FORCE. Si un
-- trigger, función o vista corre como el dueño de la tabla, bypassea las
-- policies silenciosamente. FORCE hace que ni el table owner pueda saltar
-- las policies.
--
-- ⚠️ Nota importante sobre Supabase service_role:
-- En Supabase, el rol `service_role` (el que usa `createAdminClient`)
-- tiene el atributo BYPASSRLS por default. FORCE NO afecta a usuarios con
-- BYPASSRLS — service_role sigue pudiendo leer/escribir todo.
--
-- FORCE protege contra:
--   - Triggers que corren con SECURITY DEFINER del dueño y olvidaron
--     consultar permisos.
--   - Vistas materializadas que se rellenan con el dueño.
--   - Conexiones directas que asumen el dueño.
--
-- La defensa real contra abuso de service_role es:
--   1. Validar permisos (`obtenerVinculos`, `esCEO`, etc.) ANTES de cada
--      uso de `createAdminClient()` en server actions.
--   2. Limitar el uso del admin client a operaciones específicas en
--      route handlers documentados.
--   3. Auditoría — log de operaciones con admin client en tablas críticas
--      (pendiente).
--
-- Esta migration es defensa en profundidad; las policies y el gate en
-- código siguen siendo la primera línea.
-- ============================================================================

-- Tablas financieras críticas
ALTER TABLE ajustes_gerenciales FORCE ROW LEVEL SECURITY;
ALTER TABLE umbrales_aprobacion FORCE ROW LEVEL SECURITY;
ALTER TABLE ordenes_compra FORCE ROW LEVEL SECURITY;
ALTER TABLE ordenes_trabajo_inter_co FORCE ROW LEVEL SECURITY;
ALTER TABLE cfdi FORCE ROW LEVEL SECURITY;
ALTER TABLE cfdi_pagos FORCE ROW LEVEL SECURITY;

-- Tesorería + bancos
ALTER TABLE bancos_cuentas FORCE ROW LEVEL SECURITY;
ALTER TABLE bancos_movimientos FORCE ROW LEVEL SECURITY;
ALTER TABLE prestamos_inter_co FORCE ROW LEVEL SECURITY;
ALTER TABLE lineas_credito_inter_co FORCE ROW LEVEL SECURITY;
ALTER TABLE prestamos_intereses FORCE ROW LEVEL SECURITY;

-- Nómina y datos personales sensibles
ALTER TABLE empleados FORCE ROW LEVEL SECURITY;
ALTER TABLE nomina_recibos FORCE ROW LEVEL SECURITY;
ALTER TABLE finiquitos FORCE ROW LEVEL SECURITY;
ALTER TABLE evaluaciones_desempeno FORCE ROW LEVEL SECURITY;

-- SAT: contraseñas FIEL encriptadas y descargas
ALTER TABLE sat_credenciales FORCE ROW LEVEL SECURITY;
ALTER TABLE sat_descargas FORCE ROW LEVEL SECURITY;

-- Audit / seguridad
ALTER TABLE usuarios_empresas FORCE ROW LEVEL SECURITY;
