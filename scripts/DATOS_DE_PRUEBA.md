# Datos de prueba (DEMO_SEED)

Todos los datos de prueba inyectados en BD por estos scripts están etiquetados con
**`[DEMO_SEED]`** dentro del campo `observaciones`. Esto permite limpiarlos
con un solo comando antes del lanzamiento.

## Scripts de seed

| Script | Tabla(s) | Cantidad |
|---|---|---|
| `seed-proyecto-tareas.mjs` | `proyecto_tareas` | 17 (proyecto detallado) |
| `seed-proyecto-tareas-variantes.mjs` | `proyecto_tareas` | 24 (3 escenarios: cerrado / arranque / problemático) |
| `seed-proyecto-bitacora.mjs` | `proyecto_bitacora` | 10 eventos en Torre Polanco |
| `seed-proyecto-reportes.mjs` | `proyecto_reportes` | 6 reportes (incidente, avance, no-conformidad, seguridad, cambio alcance, ejecutivo) |
| `seed-vehiculos.mjs` | `vehiculos` + `vehiculos_bitacora` | 8 vehículos · 56 eventos |
| `seed-vehiculos-documentos.mjs` | `vehiculos_documentos` | 38 docs (factura, tarjeta circulación, verificación, seguro, tenencia) — solo metadata, sin archivos en storage |
| `seed-oportunidades.mjs` | `oportunidades` + `actividades_comerciales` (+ `clientes` si están vacíos) | 16 oportunidades · ~57 actividades |

## Total actual en BD

```
proyecto_tareas         41
vehiculos_bitacora      56
vehiculos                8
actividades_comerciales 57
oportunidades           16
```

## Cómo regenerar

```bash
node scripts/seed-proyecto-tareas.mjs
node scripts/seed-proyecto-tareas-variantes.mjs
node scripts/seed-vehiculos.mjs
node scripts/seed-oportunidades.mjs
```

Cada script es **idempotente**: borra los registros con `[DEMO_SEED]` antes de
insertar, así que se pueden re-correr sin duplicar.

## Cómo limpiar TODO antes de lanzar

```bash
# Ver primero qué se eliminará (no borra nada):
node scripts/clean-demo-seeds.mjs --dry-run

# Eliminar realmente:
node scripts/clean-demo-seeds.mjs
```

El script de limpieza respeta el orden de FK (bitácora antes de vehículos,
actividades antes de oportunidades, etc.).

## Detalle del contenido demo

### Tareas de proyecto
- **PRY-2024-031 — Torre Polanco · Etapa 2**: 17 tareas, ciclo completo de
  proyecto solar (diseño → trámites → procura → instalación → entrega), mezcla
  de estados (4 completadas, 3 en curso, 1 bloqueada, resto pendientes), 4 hitos.
- **PRY-2024-028 — Bodega Industrial Querétaro**: 7 tareas, escenario "cerrado"
  (todo completado, costos reales registrados).
- **PRY-2024-035 — Centro Comercial Pachuca**: 9 tareas, escenario "arranque"
  (1 completada, 1 en curso, resto pendientes).
- **PRY-2024-039 — Solar Sucursal Banca Norte**: 8 tareas, escenario
  "problemático" (2 bloqueadas, retrasos, sobrecostos).

### Vehículos
- 2 por empresa (CIAE, PSE, IED, LIMSON) — pickups, sedanes, vans, camiones,
  motocicletas
- Mezcla de propiedades: propio / arrendamiento financiero / arrendamiento puro
  / rentado / fuera de servicio
- Estatus mezcla: activos, mantenimiento, reparación, fuera de servicio
- 1 con seguro **vencido** (IED · Ford Transit) y 1 **por vencer** en 12 días
- Bitácora: 5-11 eventos por vehículo en los últimos 12 meses (combustible,
  mantenimientos, verificaciones, tenencia, lecturas km)

### Oportunidades
- 16 oportunidades repartidas en todas las etapas del pipeline:
  - 4 leads
  - 3 calificadas
  - 2 visitas técnicas
  - 2 cotizaciones en proceso
  - 2 cotizaciones enviadas
  - 1 negociación
  - 1 ganada (cierre reciente)
  - 1 perdida (con motivo)
- Distribuidas entre las 4 empresas (CIAE, PSE, IED, LIMSON)
- Montos de $280K a $18.5M
- 2-5 actividades por oportunidad (llamadas, reuniones, demos, cotizaciones)

## Convención del marker

Cualquier seed futuro debe seguir la misma convención:
1. Insertar con `observaciones: "[DEMO_SEED]"` (o prefijo seguido de detalle)
2. Antes de re-sembrar, borrar lo previo con `.like("observaciones", "%[DEMO_SEED]%")`
3. Añadir la nueva tabla al `clean-demo-seeds.mjs`

Tablas listas con marker:
- ✅ `proyecto_tareas`
- ✅ `vehiculos`
- ✅ `vehiculos_bitacora`
- ✅ `oportunidades`
- ✅ `actividades_comerciales` (sin marker propio, se borran via oportunidad_id)
- ✅ `clientes` (solo los creados desde cero por seed)
