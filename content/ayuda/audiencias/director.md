# Manual para Directores

Esta guía es para directores de empresa del grupo (PSE, CIAE, IED, Limson, IAE). Si tu rol es `director`, esto es para ti. Combina visión estratégica con aprobaciones operativas.

## Tu día típico

Mi Día te muestra como director:

- KPIs financieros de tu empresa
- Solicitudes pendientes de aprobación
- Top 5 proyectos en riesgo
- Cumplimiento SAT del periodo
- Margen consolidado del periodo
- Alertas (calibraciones, mantenimientos, vencimientos)

Personaliza qué widgets ves desde "Personalizar" arriba a la derecha.

## Lo que vas a hacer más seguido

### 1. Aprobar OCs y OTs

**Ruta:** [Solicitudes](/solicitudes) (cola de pendientes)

OCs y OTs llegan según umbrales:
- Las pequeñas las aprueba el operativo o aprobador financiero designado
- Las medianas llegan a ti
- Las grandes van a CEO

Antes de aprobar valida:
- **Proveedor**: ¿está autorizado? ¿no está en lista 69-B?
- **Precio**: ¿es razonable contra mercado?
- **Proyecto**: ¿tiene proyecto vinculado para rentabilidad?
- **Centro**: ¿tiene CC asignado para contabilidad?
- **Justificación**: ¿hace sentido el gasto?

Si algo no checa, **rechaza con motivo claro**. No "rechazado" a secas.

### 2. Aprobar préstamos de activos del grupo

Si tu empresa tiene activos compartidos (grúa, montacargas, TTR, etc.) que otras empresas piden prestados, te llegan solicitudes.

**Ruta:** [Activos → Préstamos](/activos/prestamos) → tab "Pendientes aprobar"

Antes de aprobar verifica:
- ¿El activo está disponible en esas fechas?
- ¿La empresa solicitante es de fiar (esto siempre, pero ojo con primera vez)?
- ¿El uso estimado parece razonable?

Si todo checa, click "Aprobar". Solicitante recibe notificación. Cuando devuelven, se factura inter-co automático.

### 3. Revisar P&L de proyectos de tu empresa

**Ruta:** [Proyectos](/proyectos) → click en cualquiera → pestaña "Rentabilidad"

O para vista consolidada: [Reportes → Proyectos P&L](/reportes/proyectos-pnl)

Cosas críticas a vigilar:

**Margen vs objetivo**: si está rojo (>10pp bajo objetivo), conversación urgente con el PM.

**Avance vs tiempo**: si avance < tiempo (ej. 50% avance en 80% del tiempo), proyecto va a salir tarde. Anticipa.

**Materiales**: si están >10% sobre presupuesto, probablemente subestimación o cambio de alcance no documentado.

**Mano de obra**: si las horas reales >> presupuestadas, dos cosas:
- Tu cotización subestimó la complejidad
- O el equipo es ineficiente

Ambas son aprendizajes. Documenta para futuras cotizaciones.

### 4. Cierre mensual de centros

Una vez al mes (sugerido día 5 del mes siguiente):

**Ruta:** [Finanzas → Centros → Cierre Mensual](/finanzas/centros/cierre)

Pasos:
1. Selecciona empresa y mes
2. Click "Preview cierre"
3. Sistema muestra: cada CC compartido, total, repartos por destino, validaciones
4. Si todo OK, click "Ejecutar cierre"
5. Se generan asientos de allocation y opcionalmente CFDIs inter-co borrador

**Importante**: una vez cerrado el mes, se bloquea para evitar modificaciones. Si necesitas reabrir, requiere CEO o contralor con justificación.

### 5. Configurar centros, tarifas, presupuestos

Como director puedes:

**Configurar centros de costo de tu empresa**: [Configuración → Centros](/configuracion/centros)

**Tarifas internas (horas, viáticos)**: [Comercial → Levantamientos → Tarifas](/comercial/levantamientos/tarifas)

**Presupuestos de proyecto**: directo desde la pestaña Rentabilidad de cada proyecto.

### 6. Gestión de personal de tu empresa

**Ruta:** [Personas](/personas) con filtro empresa

Ves a todo el equipo de tu empresa:
- Sus datos
- Categoría laboral (planta, por_obra, REPSE)
- Sueldo base y prestaciones
- Vehículo asignado
- Capacitaciones recibidas
- Bonos manuales del año

**Para registrar bono manual** (no timbrado):

[Persona → Pestaña Bonos → + Nuevo bono](/personas/[id]/bonos)

Llenas: tipo, concepto, monto, motivo, fecha. **Importante**: el sistema marca explícitamente como "no timbrado" para visibilidad fiscal interna.

### 7. Aprobaciones financieras especiales

Si tienes el atributo `aprobador_financiero`, llegan a ti:
- OCs sobre cierto umbral
- OTs inter-co
- Costos imputados manuales a proyectos
- Ajustes de tarifas de activos compartidos
- Reaperturas de cierres

Cada una con justificación. Aprueba o rechaza.

## Reportes que te interesan

### Dashboard de tu empresa

**Ruta:** [Dashboard](/dashboard)

Vista ejecutiva con KPIs de tu empresa filtrados.

### Reportes financieros

- [Cumplimiento SAT](/finanzas/cumplimiento) — obligaciones, vencimientos
- [Estados Financieros](/finanzas/estados-financieros) — mensuales por empresa
- [P&L por centro](/finanzas/centros/pnl) — rentabilidad por línea de negocio
- [$/Wp Ingeniería PSE](/finanzas/centros/eficiencia) — solo si eres director PSE

### Reportes operativos

- [Proyectos por marca](/reportes/por-marca) — útil para PSE/Limson
- [Vendedores](/reportes/vendedores) — desempeño comercial
- [Ejecutivo Mensual](/reportes/ejecutivo-mensual) — resumen general

### P&L de proyectos consolidado

[Reportes → Proyectos P&L](/reportes/proyectos-pnl)

5 tabs:
- Por tipo de proyecto (Residencial vs Comercial vs Industrial)
- Por vendedor
- Por cliente
- Por línea de negocio
- En riesgo

Cada tab te ayuda a tomar decisiones distintas. Por ejemplo: si "Por tipo" muestra que Residencial tiene 8pp menos margen que Comercial, considera enfocar comercial.

## Buenas prácticas

**Sobre aprobaciones**: NO acumules. Si te tardas más de 24h, frena al equipo. Si necesitas info para decidir, pide directo en chat al solicitante. Aprueba o rechaza el día.

**Sobre el cierre mensual**: define día fijo (ej. día 5 del mes siguiente). Comunícalo al equipo. Hazlo siempre. Sin disciplina de cierre, los reportes se desconfiguran.

**Sobre los proyectos en riesgo**: revisa la pestaña "En riesgo" del reporte P&L semanalmente. Anticipa, no reacciones.

**Sobre las decisiones difíciles**: el sistema te da datos. La decisión es tuya. Si un proyecto pierde dinero, tienes opciones (renegociar, recuperar costos vía cambios alcance, asumir pérdida). Sin datos no podías ni elegir.

**Sobre la comunicación con CEO**: el sistema le da visión consolidada. NO tienes que mandar reportes a mano. Pero sí explica decisiones importantes vía chat o reuniones.

**Sobre el equipo**: usa el botón "Sugerir mejora" cuando veas algo que mejorar. Va a CEO/admin. Tu input vale.

## Reportes que vale la pena revisar mensualmente

1. **Estados Financieros del mes** — dictamen rápido
2. **P&L de proyectos cerrados** — qué dejaron
3. **Proyectos en riesgo** — qué requiere atención
4. **Levantamientos por vendedor** — conversión y costo
5. **Cumplimiento SAT** — sin atrasos
6. **Activos compartidos rentabilidad** — ¿usados o no?

15-20 minutos al mes te da control total.

## Si algo sale mal

**Si descubres fraude o irregularidad**: NO actúes solo. Documenta evidencia (screenshots del sistema), reporta a CEO directamente. El sistema tiene logs de auditoría que ayudan a investigar.

**Si un proyecto va a salir muy mal**: comunica al CEO ANTES de que sea tarde. Mejor decir "vamos -15% margen" hoy que descubrir -30% en cierre.

**Si un cliente NO paga**: sistema te muestra cartera vencida. Trabaja con tesorero/contralor para recuperación.

**Si pierdes a un empleado clave**: tu sistema tiene su histórico. Onboarding del reemplazo es más rápido teniendo expedientes y procedimientos documentados.

---

## Preguntas frecuentes

**¿Puedo ver datos de otras empresas del grupo?**
Solo si eres CEO o tienes vínculo activo en otra empresa con rol director. Por default cada director ve solo SU empresa.

**¿Qué hago si rechazo una OC y el solicitante insiste?**
El sistema permite re-someter la OC con cambios. Si el solicitante NO ajusta y vuelve a enviar igual, escala a CEO o tesorero corporativo.

**¿El P&L del proyecto incluye TODOS los costos?**
Casi todos. Materiales (OCs+inventario), subcontratos (OTs), mano de obra (horas registradas), activos compartidos, levantamientos, indirectos vía centros, costos imputados manuales. NO incluye comisiones de venta porque eso depende de tu política de comisiones.

**¿Puedo cerrar un mes parcialmente?**
NO. El cierre es completo: todos los CC compartidos del mes. Esto evita inconsistencias.

**¿Puedo cambiar tarifas internas a mitad de mes?**
Sí, pero el sistema usa la tarifa vigente al momento del registro de la hora. Si cambias hoy, las horas registradas hoy en adelante usan la nueva. Las anteriores mantienen la vieja.

---

**Si necesitas ayuda específica:** habla con CEO directamente o usa [Sugerir mejora](/admin/sugerencias).
