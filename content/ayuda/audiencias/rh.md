# Manual para Recursos Humanos

Esta sección es para quienes gestionan al personal del grupo. Si tienes el atributo `rh`, esto es para ti. RH típicamente es una sola persona (o equipo pequeño) en IAE que sirve a las 4 empresas.

## Tu día típico

Mi Día te muestra:

- Empleados nuevos pendientes de onboarding
- Cumpleaños de la semana (gesto importante)
- Capacitaciones próximas
- Vencimientos de contratos por_obra
- Cargas de nómina pendientes
- Cumplimiento REPSE próximo

## Lo que vas a hacer más seguido

### 1. Cargar XMLs de nómina mensual

**Esto es lo más importante**. Cada quincena o mes (según tu periodicidad), recibes los XMLs de CFDIs de nómina del despacho contable. Los subes al sistema.

**Ruta:** [Personas → Cargar nómina](/personas/cargar-nomina)

Pasos:
1. Selecciona la empresa (PSE, CIAE, etc.)
2. Drop ZIP o XMLs sueltos en el área de carga
3. Sistema procesa cada XML automáticamente
4. Si encuentra empleados nuevos (CURP no registrada), te pregunta si crearlos
5. Confirmas y todo queda registrado

Después puedes ver el upload en histórico:

**Ruta:** [Personas → Cargar nómina → Uploads](/personas/cargar-nomina/uploads/[id])

Detalle paso a paso en [Cargar XMLs de nómina](/ayuda/flujos/cargar-nomina-xml).

**Importante**: hazlo dentro de los primeros 5 días del mes siguiente. Si te tardas, los empleados no pueden ver su recibo en su portal.

### 2. Gestionar el catálogo de personas

**Ruta:** [Personas](/personas)

Por cada empleado vinculas:
- Datos personales (nombre, CURP, RFC, NSS)
- Categoría laboral (planta, por_obra, REPSE)
- Empresa(s) donde está activo
- Sueldo base y prestaciones
- Cuenta bancaria (para nómina)
- Jefe directo

**Cuando entra alguien nuevo:**
1. [Personas → Nuevo](/personas/nuevo)
2. Captura datos básicos
3. Sube documentos al expediente del empleado
4. Si va a usar el sistema, también crea su cuenta de usuario en [Configuración → Usuarios](/configuracion/usuarios)

**Cuando se va alguien:**
1. Ve a su detalle
2. Click "Editar"
3. Cambia "activo" a falso
4. Captura: fecha baja, motivo
5. NO eliminar (perdemos histórico)

### 3. Bonos manuales

Los bonos en efectivo no timbrados se registran aquí. **Importante**: el sistema los marca explícitamente como "no timbrado" para visibilidad fiscal.

**Ruta:** [Persona → Pestaña Bonos → + Nuevo bono](/personas/[id]/bonos)

Campos:
- Tipo (productividad, puntualidad, antigüedad, evento especial, etc.)
- Concepto (texto descriptivo)
- Monto
- Motivo (justificación clara)
- Fecha
- Comprobante (foto del recibo, opcional pero recomendado)
- Autorizado por (CEO o director)

Aparece en el portal del empleado como parte de su compensación total.

**Si el empleado pregunta dónde verlo:** [Portal Empleado](/portal-empleado) → sección Bonos.

### 4. Capacitaciones

**Ruta:** [Configuración → SGC → Capacitaciones](/configuracion/sgc) (si está implementado) o desde el módulo Calidad.

Cuando contratas un curso para varios empleados:

1. Crea o selecciona la capacitación en el catálogo
2. Sube el costo total y la factura
3. Asigna a los empleados que asistirán
4. El sistema prorratea el costo: si curso costó $20,000 y son 5 asistentes, cada uno ve $4,000 como inversión en él

**Cuando termina el curso:**
1. Marca como completado
2. Sube constancias DC-3 si aplica
3. Define vigencia (ej. 2 años para Trabajo en Alturas)

### 5. Vehículos asignados a empleados

Si la empresa asigna vehículo a empleado (típicamente PMs y vendedores):

**Ruta:** [Activos → Vehículos → seleccionar → Editar](/activos/vehiculos/[id]/edit)

Campo "Asignado a": seleccionas al empleado.

Cuando ese empleado entra a su portal, ve:
- Datos del vehículo
- Gasolina del mes
- Fechas próximas de servicio

Tu trabajo es:
- Mantener actualizada la asignación
- Subir documentos del vehículo (factura, póliza, tarjeta circulación)
- Avisar cuándo se vence seguro

### 6. REPSE (Reforma 2021)

Si tu grupo subcontrata personal especializado bajo REPSE, hay obligaciones:

**Ruta:** [Personas](/personas) con filtro categoría = "repse"

Tu seguimiento:
- Que los REPSE tengan registro vigente
- Que el contrato de servicios especializados esté firmado
- Que las obligaciones SAT/IMSS del proveedor estén al día
- Cumplimiento ante secretaría del trabajo

Si CIAE u otra empresa contrata REPSE, el contralor o director te apoya.

### 7. Gestión del cumplimiento

Empresas con personal tienen obligaciones que vencen:
- IMSS bimestral
- INFONAVIT bimestral
- Declaraciones mensuales con nómina
- DC-3 si hay capacitación
- ISN (impuesto sobre nómina) mensual

**Ruta:** [Finanzas → Cumplimiento](/finanzas/cumplimiento)

Tu rol es alertar al contralor antes de vencimientos. El contralor se encarga del pago, tú de que la información esté lista.

## Reportes que te interesan

### Compensación del equipo

**Ruta:** [Personas → Compensación](/personas/compensacion)

Vista consolidada de:
- Costo total de personal del periodo
- Por empresa
- Por categoría (planta, por_obra, REPSE)
- Por puesto

Útil para:
- Reportes a CEO
- Decisiones de presupuesto
- Comparativos año a año

### Capacitación recibida

[Configuración → SGC](/configuracion/sgc) o reportes específicos:
- Horas de capacitación por empleado
- Costo total invertido
- Cursos próximos a vencer (ej. Trabajo en Alturas vence cada 2 años)

### Cumplimiento DC-3

Lista de empleados con sus DC-3 vigentes y por vencer. Importante para auditorías STPS.

## Buenas prácticas

**Sobre la carga de nómina**: hazlo el día 5 del mes siguiente. Comunica al despacho que necesitas los XMLs antes. Si tardas, empleados no ven su recibo y se quejan.

**Sobre los bonos**: registra TODO bono en el sistema, aunque sea efectivo. La transparencia interna es valiosa. Si en algún momento el grupo decide regularizar todo a timbrado, tendrás histórico claro.

**Sobre las capacitaciones**: NO uses Excel para llevar control paralelo. El sistema lo hace bien y conecta con compensación del empleado y cumplimiento DC-3.

**Sobre los expedientes**: cada empleado tiene espacio para documentos. Sube ahí: contrato, INE, CURP, RFC, NSS, comprobantes capacitación. NO hagas USBs paralelos.

**Sobre la confidencialidad**: tienes acceso a información salarial sensible. Manejo profesional, no comentarios casuales. Empleado A no debe enterarse del sueldo del empleado B vía RH.

**Sobre los empleados nuevos**: onboarding completo en primer día (cuenta de usuario, vehículo si aplica, expediente subido, asignación a proyectos iniciales). Mejor 2 horas el primer día que 2 semanas de seguimientos.

## Cosas que NO haces tú

- **Procesar la nómina**: eso es del despacho contable. Tú cargas el resultado al sistema.
- **Pagar a empleados**: tesorería paga, tú gestionas la información.
- **Aprobar OCs/OTs**: solo aprobadores financieros con atributos.
- **Cierres mensuales de centros**: contralor o director.
- **P&L de proyectos**: PMs y directores.

## Si algo sale mal

**Si subes XML con error**: el sistema valida cada uno y reporta los que fallaron. Investiga el motivo (XML corrupto, CURP mal capturada, etc.) y re-súbelo arreglado. El sistema NO duplica si ya tiene el UUID del CFDI.

**Si un empleado dice que su recibo está mal**: revisa el XML que cargaste vs lo que recibió. La fuente de verdad es el XML del despacho. Si hay inconsistencia, el despacho debe re-emitir CFDI.

**Si pierdes acceso al sistema**: contacta a CEO o admin. Tienes información sensible y la recuperación de cuenta es rigurosa.

**Si hay una visita de STPS o IMSS**: el sistema te da reportes para inspectores. Capacítate antes de la visita en cómo extraerlos. NO improvises ese día.

---

## Preguntas frecuentes

**¿Puedo dar de alta a alguien sin tener su INE digitalizada?**
Puedes capturar datos básicos pero el expediente queda incompleto. Dale 7 días para completar y archivar pendientes en tu vista.

**¿Puedo modificar un recibo de nómina ya cargado?**
NO directamente. Si hay error, el despacho debe re-emitir CFDI con UUID nuevo. Sistema no edita CFDIs.

**¿Cómo gestiono empleados que cambian de empresa dentro del grupo?**
Crea nueva relación empleado-empresa con fecha desde. Mantén la anterior con fecha hasta. Sistema mantiene histórico completo.

**¿Si un empleado pierde su acceso al portal?**
Reset password vía Supabase Auth (admin). El empleado recibe correo para crear nueva password.

**¿Cuáles son los datos más sensibles que manejo?**
CURP, NSS, INFONAVIT, sueldos, INE, comprobantes domicilio. Trato con discreción profesional.

**¿Puedo crear empleados desde Excel masivo?**
Hoy es manual uno por uno. Si tienes >50 empleados nuevos a la vez (compra de empresa, expansión grande), abre solicitud para importador masivo.

---

**Si necesitas ayuda específica:** habla con CEO o usa [Soporte](/soporte/tickets).
