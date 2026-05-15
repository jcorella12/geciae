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

### Módulo SGC completo
- **Detectado:** tablas `sgc_procesos`, `sgc_indicadores`,
  `sgc_riesgos`, `procedimientos`, `procedimientos_versiones`,
  `auditorias_internas`, `auditorias_hallazgos`, `no_conformidades`,
  `revisiones_direccion` existen. La página `/calidad` es shell con
  links a `"#"` y etiquetas "Sprint 10-13".
- **Bloqueado por:** scoping con el cliente — ¿qué subset de ISO 9001
  van a usar en práctica?
- **Estimado:** 5-10 días según alcance.

### Otros módulos con tablas huérfanas (sin UI)
- **PLD/EMA:** `pld_operaciones_inusuales`, `ema_acreditaciones`,
  `ema_dictamenes_uvie`, `ema_certificaciones_emitidas`.
- **RH avanzado:** `finiquitos`, `evaluaciones_desempeno`,
  `bolsa_talento`, `encuestas_satisfaccion`, `viajes_solicitudes`.
- **Otros:** `accesos_externos`, `dossier_documentos`,
  `presupuestos_proyecto`, `productos_serie`, `plantillas_contratos`.
- **Decisión pendiente:** o se construye UI o se eliminan las
  migraciones para reducir ruido en el schema. Probablemente eliminar
  las que no se vayan a usar.

---

## En curso

_(ninguno por el momento)_

---

## Completados recientes

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
