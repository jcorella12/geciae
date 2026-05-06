# Capturar presupuesto inicial del proyecto

> **Para quién**: Líder de proyecto, director, contralor
> **Cuándo se hace**: en la primera semana del proyecto
> **Tiempo estimado**: 15-20 minutos
> **Por qué importa**: sin presupuesto inicial, el sistema NO puede comparar con realidad y no sabes si el proyecto va bien o mal

## Antes de empezar

Necesitas a la mano:
- La cotización aceptada (PDF firmado)
- Desglose de costos estimados (si lo tienes; si no, lo capturas según mejor estimado)
- Margen objetivo del proyecto (%)
- % de provisión de garantía a aplicar (default 3%)

## Pasos

### 1. Entra al proyecto

**Ruta:** [Proyectos](/proyectos) → click en tu proyecto

Verás varias pestañas: Datos, Tareas, Expediente, Avance, **Rentabilidad**, etc.

### 2. Ve a la pestaña Rentabilidad

Click en "Rentabilidad" (o "P&L").

Si el proyecto NO tiene presupuesto capturado, verás una tarjeta grande:

> "Este proyecto no tiene presupuesto inicial. Captúralo para activar el seguimiento de rentabilidad."

Click en "Capturar presupuesto".

### 3. Pre-llenado automático (si aplica)

Si la cotización aceptada está vinculada al proyecto, el formulario se pre-llena automáticamente:

- **Ingreso total esperado**: del monto de la cotización
- **Presupuesto materiales**: si la cotización tiene desglose, lo toma; si no, queda en cero
- **Resto de campos**: en cero, los completas tú

Si NO hay pre-llenado, captura todo manualmente.

### 4. Completa los campos

**Sección Ingreso esperado:**
- **Ingreso total**: el monto del contrato (sin IVA o con IVA según convención de tu empresa, pero consistente)

**Sección Costos directos presupuestados:**
- **Materiales**: paneles, cables, conectores, estructura, todo lo que compras directo
- **Mano de obra ingeniería**: horas estimadas × tarifa hora_ingeniero
- **Mano de obra campo**: horas estimadas cuadrilla × tarifa hora_técnico × # personas
- **Subcontratos**: OTs a Limson, especialistas externos, etc.
- **Activos compartidos**: estimado de uso de grúa/montacargas/TTR si aplica

**Sección Costos indirectos:**
- **Indirectos**: estimado de reparto que recibirá del grupo (admin, RH, etc.). Usa histórico de proyectos similares.
- **% provisión garantía**: default 3%. Para proyectos industriales puedes subir a 5%, residenciales mantén 2-3%.

**Sección Margen objetivo:**
- **Margen objetivo %**: lo que esperas que el proyecto deje (idealmente >25% para proyectos chicos, >15% para grandes industriales).

### 5. Verifica los totales

El formulario te muestra al pie:
- Total costos presupuestados
- Margen calculado (ingreso - costos)
- Margen %
- Comparación con margen objetivo

Si el margen calculado está MUY abajo del objetivo, revisa:
- ¿Estás siendo demasiado pesimista en costos?
- ¿O la cotización quedó mal y necesitas renegociar?

### 6. Guarda el presupuesto

Click "Guardar".

Sale mensaje "Presupuesto capturado". Ya está vivo el sistema de seguimiento.

### 7. (Opcional pero recomendado) Genera provisión de garantía automática

Botón "Generar provisión garantía automática":
- Sistema crea un costo imputado tipo `provision_garantia`
- Monto = ingreso × % provisión configurado
- Aparece como costo en el P&L (lo que reduce el margen visible al inicio)

**Por qué hacerlo**: muestra la realidad financiera. Sin esta provisión, el proyecto parece más rentable de lo que es.

### 8. Cierra el presupuesto

Click "Cerrar presupuesto".

Esto evita que se modifique a la ligera. **Quien quiera modificarlo debe ser CEO o contralor con justificación**.

## Después de capturar

El sistema empieza a comparar contra realidad automáticamente. Cada vez que:
- Aprueban una OC vinculada al proyecto → suma a "real materiales"
- Registran horas de ingeniería → suma a "real mano de obra"
- Hay reparto de centros → suma a "real indirectos"
- Etc.

Puedes ver el comparativo en cualquier momento entrando a la pestaña Rentabilidad.

## Errores comunes

**Error 1: capturar presupuesto a las prisas**
Si lo haces en 5 minutos sin pensar, los datos quedan mal y el seguimiento es inútil. Tómate 20 minutos serios.

**Error 2: ser demasiado optimista**
Si presupuestas 0 indirectos y 0 garantía, parecerá que el proyecto deja mucho. Después la realidad pega. Mejor presupuestar realista desde el inicio.

**Error 3: olvidar mano de obra**
Esto es el error más común. La gente captura materiales y subcontratos, olvida que su propio equipo también cuesta dinero. Captura mano de obra ingeniería y campo aunque sea estimado grueso.

**Error 4: NO cerrar presupuesto**
Si no lo cierras, el equipo lo va modificando sutilmente para "mejorar" números. Eso destruye el aprendizaje. Ciérralo.

**Error 5: NO regresar a verlo**
Capturar y no revisar es desperdicio de tiempo. Mínimo 1 vez por semana valida que vaya bien.

## Variaciones según tipo de proyecto

**Residencial (PSE Solar)**:
- Margen objetivo típico: 25-35%
- Provisión garantía: 2-3%
- Alta proporción de mano de obra propia

**Comercial (PSE Solar)**:
- Margen objetivo típico: 22-28%
- Provisión garantía: 3-5%
- Mix de mano de obra propia + subcontratos

**Industrial (PSE Solar)**:
- Margen objetivo típico: 18-25%
- Provisión garantía: 5-7%
- Mucho subcontrato, activos compartidos importantes

**Mantenimiento (Limson)**:
- Margen objetivo típico: 30-40%
- Provisión garantía: 1-2%
- Mayoría mano de obra

Ajusta según tu realidad.

## Si necesitas modificar después

Si necesitas modificar un presupuesto cerrado (porque cambió alcance o detectaste error):

1. Solicita reapertura al CEO o contralor con justificación
2. Ellos reabren
3. Modificas
4. Ciérralo otra vez

El sistema deja bitácora de cada cambio.

---

**Flujos relacionados:**
- [Registrar horas trabajadas](/ayuda/flujos/registrar-horas)
- [Aprobar Orden de Compra](/ayuda/flujos/aprobar-oc)
- [Cierre mensual de centros](/ayuda/flujos/cierre-mensual-centros)
