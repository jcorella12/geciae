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

-- FORCE RLS solo en las tablas que existan. Guardado con to_regclass para
-- idempotencia y robustez a la deriva: en este remoto algunas no existen
-- (evaluaciones_desempeno nunca se creó; sat_credenciales/sat_descargas ya se
-- borraron por fuera antes de esta migración).
DO $$
DECLARE
  t TEXT;
  tablas TEXT[] := ARRAY[
    -- Financieras críticas
    'ajustes_gerenciales','umbrales_aprobacion','ordenes_compra',
    'ordenes_trabajo_inter_co','cfdi','cfdi_pagos',
    -- Tesorería + bancos
    'bancos_cuentas','bancos_movimientos','prestamos_inter_co',
    'lineas_credito_inter_co','prestamos_intereses',
    -- Nómina y datos personales sensibles
    'empleados','nomina_recibos','finiquitos','evaluaciones_desempeno',
    -- SAT (pueden ya no existir)
    'sat_credenciales','sat_descargas',
    -- Audit / seguridad
    'usuarios_empresas'
  ];
BEGIN
  FOREACH t IN ARRAY tablas LOOP
    IF to_regclass('public.' || t) IS NOT NULL THEN
      EXECUTE format('ALTER TABLE public.%I FORCE ROW LEVEL SECURITY', t);
    END IF;
  END LOOP;
END $$;
