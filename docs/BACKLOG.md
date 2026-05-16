# Backlog — sprints pendientes

Índice rápido de trabajo identificado pero no ejecutado. Cuando se vaya a
trabajar uno, abrir su spec individual en `docs/sprint-*.md` y mover de
sección.

---

## Pendientes

### Constancias de capacitación en PDF
- **Doc:** [`sprint-constancias-pdf.md`](./sprint-constancias-pdf.md)
- **Bloqueado por:** assets del cliente (template PDF + firmas PNG +
  datos fijos del cuerpo).
- **Resumen:** generar constancia descargable al completar un curso,
  guardarla en Storage, exponerla en `/perfil` y `/portal-empleado`.
- **Estimado:** 3-5 días de dev hábil + entrega de assets.

### MFA obligatorio para roles sensibles
- **Detectado:** `mfa-section.tsx:131` promete "Sprint 9". Hoy CEO,
  aprobador financiero > 500k y tesorero corporativo pueden operar sin
  segundo factor; MFA es 100 % opt-in.
- **Decisión 2026-05-15 (Joaquín):** activar cuando el sistema ya esté
  en uso productivo cotidiano. Hoy aún hay configuración y onboarding
  de usuarios — forzar MFA generaría fricción innecesaria. Reabrir
  cuando esté el flujo diario corriendo.
- **Resumen:** middleware o server-action guard que rechace
  operaciones sensibles cuando el AAL del usuario < `aal2`. Catálogo de
  acciones que exigen MFA (aprobaciones de OC, transferencias inter-co,
  edición de FIEL, baja de empleados…).
- **Estimado:** 1-2 días.

### UI para `umbrales_aprobacion`
- **Detectado:** tabla existe en migrations, pero nadie la lee/escribe
  desde la app. Los topes (500k MXN para aprobador financiero, etc.)
  están literal en `lib/notificaciones/emisor.ts`. Comentario en
  `invitar-form.tsx:149` marca "TODO Sprint 1C".
- **Resumen:** pantalla CRUD en `/configuracion/umbrales` para que CEO
  ajuste umbrales por empresa y por tipo de transacción. Refactor de
  `emisor.ts` para leer de la tabla.
- **Estimado:** 0.5-1 día.

### Quick-create de empleado y proyecto desde autocompletes
- **Origen:** Sprint 3 / S3-T3 — el patrón quick-create ya está
  implementado para `cliente` (ClientePicker) y `proveedor`
  (ProveedorPicker, wired en OC nueva). Falta el mismo patrón para
  crear empleado y proyecto desde modales/autocompletes.
- **Resumen:** `EmpleadoPicker` y `ProyectoPicker` espejo de los
  existentes + server actions `crearEmpleadoRapido` y
  `crearProyectoRapido` con campos mínimos.
- **Estimado:** 0.5-1 día.

### Wiring `useFormDraft` en 6 forms críticos
- **Origen:** Sprint 4 / T3 + T4. El hook `lib/hooks/use-form-draft.ts`
  y el banner `components/shared/draft-recovery-banner.tsx` están
  listos. Falta retrofittear:
  - `oc-form` (718 líneas)
  - `cotizacion-form` (661 líneas)
  - `cliente-form` (439 líneas)
  - `proyecto/nuevo`, `persona/nuevo`, `proveedor/nuevo` (más chicos)
- **Bloqueador:** los 6 forms usan inputs **uncontrolled** con
  `FormData` puro. Para que autosave funcione hay que pasar cada
  input a controlled state. Es refactor por form — riesgoso meterlo
  prisa sin probar cada campo.
- **Resumen:** cuando se toque un form por otra razón (bugfix,
  nueva validación, etc.), aprovechar para hacer el wiring del
  hook. Marcar el form ya migrado en este ticket.
- **Estimado:** 0.5 día por form × 6 = 3 días si se hace de un golpe.

### Reemplazar `window.confirm/alert/prompt` con shadcn AlertDialog
- **Origen:** Sprint 3 / S3-T8 — más de 30 archivos usan
  `window.confirm/alert/prompt`. El peor offender:
  `comercial/levantamientos/[id]/estado-buttons.tsx` con
  `window.prompt`.
- **Resumen:** `<ConfirmProvider>` + `useConfirm()` que retorne
  `Promise<boolean>` (Radix Dialog ya está en deps). Pasada mecánica.
- **Estimado:** 0.5-1 día.

### Cierre transaccional de centros (Sprint 1 / P5)
- **Origen:** Sprint 1 — patch del paquete original quedó bloqueado.
- **Bloqueado por:** necesita portar `previewCierreMes` de TS
  (`app/(app)/finanzas/centros/cierre/actions.ts:75`) a una RPC SQL
  `calcular_preview_cierre_centros` antes de aplicar.
- **Resumen:** RPC `ejecutar_cierre_mes_centros` ya escrita; rollback
  total si algo falla a mitad del cierre. Idempotente.
- **Estimado:** 1 día extra (portado preview TS→SQL) + el patch.

### Módulo SGC completo
- **Detectado:** tablas `sgc_procesos`, `sgc_indicadores`,
  `sgc_riesgos`, `procedimientos`, `procedimientos_versiones`,
  `auditorias_internas`, `auditorias_hallazgos`, `no_conformidades`,
  `revisiones_direccion` existen. La página `/calidad` es shell con
  links a `"#"` y etiquetas "Sprint 10-13".
- **Bloqueado por:** scoping con el cliente — ¿qué subset de ISO 9001
  van a usar en práctica?
- **Estimado:** 5-10 días según alcance.

### Tablas huérfanas — decisión 2026-05-15

Auditadas las 14 tablas que estaban en el schema sin UI. Veredicto:

**🟢 BUILD — construir UI cuando haya tiempo (2)**
- `finiquitos` — alto impacto, ya tiene RLS. Las 4 empresas pagan
  finiquitos y hoy se llevan en Excel suelto.
- `productos_serie` — PSE instala paneles con número de serie y
  garantía; rastrear serie → cliente → vencimiento es útil real.
  `inventario_movimientos.serie_id` ya tiene la FK esperándola.

**🟡 DEFER — útiles pero no urgentes (5)**
- `evaluaciones_desempeno` — útil para ISO 9001 (CIAE/IED).
- `accesos_externos` — necesita portal cliente/proveedor que aún no
  existe.
- `dossier_documentos` — posible duplicado parcial de la pestaña
  expediente del proyecto; revisar antes de borrar o construir.
- `presupuestos_proyecto` — `proyecto_pnl` ya cubre parte; reabrir si
  piden presupuestos formales pre-ejecución.
- `plantillas_contratos` — generador automático de contratos; reabrir
  cuando lo pidan.

**🔴 DROP — ya borradas en migration 20260623000000 (7)**
- Familia EMA (`ema_acreditaciones`, `ema_dictamenes_uvie`,
  `ema_certificaciones_emitidas`) — Joaquín confirmó que EMA vivirá en
  sistema separado.
- `pld_operaciones_inusuales` — GECIAE no es actividad vulnerable.
- `bolsa_talento` + `encuestas_satisfaccion` — over-engineered para 4
  empresas chicas con relación directa.
- `viajes_solicitudes` — duplicaba `viaticos` que ya está en producción.

---

## En curso

_(ninguno por el momento)_

---

## Completados recientes

- **Sprint 4 — Performance + Autosave** (2026-05-15) — 3 de 5 tickets en
  rama `feat/sprint-4-performance-autosave`: `Promise.all` en
  `proyectos/[id]/page.tsx` paraleliza 14 queries que antes corrían
  secuencialmente (T1), `Promise.all` en `perfil/page.tsx` paraleliza
  7 queries (T2 — `tesoreria/cuentas/[id]` y `personas/[id]` ya
  estaban paralelizados), reparado `convertirAProyecto` propagando
  cotización + oportunidad + copiando conceptos como tareas (T5).
  Hook `useFormDraft` + banner construidos como foundation; el wiring
  en 6 forms (T3+T4) movido al backlog por requerir refactor a
  controlled state.
- **Sprint 3 — UX DROP feeling** (2026-05-15) — 7 de 8 tickets en rama
  `feat/sprint-3-ux-drop`: unificada búsqueda global (T1), `<Ref>` en
  OC table + CFDI detalle (T2), IA factura-vehiculo en alta de vehículo
  (T4), IA cotización en nueva cotización (T5), auto-conciliación
  bancaria en detalle CFDI con RPC nueva (T6), empty-state CTA en
  cuenta bancaria vacía (T7), ProveedorPicker en OC nueva (T3-parcial).
  T3 completo (empleado/proyecto) y T8 (window dialogs) movidos al
  backlog.
- **Sprint 2 — Pagos CFDI + flow OC/OT** (2026-05-15) — 8 de 8 tickets
  en rama `feat/sprint-2-pagos-cfdi-flow-oc-ot`: historial cfdi_pagos
  + idempotencia + uuid_sustituye (T1+T3+T8), procesamiento complemento
  de pago SAT (T2), drop cfdi_recibido_id (T4), regresarOCABorrador
  (T5), wiring auto OT facturada/cobrada (T6), motivo_rechazo y
  motivo_cancelacion separados (T7).
- **Sprint 1 — Críticos de Finanzas** (2026-05-15) — 4 de 5 patches en
  rama `feat/sprint-1-finanzas-criticos`: cron devengo + fix UI (P1),
  folios atómicos OC/OT con advisory lock (P2), auto-aprobación
  distinguible (P3), centros best-effort con audit (P4). Patch 5
  diferido a backlog.
- **Limpieza de schema** (2026-05-15) — drop de 7 tablas huérfanas
  (familia EMA, PLD, bolsa_talento, encuestas_satisfaccion,
  viajes_solicitudes) que no aplican al alcance real del cliente.
  Migration `20260623000000_drop_tablas_no_aplican.sql`.
- **Fixes de cabos sueltos** (2026-05-15):
  - Dashboard widgets (`hero-mis-aprobaciones`, `tesoreria-resumen`,
    `posicion-consolidada`) leían tablas con nombres equivocados y
    reportaban 0 silenciosamente. Ahora apuntan a las tablas reales
    (`proyecto_solicitudes`, `prestamos_inter_co`) e incluyen también
    el crédito bancario dispuesto en la deuda.
  - Vercel Cron cada 6 h en `/api/cron/sat-verificar-pendientes` que
    auto-procesa las descargas SAT pendientes. Requiere `CRON_SECRET`
    en env vars (también lo valida con header `x-vercel-cron`).
  - Scripts `db:status`, `db:push`, `db:diff` en `package.json` para
    detectar drift entre `migrations/` y la DB remota.
- **Capacitaciones** — catálogo de cursos + asignación individual y
  masiva desde la ficha del empleado. (2026-05-15)
- **Drawer móvil del menú "Más"** — fix del BottomNav que no abría
  nada. (2026-05-15)
- **Restablecer contraseñas** — flujo "olvidé mi contraseña" en login,
  cambio de contraseña desde el menú de usuario, y reset de contraseña
  de terceros por CEO/contralor. (2026-05-15)

---

## Notas de proceso

- Un sprint = una entrega vertical (UI + DB + permisos + tests si
  aplica), no una semana de calendario.
- Antes de empezar uno: mover de "Pendientes" → "En curso" en este
  archivo, y abrir/actualizar su `sprint-*.md`.
- Al cerrar: mover a "Completados recientes" con fecha. Cada 6 meses,
  archivar los completados a un anexo histórico para no inflar este
  archivo.
