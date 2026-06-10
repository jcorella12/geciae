-- ============================================================================
-- Sprint PODA — Eliminar módulo SGC/ISO 9001 del ERP
-- ============================================================================
-- Decisión CEO (2026-06-10): el SGC vive en app separada; el ERP lo consumirá
-- vía API de solo lectura en el futuro. Ver docs/integracion-sgc-futura.md.
--
-- Patrón de seguridad: cada DROP verifica primero que la tabla esté vacía.
-- Si tiene filas, la migración ABORTA (hay que exportar antes). Todas se
-- confirmaron vacías al 2026-07-06 antes de escribir esta migración.
--
-- NO se toca: capacitaciones (nació por ISO pero está en uso operativo bajo
-- Personas), ni sgc_documentos (fuera de la lista; se evalúa aparte).
-- ============================================================================

DO $$
DECLARE
  n BIGINT;
  t TEXT;
  -- Orden importa: hijas antes que padres (FKs).
  tablas TEXT[] := ARRAY[
    'auditorias_hallazgos',
    'auditorias_internas',
    'procedimientos_versiones',
    'procedimientos',
    'no_conformidades',
    'revisiones_direccion',
    'sgc_indicadores',
    'sgc_riesgos',
    'sgc_procesos',
    'evaluaciones_desempeno'
  ];
BEGIN
  FOREACH t IN ARRAY tablas LOOP
    -- Si la tabla no existe, continuar.
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = t
    ) THEN
      RAISE NOTICE 'Tabla % no existe — skip', t;
      CONTINUE;
    END IF;

    EXECUTE format('SELECT count(*) FROM %I', t) INTO n;
    IF n > 0 THEN
      RAISE EXCEPTION '% tiene % filas — exporta antes de borrar (migración abortada)', t, n;
    END IF;

    EXECUTE format('DROP TABLE IF EXISTS %I CASCADE', t);
    RAISE NOTICE 'Tabla % eliminada (estaba vacía)', t;
  END LOOP;
END $$;
