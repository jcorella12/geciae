# Sprint pendiente — Constancias de capacitación en PDF

**Estado:** pendiente · backlog
**Bloqueado por:** assets del cliente (template + firmas + datos fijos)
**Origen:** sesión 2026-05-15 con Joaquín — pidió que para cursos internos
se genere una constancia en PDF descargable por el empleado.

---

## Objetivo

Que al cerrar una capacitación con resultado `completado`, el sistema
genere automáticamente una constancia en PDF, la suba a Storage y la
ponga disponible para descarga desde:

- La ficha del empleado (`/personas/[id]` pestaña Equipo).
- El portal del empleado (`/portal-empleado` y `/perfil`).

---

## Assets que tiene que entregar el cliente

### 1. Template del PDF (1 archivo, obligatorio)

- 1 página, tamaño carta (US Letter, 8.5 × 11 pulgadas), **horizontal**.
- Diseño completo con: logos del grupo / empresa, marco decorativo,
  headline ("CONSTANCIA DE CAPACITACIÓN" o similar), textos estáticos
  legales / disclaimer.
- **Las áreas dinámicas se dejan vacías**: nombre del empleado, nombre
  del curso, fecha, ciudad, duración en horas, instructor. El backend
  escribe ese texto sobre el template.
- Aceptable: PDF nativo (mejor) o PNG/JPG de muy alta resolución
  (≥ 2200 × 1700 px) que el backend envuelve en PDF.

### 2. Firma(s) en PNG (obligatorio)

- PNG con **fondo transparente** (no JPG — el JPG mete fondo blanco que
  tapa el diseño del template).
- Solo el trazo, sin línea horizontal de apoyo (esa va en el template).
- Resolución ≥ 800 × 400 px.
- Para arrancar basta una sola firma (la del director de capacitación
  interna). Después se puede asociar una firma distinta por instructor.

### 3. Datos fijos (obligatorio)

Para no preguntarlos en cada generación:

- Razón social emisora (¿CIAE Capacitación SA, PSE Energía, GECIAE…?).
- Ciudad por default (probablemente Hermosillo, Sonora).
- Plantilla del párrafo principal. Ejemplo de referencia:

  > Se otorga la presente constancia a **\<NOMBRE\>** por haber concluido
  > satisfactoriamente el curso **\<CURSO\>** con duración de
  > **\<HORAS\>** horas, impartido el **\<FECHA\>** en la ciudad de
  > **\<CIUDAD\>**.

- Nombre completo + puesto de quien firma (ej. "Adrián Marín —
  Instructor certificado STPS").

### 4. Iteración de posiciones (interactivo)

Tras recibir los assets, generamos una constancia de prueba. El cliente
marca correcciones sobre una captura ("nombre 2cm a la izquierda, fecha
más abajo") hasta cuadrar el layout. 2-3 iteraciones típicas.

---

## Opcionales / futuro (no bloqueantes para v1)

- **Templates por empresa** (PSE, CIAE, IED, Limson) — cada uno con su
  branding. El catálogo de cursos ya podría aceptar un campo
  `template_pdf_url` opcional; si está null, usa el genérico.
- **Folio único + QR de verificación**. Folio formato
  `<EMP>-<AÑO>-<NNNN>`. El QR apunta a página pública
  `/c/<token>` que muestra los datos de la constancia (anti-falsificación
  sin exponer la URL del PDF directo).
- **DC-3 STPS estricto**. Para cursos con `genera_dc3 = TRUE` hay un
  formato oficial fijo que no se puede modificar. Hacer plantilla
  separada que cumpla con el formato del SAT/STPS y usarla cuando el
  flag esté activo. Útil para auditorías de cumplimiento.
- **Reenvío automático por correo** al empleado cuando se genera.

---

## Diseño técnico tentativo

### Schema

Ya existe `empleados_capacitaciones.url_constancia` (TEXT). Lo seguimos
usando como ubicación del PDF generado.

Agregar a `capacitaciones` (catálogo):

```sql
ALTER TABLE capacitaciones
  ADD COLUMN IF NOT EXISTS template_pdf_url TEXT,
  ADD COLUMN IF NOT EXISTS firma_instructor_url TEXT;
```

Esos campos son opcionales — si están null, se usa template/firma
genérico almacenado en `/public/templates/constancia-default.pdf` y
`/public/firmas/firma-default.png`.

Opcional (para folio único):

```sql
ALTER TABLE empleados_capacitaciones
  ADD COLUMN IF NOT EXISTS folio TEXT UNIQUE;
```

### Storage

Nuevo bucket privado `constancias`. Path por convención:

```
constancias/<empleado_id>/<asignacion_id>.pdf
```

RLS: el empleado puede leer las suyas; CEO, rh y director de su empresa
pueden leer todas las de su scope.

### Librerías

- **`pdf-lib`** (MIT, sin headless browser, corre en serverless
  Node.js). Permite cargar un PDF existente, dibujar texto encima en
  coordenadas exactas y embeber PNG. Cero dependencias nativas, funciona
  bien en Vercel.
- **`@pdf-lib/fontkit`** si queremos fuentes custom embebidas. Para
  empezar, con las 14 fonts estándar de PDF (Helvetica, Times, etc.)
  alcanza.

### Server action / endpoint

`app/api/capacitaciones/[asignacionId]/constancia/route.ts`:

1. Cargar asignación + curso + empleado + empresa.
2. Verificar permiso (empleado dueño, CEO, rh, o director de su empresa).
3. Si `url_constancia` ya existe en Storage → redirigir / devolver URL
   firmada (signed URL con TTL de 5 minutos).
4. Si no existe:
   - Cargar template (curso.template_pdf_url o genérico).
   - Cargar firma (curso.firma_instructor_url o genérica).
   - Generar PDF con `pdf-lib`: overlay nombre, curso, fecha, horas,
     ciudad, instructor, folio.
   - Subir a Storage en path `<empleado_id>/<asignacion_id>.pdf`.
   - Guardar URL en `empleados_capacitaciones.url_constancia`.
   - Devolver signed URL.

Botón "Descargar constancia" en cliente apunta a ese endpoint.

### Trigger automático (opcional v1)

Cuando `completarAsignacion` marca un curso como `completado`, dispara
en background la generación del PDF para que cuando el empleado entre
ya esté listo. Si falla, la próxima vez que alguien pida el PDF lo
genera on-demand.

---

## Definition of Done

- [ ] Bucket `constancias` creado con RLS apropiada.
- [ ] Columnas `template_pdf_url`, `firma_instructor_url` agregadas al
  catálogo `capacitaciones`.
- [ ] Endpoint `/api/capacitaciones/[id]/constancia` genera PDF on-demand.
- [ ] Trigger automático tras `completarAsignacion`.
- [ ] Botón "Descargar constancia" visible en `/personas/[id]`
  pestaña Equipo (para gestor) y en `/perfil` + `/portal-empleado`
  (para el empleado dueño).
- [ ] Test manual: cerrar un curso, verificar que se genera, descargar
  desde portal-empleado, abrir en un visor y validar layout.
- [ ] (Si se incluye folio) tabla `constancias_verificacion` + página
  pública `/c/<token>` con metadatos validables.

---

## Estimación

- **v1 sin folio/DC-3**: 1-2 días de dev una vez que el cliente entregue
  assets. Iteración de layout: 1 día más de ida y vuelta.
- **v1 con folio + QR + verificación pública**: +1 día.
- **DC-3 estricto**: +1 día (mayormente porque el layout DC-3 oficial
  es fijo y hay que ajustar al milímetro).

**Total estimado:** 3-5 días de dev hábil + entrega de assets del cliente.
