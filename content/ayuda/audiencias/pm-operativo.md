# Manual para Líder de Proyecto y Operativos

Esta sección es para quienes ejecutan proyectos: PMs, supervisores de obra, operativos, ingenieros que llevan proyectos. Si tu rol es `operativo` o tienes el atributo `supervisor_cuadrilla`, esto es para ti.

## Tu día típico

Mi Día te muestra:

- Tareas asignadas con vencimiento
- Proyectos que diriges
- Solicitudes pendientes de aprobación (OCs, OTs)
- Avances pendientes de subir
- Próximos hitos de tus proyectos

## Lo que vas a hacer más seguido

### 1. Gestionar tu proyecto

**Ruta:** [Proyectos](/proyectos) → seleccionar tu proyecto

El detalle del proyecto tiene varias pestañas:

- **Datos**: información general del cliente y contrato
- **Tareas**: lista o vista Kanban de tareas
- **Expediente**: documentos del cliente y técnicos
- **Avance**: reportes de avance y fotos
- **Rentabilidad** (P&L): solo si eres PM o tienes permiso financiero
- **Solicitudes**: cambios de alcance, extras, etc.

**Tip importante**: si arrastras tareas en el Kanban, cambian de estado automáticamente. Si reordenas la lista, cambias prioridad.

### 2. Capturar el presupuesto inicial del proyecto

**Esto es crítico y muchos lo olvidan**. Cuando recibes un proyecto nuevo, lo primero es capturar el presupuesto inicial. Sin él, no podemos saber si el proyecto está siendo rentable o no.

**Ruta:** [Proyecto → Pestaña Rentabilidad → Capturar presupuesto](/proyectos/[id]/pnl)

Si la cotización aceptada está vinculada al proyecto, los datos pre-llenan automáticamente. Tú validas y ajustas si es necesario:

- Ingreso total esperado (del contrato)
- Presupuesto materiales
- Presupuesto mano de obra ingeniería
- Presupuesto mano de obra campo (cuadrilla)
- Presupuesto subcontratos (OTs a Limson, terceros)
- Presupuesto indirectos
- % provisión garantía (default 3%)
- Margen objetivo

**Después de capturar, click "Cerrar presupuesto"**. Esto evita que se modifique a la ligera. Si después necesitas ajustar (cambio mayor de alcance), CEO o contralor pueden reabrirlo con justificación.

Para detalle paso a paso ver [Capturar presupuesto inicial](/ayuda/flujos/capturar-presupuesto-proyecto).

### 3. Registrar avance y horas

**Avance del proyecto** se registra desde la pestaña Avance del proyecto:
- % avance estimado
- Comentario sobre lo logrado
- Fotos (puedes subir desde celular directo a la cámara)
- Hitos completados

**Tus horas de trabajo** las registras semanalmente:

**Ruta:** [Personas → Mis horas](/personas/horas)

Registra al menos 1 vez por semana (preferible viernes) cuántas horas dedicaste a cada proyecto. Toma menos de 60 segundos:

1. Selecciona la semana
2. Para cada proyecto donde trabajaste, escribe horas
3. Total se suma automático
4. Botón "Guardar"

**¿Por qué importa?** Tu tiempo cuesta dinero. Si no se registra, los proyectos parecen más rentables de lo que son. Esto distorsiona decisiones futuras.

**Si eres líder de campo**, también registras horas estimadas de tu cuadrilla. Para esto:

**Ruta:** [Proyecto → Horas campo](/proyectos/[id]/horas-campo)

Cada semana registras la cuadrilla:
- Descripción ("Cuadrilla A - 4 técnicos")
- # personas
- Horas estimadas (default 40h × #personas)

NO se espera precisión absoluta. Un estimado razonable es mejor que datos inexistentes.

### 4. Aprobar OCs y OTs (si tienes el atributo)

Si tienes el atributo `aprobador_financiero`, te llegan notificaciones para aprobar Órdenes de Compra y Órdenes de Trabajo.

**Cola de pendientes:** [Solicitudes](/solicitudes)

Antes de aprobar, valida:
- Que el proveedor sea el correcto y esté autorizado
- Que el precio sea razonable
- Que haya proyecto vinculado (importante para rentabilidad)
- Que tenga centro de costo asignado

Si algo no checa, **rechazas con motivo claro**. El solicitante recibe notificación y puede ajustar.

Tu umbral de aprobación está configurado en tu perfil. Si la OC supera tu umbral, sube al siguiente nivel automáticamente.

### 5. Subir documentos al expediente

Cada proyecto tiene un expediente con documentos requeridos.

**Ruta:** [Proyecto → Expediente](/proyectos/[id]/expediente)

Documentos típicos:
- Contrato firmado
- Anexos técnicos
- Cotización aceptada (PDF firmado)
- Plano del sitio
- Permisos
- Reporte de levantamiento

El sistema te muestra qué falta. Subir es drag-and-drop o "Seleccionar archivo".

**Importante**: documentos del cliente final son confidenciales. Solo el equipo del proyecto y CEO los ven.

### 6. Solicitar préstamo de activo compartido

Si necesitas grúa, montacargas, TTR, medidor, etc. para tu proyecto:

**Ruta:** [Activos → Préstamos → Nuevo](/activos/prestamos/nuevo)

Wizard de 3 pasos:
1. Buscas el activo en el catálogo
2. Llenas: fechas, motivo, proyecto destino, uso estimado
3. Confirmas (verás el costo estimado)

Llega notificación al director de la empresa propietaria. Cuando aprueba, recoges. Al devolver, registras uso real.

**Sobre los costos**: el costo del préstamo (tarifa × uso real) se carga al centro de costo destino que elegiste o al CC default de tu empresa. En tu P&L del proyecto aparece como "activos compartidos".

Para detalle paso a paso ver [Solicitar préstamo de activo](/ayuda/flujos/solicitar-prestamo-activo).

## Reportes que te interesan

### P&L de tu proyecto

**Ruta:** [Proyecto → Pestaña Rentabilidad](/proyectos/[id]/pnl)

Ves:
- Ingresos facturados vs por facturar
- Costos directos: materiales, mano de obra, subcontratos
- Costos indirectos: reparto centros, garantía
- Margen contribución y margen neto
- Comparativo presupuestado vs real (con varianzas color-coded)
- KPIs PSE Solar si aplica ($/Wp)
- Cash flow timeline
- Indicadores de salud temprana

**Si ves rojo**, no entres en pánico. Habla con tu director rápido. Mejor ajustar a tiempo que descubrir al final.

### Estado de tus proyectos

**Ruta:** [Proyectos](/proyectos) con filtros

Vista lista con: código, nombre, cliente, estado, % avance, días para entrega.

## Buenas prácticas

**Sobre captura de horas**: el viernes a las 4pm registra tu semana. Si lo haces todos los viernes, te toma <2 minutos. Si esperas a fin de mes, vas a olvidar y a inventar números, y eso distorsiona el P&L.

**Sobre el avance**: registra avance al menos 1 vez por semana. Con foto si es proyecto físico. Esto le da transparencia al cliente y a la dirección.

**Sobre las solicitudes a campo**: si necesitas extra de presupuesto (cambio de alcance, sobrecostos), levanta solicitud formal con justificación. NO ejecutes y avises después; eso descontrola el P&L.

**Sobre los activos compartidos**: planéa con tiempo. Si necesitas la grúa el lunes, solicita el miércoles anterior. Aprobaciones toman 24-48h.

**Sobre el equipo de obra**: si tienes técnicos REPSE o por_obra, ellos NO registran horas en sistema. Tú registras estimado de cuadrilla. Sus datos personales sí están en Personas para fines administrativos.

## Si algo sale mal

**Si el proyecto va a salir tarde**: notifica formal al director vía solicitud. Documenta el motivo (cliente cambió alcance, proveedor falló, clima, etc.). Esto protege al proyecto en P&L (se ven los cambios alcance) y a ti.

**Si descubres que falta dinero en el presupuesto**: NO hagas malabares. Solicita ajuste al director con justificación. CEO/contralor pueden agregar costo imputado manual.

**Si un activo compartido lo dañaste durante el uso**: al devolver registra "daños reportados" y "requiere mantenimiento". El sistema lo manda a mantenimiento automático. Comunícalo al director.

## Tu portal de empleado

[Portal Empleado](/portal-empleado) muestra tu compensación: sueldo, bonos, vehículo asignado, capacitaciones, total anual.

Si tienes vehículo asignado, ahí ves la gasolina del mes (que se carga al vehículo cuando alguien registra carga de combustible).

---

## Preguntas frecuentes específicas

**¿Cuándo cerrar presupuesto del proyecto?**
Apenas tengas confirmados los datos de la cotización aceptada. Idealmente la primera semana del proyecto.

**¿Qué hago si la cotización no tiene desglose por categoría?**
Captura tu mejor estimado. Mejor un presupuesto aproximado que ninguno.

**¿Por qué mis horas se cargan a costo a un proyecto?**
Porque tu tiempo es el insumo más caro. Si no se imputa, los proyectos parecen baratos. Esto distorsiona cotizaciones futuras.

**¿Mi tasa de conversión afecta mi evaluación?**
Es un dato más, no único. Conversión baja con margen alto puede ser excelente. Habla con tu director sobre lo que se valora.

**¿Cuánto antes solicitar OC?**
Mínimo 5 días antes que necesites el material. Aprobación + envío proveedor suelen tomar ese tiempo.

---

**Si necesitas ayuda específica:** abre un ticket en [Soporte](/soporte/tickets) o pregunta a tu director.
