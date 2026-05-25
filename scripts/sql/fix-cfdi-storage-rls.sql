-- ============================================================================
-- Fix: RLS policies del bucket cfdi (storage.objects)
-- ============================================================================
-- Síntoma: subir CFDI (individual o bulk-zip) falla con
--   "new row violates row-level security policy"
--
-- Causa típica: las policies del bucket cfdi no quedaron aplicadas en el
-- proyecto Supabase actual (común al migrar entre proyectos — storage
-- policies viven aparte de las de tablas y a veces no se replican).
--
-- Compatible con el SQL Editor de Supabase Dashboard (sin comandos \echo
-- de psql). Idempotente: se puede correr N veces.
-- ============================================================================

-- ────────────────────────────────────────────────────────────────────────────
-- 1) Diagnóstico ANTES del fix
-- ────────────────────────────────────────────────────────────────────────────
SELECT '── POLICIES ACTUALES DE storage.objects (antes del fix) ──' AS info;

SELECT
  policyname,
  cmd,
  roles,
  qual AS using_clause,
  with_check
FROM pg_policies
WHERE schemaname = 'storage'
  AND tablename = 'objects'
ORDER BY policyname;

SELECT '── BUCKET cfdi ──' AS info;

SELECT id, name, public, created_at
FROM storage.buckets
WHERE id = 'cfdi';

-- ────────────────────────────────────────────────────────────────────────────
-- 2) Asegurar bucket
-- ────────────────────────────────────────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public)
VALUES ('cfdi', 'cfdi', FALSE)
ON CONFLICT (id) DO NOTHING;

-- ────────────────────────────────────────────────────────────────────────────
-- 3) Recrear policies del bucket cfdi
-- ────────────────────────────────────────────────────────────────────────────

-- SELECT: usuarios ven archivos de CFDIs cuyas filas pueden ver (vía la tabla
-- cfdi). CEO, tesorero_corporativo y auditor_interno ven todo.
DROP POLICY IF EXISTS cfdi_storage_select ON storage.objects;
CREATE POLICY cfdi_storage_select ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'cfdi'
    AND (
      usuario_es_ceo()
      OR usuario_tiene_atributo('tesorero_corporativo')
      OR usuario_tiene_atributo('auditor_interno')
      OR EXISTS (
        SELECT 1 FROM cfdi c
        WHERE (c.url_xml = storage.objects.name OR c.url_pdf = storage.objects.name)
          AND c.empresa_id IN (SELECT empresas_del_usuario())
      )
    )
  );

-- INSERT: cualquier usuario autenticado puede subir al bucket cfdi.
-- El gate de quién PUEDE registrar CFDI se valida en el server action.
DROP POLICY IF EXISTS cfdi_storage_insert ON storage.objects;
CREATE POLICY cfdi_storage_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'cfdi');

-- UPDATE: lo mismo que insert (para upsert: true del client).
DROP POLICY IF EXISTS cfdi_storage_update ON storage.objects;
CREATE POLICY cfdi_storage_update ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'cfdi')
  WITH CHECK (bucket_id = 'cfdi');

-- DELETE: solo CEO o tesorero corporativo (limpieza controlada).
DROP POLICY IF EXISTS cfdi_storage_delete ON storage.objects;
CREATE POLICY cfdi_storage_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'cfdi'
    AND (usuario_es_ceo() OR usuario_tiene_atributo('tesorero_corporativo'))
  );

-- ────────────────────────────────────────────────────────────────────────────
-- 4) Verificación POST-fix
-- ────────────────────────────────────────────────────────────────────────────
SELECT '── POLICIES DESPUÉS DEL FIX ──' AS info;

SELECT
  policyname,
  cmd,
  roles,
  qual AS using_clause,
  with_check
FROM pg_policies
WHERE schemaname = 'storage'
  AND tablename = 'objects'
  AND policyname LIKE 'cfdi_storage%'
ORDER BY policyname;

SELECT '✓ Fix aplicado. Reintenta en /finanzas/cfdi/bulk-zip' AS resultado;
