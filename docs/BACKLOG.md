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

---

## En curso

_(ninguno por el momento)_

---

## Completados recientes

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
