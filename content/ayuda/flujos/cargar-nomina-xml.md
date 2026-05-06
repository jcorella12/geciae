# Cargar XMLs de nómina mensual

> **Para quién**: RH, contralor, director (con permiso)
> **Cuándo se hace**: cada mes (idealmente entre días 1-5 del mes siguiente)
> **Tiempo estimado**: 5-15 minutos por empresa
> **Por qué importa**: empleados ven sus recibos en el portal, sistema calcula compensación total, contralor reporta cumplimiento

## Antes de empezar

Necesitas:
- Los XMLs de CFDI nómina del mes (te los envía el despacho contable, típicamente en ZIP)
- Acceso al sistema con rol director, contralor, o atributo `rh`

## Pasos

### 1. Ve a la página de carga

**Ruta:** [Personas → Cargar nómina](/personas/cargar-nomina)

Verás:
- Selector de empresa
- Área de drop para archivos
- Histórico de uploads anteriores

### 2. Selecciona la empresa

Selector arriba: PSE, CIAE, IED, Limson o IAE. La empresa cuyos XMLs vas a cargar.

**Importante**: si los XMLs son de varias empresas mezcladas (caso raro), tendrás que separarlos primero. El sistema procesa una empresa a la vez.

### 3. Sube los archivos

Tienes 3 opciones:

**Opción A — ZIP completo (recomendado)**
- Drag-and-drop el ZIP al área de carga
- Sistema descomprime y procesa XMLs internos automáticamente

**Opción B — XMLs sueltos**
- Drag-and-drop varios archivos .xml a la vez
- Sistema procesa cada uno

**Opción C — Click para seleccionar**
- Click en el área de carga
- Explorador de archivos se abre
- Selecciona ZIP o XMLs

### 4. Espera el procesamiento

El sistema:
1. Lee cada XML
2. Extrae datos: empleado, percepciones, deducciones, totales
3. Vincula al empleado por CURP/RFC
4. Si encuentra empleados nuevos (CURP no registrada), los marca para tu decisión
5. Guarda el XML original en almacenamiento privado

Esto toma de unos segundos a 1-2 minutos según cuántos archivos sean.

### 5. Revisa los resultados

Después del procesamiento ves:

**Resumen:**
- Total archivos procesados
- Procesados exitosamente
- Con errores (si los hay)
- Empleados nuevos detectados
- Total neto pagado

**Lista de empleados nuevos** (si los hay):
Por cada uno verás:
- CURP
- Nombre que viene en el XML
- RFC
- NSS
- Sueldo base

Tres opciones:
- **Crear automáticamente**: el sistema crea el registro de empleado con datos del XML, asigna a la empresa, vincula el recibo
- **Revisar uno por uno**: te lleva a una pantalla por empleado para que decidas (crear, vincular a empleado existente, ignorar)
- **Cancelar**: deja a los empleados sin vincular (quedan en estado pendiente)

**Recomendación**: revisa uno por uno la primera vez. Después de validar el flujo, "crear automáticamente" funciona bien.

### 6. Si hay errores

Errores comunes:
- **XML corrupto**: vuelve a pedirlo al despacho
- **NO es CFDI nómina**: probablemente es factura regular, ignorar
- **Falta CURP**: depacho debe re-emitir con datos completos
- **CURP duplicada en otra empresa**: el empleado tiene múltiples vínculos, válida con quién pertenece principalmente

Cada error tiene mensaje detallado. Puedes corregir y re-subir solo los que fallaron, no todos.

### 7. Verifica que cargó bien

Después de procesar:

1. Ve a [Personas](/personas), filtra por empresa
2. Click en cualquier empleado
3. Ve a la pestaña "Compensación" o "Recibos"
4. Confirma que su recibo del mes está ahí
5. Click "Ver" para ver detalle de percepciones y deducciones

## Si necesitas re-procesar

**Sí ya cargaste un XML** y por error fue mal:
- El sistema NO duplica si el UUID del CFDI ya existe
- Re-subir el mismo XML sale como "ya procesado"

**Si necesitas borrar un recibo cargado**:
- NO se puede borrar desde la UI (es información fiscal)
- Si fue error grave, contacta al admin para soft-delete con justificación
- Mejor pedir al despacho re-emitir CFDI con UUID nuevo

## Histórico de uploads

**Ruta:** [Personas → Cargar nómina → Uploads anteriores](/personas/cargar-nomina/uploads/[id])

Cada upload queda registrado con:
- Quién lo hizo
- Cuándo
- Cuántos archivos
- Resultados
- Errores si los hubo

Útil para auditoría y para investigar si algo no cuadra después.

## Errores comunes

**Error 1: cargar XMLs de un mes que ya cargaste**
El sistema NO duplica (UUID único de CFDI). Pero el empleado ve "ya hay recibo este mes". Si crees que faltó, valida con histórico.

**Error 2: cargar XMLs de empresa equivocada**
El selector arriba importa. Si seleccionas PSE pero subes XMLs de IED, el sistema lo detecta (RFC del emisor no coincide) y rechaza. Pero mejor seleccionar correcto desde el inicio.

**Error 3: empleados nuevos creados con datos incorrectos**
Si haces "crear automáticamente" y el XML tenía datos incompletos, el empleado queda con info parcial. Revisa cada empleado nuevo y completa después.

**Error 4: olvidar cargar un mes**
Empleados pierden visibilidad del mes en su portal. Recibos se acumulan en el despacho hasta que cargues. Trata de hacerlo siempre dentro de los primeros días del mes.

## Tip para hacerlo más eficiente

**Pide al despacho** que te envíe los XMLs así:
- ZIP organizado por empresa (un ZIP por empresa)
- Nombres descriptivos (`PSE-2026-04.zip`, `CIAE-2026-04.zip`)
- En los primeros 3 días hábiles del mes siguiente

Si tu despacho tarda, ese tiempo te lo cobras al equipo (empleados sin recibo).

## Sobre privacidad

Los XMLs son información sensible:
- Solo TÚ (RH), CEO, director ven el upload
- Empleados solo ven SU propio recibo, no de otros
- Los XMLs guardados están encriptados en almacenamiento

NO compartas XMLs por email o WhatsApp. Si necesitas darle uno a un empleado específico, él lo descarga directo desde su portal.

---

## Después del upload

Tu trabajo continúa con:
- Verificar que cumplimiento SAT del mes está OK
- Validar que IMSS e INFONAVIT del bimestre están al día
- Comunicar al equipo que sus recibos están disponibles

Ellos pueden descargar XML y PDF directo desde [Portal Empleado](/portal-empleado).

---

**Flujos relacionados:**
- [Registrar bono manual a empleado](/ayuda/flujos/registrar-bono-empleado)
- [Consultar mi compensación](/ayuda/flujos/consultar-mi-compensacion)
