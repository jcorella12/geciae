-- ============================================================================
-- Cron diario: devengar intereses de préstamos inter-co.
--
-- Hasta ahora `devengar_intereses_dia()` debía dispararse manualmente desde
-- /finanzas/tesoreria/matriz (botón "Devengar Intereses Hoy"). Ahora corre
-- cada día automáticamente a las 23:55 hora MX (05:55 UTC del día siguiente)
-- usando pg_cron — extensión nativa de Supabase.
--
-- Idempotente: la función tiene ON CONFLICT DO NOTHING en (prestamo_id, fecha).
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Si el job ya existe, lo borramos para que la definición ganadora sea esta.
DO $$
DECLARE
  jobid BIGINT;
BEGIN
  SELECT cron.jobid INTO jobid
  FROM cron.job
  WHERE cron.jobname = 'devengar_intereses_diario';
  IF jobid IS NOT NULL THEN
    PERFORM cron.unschedule(jobid);
  END IF;
EXCEPTION WHEN undefined_table OR undefined_column OR insufficient_privilege THEN
  -- pg_cron metadata schema not present yet; ignorar.
  NULL;
END $$;

-- Programar a las 05:55 UTC todos los días (≈23:55 hora MX en GMT-6).
SELECT cron.schedule(
  'devengar_intereses_diario',
  '55 5 * * *',
  $$ SELECT devengar_intereses_dia(CURRENT_DATE - INTERVAL '0 day'); $$
);

COMMENT ON FUNCTION devengar_intereses_dia(DATE) IS
  'Devenga intereses TIIE+spread para todos los préstamos vivos en la fecha indicada. Idempotente. Corre vía cron diario (devengar_intereses_diario) a las 05:55 UTC.';
