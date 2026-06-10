# Integración futura de descarga de CFDI

**Decisión (CEO, 2026-06-10):** la integración directa con el web service de
Descarga Masiva del SAT se retiró — quedó implementada pero **nunca devolvió
facturas** (sprint PODA-SAT). En el futuro se contratará un **proveedor
comercial con API** y se integrará por el mismo punto de entrada que hoy usa
la carga por ZIP.

## Lo que se retiró

- `lib/sat/` (web service): engine, fiel-loader, crypto, cron-context,
  importer, parser, state, errores. (Los catálogos SAT se conservaron, movidos
  a `lib/cfdi/catalogos-sat.ts`.)
- `app/(app)/configuracion/sat/` (FIELs, descargas, actions).
- Cron `/api/cron/sat-verificar-pendientes` + su entrada en `vercel.json`.
- Deps `@nodecfdi/sat-ws-descarga-masiva`, `@nodecfdi/credentials`.
- Tablas `sat_descargas`, `sat_credenciales` + tipos `estado_fiel`,
  `tipo_descarga_sat`, `estado_descarga_sat`
  (migración `20260707000000_drop_sat_descarga_masiva.sql`).
- e.firmas del bucket `sat-fiel` (borrado seguro:
  `scripts/limpiar_fiel_storage.py`).

## Lo que SIGUE funcionando (el pipeline real de CFDI)

- `lib/cfdi/` completo: parser, ingesta, KPIs, conciliación, idempotencia de
  pagos, export CONTPAQi.
- Carga manual: `/finanzas/cfdi/nuevo`.
- Carga masiva por ZIP: `/finanzas/cfdi/bulk-zip` (sube el ZIP del portal SAT,
  detecta empresa por RFC, idempotente por UUID).
- Obligaciones SAT, lista 69-B — módulos independientes, intactos.

## Cuándo se contrate el proveedor comercial

- **Contrato:** entregará XMLs de CFDIs emitidos/recibidos por empresa y rango
  de fechas (vía su API).
- **Punto de integración:** la MISMA ruta de ingesta del bulk ZIP
  (`lib/cfdi/parser` + la action `importarZipCfdi`/equivalente), idempotente
  por UUID+empresa (constraint `idx_cfdi_uuid_unique`).
- **Lo único nuevo a construir:** un fetcher del proveedor + un cron que baje
  e ingiera. Estimado: 1-2 días.
- **Importante:** la mayoría de los proveedores requieren registrar la FIEL o
  CIEC **en su plataforma** — el ERP NO volverá a almacenar e.firmas.
