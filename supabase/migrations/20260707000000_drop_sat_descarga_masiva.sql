-- ============================================================================
-- PODA-SAT — Retirar la descarga masiva del SAT (web service)
-- ============================================================================
-- Decisión CEO (2026-06-10): la integración directa con el web service de
-- Descarga Masiva del SAT quedó implementada pero NUNCA devolvió facturas.
-- Se retira. En el futuro se contratará un proveedor comercial con API y se
-- integrará por el mismo punto de entrada que la carga por ZIP.
-- Ver docs/integracion-descarga-cfdi-futura.md.
--
-- ⚠️ PRERREQUISITO: correr scripts/limpiar_fiel_storage.py --aplicar ANTES de
-- esta migración. sat_credenciales referencia e.firmas (cert.cer/key.key) en
-- el bucket sat-fiel; el DROP no borra esos archivos del Storage. Esta
-- migración aborta si la tabla aún tiene filas, para no dejar e.firmas
-- huérfanas en Storage.
--
-- NO se toca: lib/cfdi/ (pipeline real), obligaciones SAT, lista 69-B,
-- catálogos SAT (movidos a lib/cfdi/catalogos-sat.ts).
-- ============================================================================

-- 1. Guard: las e.firmas deben haberse borrado del Storage primero.
DO $$
DECLARE n BIGINT;
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema='public' AND table_name='sat_credenciales') THEN
    SELECT count(*) INTO n FROM sat_credenciales;
    IF n > 0 THEN
      RAISE EXCEPTION 'sat_credenciales tiene % filas. Corre scripts/limpiar_fiel_storage.py --aplicar (borra las e.firmas del Storage) y vacía la tabla antes de aplicar esta migración.', n;
    END IF;
  END IF;
END $$;

-- 2. sat_descargas: histórico de intentos fallidos (nunca devolvió facturas),
--    sin valor. Drop directo.
DROP TABLE IF EXISTS sat_descargas CASCADE;

-- 3. sat_credenciales: ya vacía (guard arriba). Drop.
DROP TABLE IF EXISTS sat_credenciales CASCADE;

-- 4. Enums/tipos auxiliares del módulo (los array types _xxx caen con CASCADE).
DROP TYPE IF EXISTS estado_fiel CASCADE;
DROP TYPE IF EXISTS tipo_descarga_sat CASCADE;
DROP TYPE IF EXISTS estado_descarga_sat CASCADE;

-- 5. Funciones auxiliares del web service que ya no se usan. usuario_puede_
--    gestionar_sat se conserva si algo más la referencia; si no, se puede
--    dropear en una migración posterior tras confirmar con pg_policies.
