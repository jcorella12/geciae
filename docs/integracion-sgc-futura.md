# Integración futura del SGC/ISO

**Decisión (CEO, 2026-06-10):** el Sistema de Gestión de Calidad (ISO 9001)
sale del ERP y vivirá en una **aplicación separada**. Cuando exista, el ERP
solo consumirá datos del SGC vía **API de solo lectura** (mismo patrón que
uvie.app ↔ UIIE): indicadores y hallazgos para mostrarlos en el dashboard,
sin capturarlos aquí.

## Qué se eliminó (sprint PODA, migración `20260706000000_drop_modulo_sgc.sql`)

UI:
- `app/(app)/calidad/`
- `app/(app)/configuracion/sgc/`
- Item "Calidad" del sidebar + capacidad `calidad` de `NavCaps`
- Card de Calidad en Mi Día (RRHH)
- Entradas de breadcrumbs y el check "Documentos SGC" de validación
- `puedeAccederCalidad()` en `lib/auth/permisos.ts`

Tablas (todas vacías al momento del drop):
`auditorias_hallazgos`, `auditorias_internas`, `procedimientos_versiones`,
`procedimientos`, `no_conformidades`, `revisiones_direccion`,
`sgc_indicadores`, `sgc_riesgos`, `sgc_procesos`, `evaluaciones_desempeno`.

## Qué se conservó

- **Capacitaciones** (`lib/.../capacitaciones`, catálogo, asignación, páginas
  bajo Personas): nació por ISO pero está en uso operativo. El atributo
  `coordinador_calidad` sigue mapeando a RRHH en Mi Día.
- `sgc_documentos`: no estaba en la lista de drop; se evalúa por separado.

## Cuando se construya el SGC externo

El ERP expondría/consumiría un endpoint de lectura tipo:
`GET /api/sgc/indicadores`, `GET /api/sgc/hallazgos-abiertos` → para un
widget de dashboard. No se re-introduce captura de SGC en el ERP.
