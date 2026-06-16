-- ============================================================================
-- ROLES Fase 2 (2/2) — Helpers + reescritura de políticas RLS + datos
-- ============================================================================
-- Requiere que 20260708000000_roles_enum_expand.sql ya esté COMMITTEADA
-- (los nuevos valores del enum deben existir antes de usarse aquí).
--
-- Modelo de 3 roles (deny-list):
--   directivo      = ve/hace todo (ceo/director viejos + contralor/tesorero)
--   administrativo = operación + finanzas, NO salarios/config (aprobador/rh)
--   operativo      = operación, NO finanzas ni salarios
--
-- Estrategia (expand, no destructiva): las políticas y helpers reconocen
-- AMBOS modelos. Los valores viejos siguen funcionando; los nuevos obtienen
-- acceso equivalente. Los 5 usuarios actuales mapean todos a directivo, así
-- que su acceso NO cambia (verificado contra baseline).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 0. Backup de roles/atributos actuales (rollback manual si hiciera falta).
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS usuarios_empresas_rol_backup_20260708 AS
  SELECT id, usuario_id, empresa_id, rol, atributos, NOW() AS backed_up_at
  FROM usuarios_empresas;

-- ----------------------------------------------------------------------------
-- 1. Helpers — reconocen modelo viejo + nuevo. (150 políticas los usan; con
--    esto quedan correctas sin tocarlas una por una.)
-- ----------------------------------------------------------------------------
-- ⚠️ CAMBIO SEMÁNTICO DELIBERADO (no es aditivo). El usuario_es_ceo() original
-- era estrictamente rol='ceo'. Se usa como "override global" (ver/hacer todo en
-- las 4 empresas) en ~80 políticas. Al expandirlo a ceo/director/directivo +
-- attrs contralor/tesorero, esos perfiles obtienen el override global. Es
-- EXACTAMENTE el modelo aprobado (directivo = "ve/hace todo"). Post-migración
-- solo existirá rol=directivo; las ramas director/ceo/attrs son transitorias.
-- CONSECUENCIA a confirmar por el CEO: un directivo ve datos de TODAS las
-- empresas (nómina, CFDI, bancos), no solo la suya. Para los 5 usuarios
-- actuales esto es lo deseado (todos mapean a directivo).
CREATE OR REPLACE FUNCTION public.usuario_es_ceo()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM usuarios_empresas
    WHERE usuario_id = auth.uid() AND activo = TRUE
      AND (
        rol IN ('ceo'::rol_usuario, 'director'::rol_usuario, 'directivo'::rol_usuario)
        OR atributos && ARRAY['contralor','tesorero_corporativo']
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.usuario_tiene_rol_en_empresa(p_empresa_id uuid, p_roles text[])
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM usuarios_empresas
    WHERE usuario_id = auth.uid() AND empresa_id = p_empresa_id AND activo = TRUE
      AND (
        rol::TEXT = ANY(p_roles)
        -- directivo cubre cualquier rol operativo/gerencial solicitado
        OR (rol = 'directivo'::rol_usuario
            AND p_roles && ARRAY['ceo','director','operativo'])
        -- administrativo cubre lo operativo
        OR (rol = 'administrativo'::rol_usuario
            AND p_roles && ARRAY['operativo'])
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.usuario_puede_gestionar_catalogos()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM usuarios_empresas
    WHERE usuario_id = auth.uid() AND activo = TRUE
      AND rol IN ('ceo'::rol_usuario,'director'::rol_usuario,'operativo'::rol_usuario,
                  'directivo'::rol_usuario,'administrativo'::rol_usuario)
  );
$$;

-- Ajustes gerenciales: solo directivo (usuario_es_ceo ya lo cubre).
CREATE OR REPLACE FUNCTION public.usuario_puede_ver_ajustes_gerenciales()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT usuario_es_ceo();
$$;

-- Estados gerenciales (Finanzas del grupo): directivo o administrativo.
CREATE OR REPLACE FUNCTION public.usuario_puede_ver_estados_gerenciales()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT usuario_es_ceo() OR EXISTS (
    SELECT 1 FROM usuarios_empresas
    WHERE usuario_id = auth.uid() AND activo = TRUE
      AND rol = 'administrativo'::rol_usuario
  );
$$;

-- ----------------------------------------------------------------------------
-- 2. Reescritura mecánica de las políticas con literales de rol (65).
--    Aditiva: a cada array de roles le agrega el equivalente nuevo. NO quita
--    valores viejos. Patrones cubiertos (medidos en prod):
--      ['ceo,director,operativo']  → + directivo + administrativo  (operación amplia)
--      ['ceo,director'] / ['director,ceo'] → + directivo  (sensible: empleados/salarios)
--      ['director,operativo']      → + directivo + administrativo  (operación)
--      rol = 'director'            → rol IN (director, directivo)
--    (ue.rol = 'director' queda cubierto por ser substring de rol = 'director').
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  pol RECORD;
  nq TEXT; nc TEXT;
  cambiadas INT := 0;
BEGIN
  FOR pol IN
    SELECT schemaname, tablename, policyname, qual, with_check
    FROM pg_policies
    WHERE schemaname='public'
      AND (qual LIKE '%rol_usuario%' OR with_check LIKE '%rol_usuario%')
  LOOP
    nq := pol.qual; nc := pol.with_check;

    IF nq IS NOT NULL THEN
      nq := replace(nq, '''director''::rol_usuario, ''operativo''::rol_usuario]',
                        '''director''::rol_usuario, ''operativo''::rol_usuario, ''directivo''::rol_usuario, ''administrativo''::rol_usuario]');
      nq := replace(nq, '''ceo''::rol_usuario, ''director''::rol_usuario]',
                        '''ceo''::rol_usuario, ''director''::rol_usuario, ''directivo''::rol_usuario]');
      nq := replace(nq, '''director''::rol_usuario, ''ceo''::rol_usuario]',
                        '''director''::rol_usuario, ''ceo''::rol_usuario, ''directivo''::rol_usuario]');
      nq := replace(nq, 'rol = ''director''::rol_usuario',
                        'rol = ANY (ARRAY[''director''::rol_usuario, ''directivo''::rol_usuario])');
    END IF;
    IF nc IS NOT NULL THEN
      nc := replace(nc, '''director''::rol_usuario, ''operativo''::rol_usuario]',
                        '''director''::rol_usuario, ''operativo''::rol_usuario, ''directivo''::rol_usuario, ''administrativo''::rol_usuario]');
      nc := replace(nc, '''ceo''::rol_usuario, ''director''::rol_usuario]',
                        '''ceo''::rol_usuario, ''director''::rol_usuario, ''directivo''::rol_usuario]');
      nc := replace(nc, '''director''::rol_usuario, ''ceo''::rol_usuario]',
                        '''director''::rol_usuario, ''ceo''::rol_usuario, ''directivo''::rol_usuario]');
      nc := replace(nc, 'rol = ''director''::rol_usuario',
                        'rol = ANY (ARRAY[''director''::rol_usuario, ''directivo''::rol_usuario])');
    END IF;

    IF (nq IS DISTINCT FROM pol.qual) OR (nc IS DISTINCT FROM pol.with_check) THEN
      IF nq IS NOT NULL AND nc IS NOT NULL THEN
        EXECUTE format('ALTER POLICY %I ON %I.%I USING (%s) WITH CHECK (%s)',
                       pol.policyname, pol.schemaname, pol.tablename, nq, nc);
      ELSIF nq IS NOT NULL THEN
        EXECUTE format('ALTER POLICY %I ON %I.%I USING (%s)',
                       pol.policyname, pol.schemaname, pol.tablename, nq);
      ELSE
        EXECUTE format('ALTER POLICY %I ON %I.%I WITH CHECK (%s)',
                       pol.policyname, pol.schemaname, pol.tablename, nc);
      END IF;
      cambiadas := cambiadas + 1;
    END IF;
  END LOOP;
  RAISE NOTICE 'ROLES F2: políticas reescritas: %', cambiadas;
END $$;

-- ----------------------------------------------------------------------------
-- 3. Migración de datos. Calcula el rol nuevo desde rol viejo + atributos
--    ANTES de limpiar atributos. No toca 'cliente' (dormante).
-- ----------------------------------------------------------------------------
UPDATE usuarios_empresas SET rol = CASE
  WHEN rol IN ('ceo'::rol_usuario,'director'::rol_usuario)
       OR atributos && ARRAY['contralor','tesorero_corporativo']
    THEN 'directivo'::rol_usuario
  WHEN atributos && ARRAY['aprobador_financiero','rh']
    THEN 'administrativo'::rol_usuario
  ELSE 'operativo'::rol_usuario
END
WHERE rol IN ('ceo'::rol_usuario,'director'::rol_usuario,
              'empleado'::rol_usuario,'operativo'::rol_usuario);

-- Limpiar SOLO atributos de módulos retirados. Por ahora únicamente
-- 'coordinador_calidad' (módulo SGC/ISO eliminado en el sprint PODA).
--
-- El resto se CONSERVA a propósito — esta es la única parte potencialmente
-- destructiva, así que se minimiza la superficie:
--   · aprobador_financiero: sigue manejando los umbrales de aprobación
--     (puedeAprobarOC/OT/Prestamo + configuracion_atributos). Borrarlo
--     rompería las aprobaciones.
--   · contralor / tesorero_corporativo / auditor_interno: redundantes con
--     rol=directivo, pero inofensivos; quitarlos podría alterar ramas OR
--     transitorias antes de que el rol nuevo se lea en todos lados.
--   · vendedor / supervisor_cuadrilla / rh: etiquetas vivas del modelo nuevo.
UPDATE usuarios_empresas SET atributos = ARRAY(
  SELECT a FROM unnest(atributos) a
  WHERE a NOT IN ('coordinador_calidad')
)
WHERE atributos && ARRAY['coordinador_calidad'];
