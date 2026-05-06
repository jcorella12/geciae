# Manual para CEO y Contralor

Esta sección es para quienes tienen visión consolidada del grupo: CEO (rol `ceo`) y contralor (atributo `contralor`). Visión cross-empresa, control financiero, decisiones estratégicas.

## Tu día típico

Como CEO o contralor tienes acceso a TODAS las empresas del grupo. Tu Dashboard muestra:

- KPIs financieros consolidados (4 empresas)
- Margen del grupo del periodo
- Cumplimiento SAT de todas las empresas
- Top alertas cross-empresa
- Préstamos inter-co activos
- Centros con desviación vs presupuesto
- Cierres mensuales pendientes

Personalízalo desde "Personalizar" arriba a la derecha.

## Tu vista privilegiada

A diferencia de directores, tú ves TODO:
- Todos los proyectos, todos los clientes, todos los CFDIs
- Todas las nóminas
- Todos los flujos de tesorería
- Las matrices inter-co
- Los logs de auditoría
- La configuración del grupo

**Con gran poder viene gran responsabilidad**: lo que veas es confidencial. Filtraciones de información salarial, márgenes de proyectos, datos de clientes, etc., dañan al grupo.

## Lo que vas a hacer más seguido

### 1. Revisar el panorama del grupo

**Ruta:** [Dashboard](/dashboard) o [Vista pájaro](/dashboard/pajaro)

La vista pájaro te muestra las 4 empresas en una sola pantalla con sus KPIs lado a lado:
- Ingresos del mes
- Margen
- Cumplimiento
- Proyectos activos
- Alertas

Cuando algo se ve fuera de patrón, click para drill-down.

### 2. Aprobar/Validar decisiones grandes

Te llegan a ti (CEO) o son co-aprobadas con director:

- OCs sobre umbral alto
- Préstamos inter-co (financieros) entre empresas
- Reaperturas de cierres mensuales
- Ajustes manuales de costos imputados con monto alto
- Cambios de presupuesto cerrado de proyecto
- Modificaciones a tarifas internas

Cola: [Solicitudes](/solicitudes) con filtro "alto nivel".

### 3. Cierres mensuales del grupo

Del 1 al 5 de cada mes, el grupo hace cierre:

**Ruta:** [Finanzas → Centros → Cierre](/finanzas/centros/cierre)

Idealmente cada director hace el suyo. Tú validas que TODOS estén hechos.

Para cierre completo del grupo:
1. Cada empresa hace su cierre
2. Tú revisas matriz inter-co: [Tesorería → Matriz](/finanzas/tesoreria/matriz)
3. Validas que los repartos cuadran
4. Si hay diferencias, ajustes con justificación

### 4. Estados financieros mensuales

**Ruta:** [Finanzas → Estados Financieros](/finanzas/estados-financieros)

Cada empresa tiene su estado mensual. El sistema NO los genera automático (eso lo hace tu despacho contable), pero los carga el contralor para visibilidad ejecutiva.

Tu trabajo es:
- Asegurarte de que están subidos a tiempo
- Compararlos con datos del ERP (debe haber coherencia)
- Si hay discrepancias, investigar

### 5. Cumplimiento SAT del grupo

**Ruta:** [Finanzas → Cumplimiento](/finanzas/cumplimiento)

Vista consolidada con:
- Obligaciones próximas a vencer
- Pagos provisionales
- Declaraciones mensuales
- Línea de captura para cada obligación
- Status: pendiente, pagado, presentado

Sistema te alerta días antes de vencimiento. NO ignores estas alertas.

### 6. Tesorería consolidada

**Ruta:** [Finanzas → Tesorería](/finanzas/tesoreria)

- **Cuentas bancarias**: saldos por empresa
- **Créditos**: créditos vigentes con bancos
- **Préstamos inter-co**: financieros entre empresas con devengo automático de intereses
- **Matriz inter-co**: posición acumulada de cada empresa con las otras
- **TIIE**: tasa de referencia para cálculos

**Alerta especial**: el sistema tiene cron diario que devenga intereses. Cada mes en cierre se generan los asientos de intereses por pagar/cobrar. Tú validas.

### 7. Decisiones de inversión y desinversión

Reportes que te dan datos para esto:

**Activos compartidos**: [Activos → Reportes](/activos/reportes)
- Rentabilidad por activo (ingresos generados vs costos)
- Utilización (% del año en uso)
- Activos infrautilizados (sugerencia: vender)

**Proyectos**: [Reportes → Proyectos P&L](/reportes/proyectos-pnl)
- ¿Qué tipos dejan más margen?
- ¿Qué clientes son los más rentables?
- ¿Qué vendedores cierran proyectos con mejor margen?

**Líneas de negocio**: [Finanzas → Centros → P&L](/finanzas/centros/pnl)
- Cada CU su margen
- Tendencia mensual
- Comparativos

### 8. Auditorías internas

Si tienes el atributo `auditor_interno`, accedes a:
- Logs de auditoría completos
- Reapertura de meses cerrados
- Vista de movimientos de cualquier usuario
- Reportes de uso del sistema

**Ruta:** [Admin → Uso](/admin/uso)

## Para el contralor específicamente

Tienes responsabilidades operativas adicionales:

### Validación diaria
- Revisar nuevos CFDIs recibidos sin centro asignado: [Configuración → Centros → Limpieza](/configuracion/centros/limpieza)
- Validar OCs aprobadas vs presupuesto del proyecto
- Reconciliar movimientos bancarios

### Limpieza progresiva
**Ruta:** [Configuración → Centros → Limpieza](/configuracion/centros/limpieza)

Aquí ves transacciones (OCs, OTs, CFDIs, gastos) sin centro asignado. Sirve para:
- Asignar centro masivamente
- Detectar transacciones que no debieron pasar sin centro
- Mejorar disciplina del equipo

### Tarifas internas
Cada Q revisas que las tarifas (hora_ingeniero, hora_supervisor, viáticos, kilometraje) reflejen costo real. Si están subestimadas, los proyectos parecen más rentables.

**Ruta:** [Comercial → Levantamientos → Tarifas](/comercial/levantamientos/tarifas)

### Provisiones de garantía
Por cada proyecto cerrado, validas que la provisión se haya generado y se ajuste con realidad de garantías ejecutadas.

### Reglas de reparto
**Ruta:** [Configuración → Centros](/configuracion/centros) → cada CC compartido

Verifica que los % o métodos de reparto sigan siendo apropiados. Si la realidad del grupo cambia (ej. una empresa creció mucho), ajustar.

## Reportes que revisas periódicamente

**Diario** (5 minutos):
- Notificaciones críticas
- Cumplimiento SAT vencimientos próximos

**Semanal** (15 minutos):
- Top proyectos en riesgo
- Cartera vencida
- Cuentas con saldo bajo

**Mensual** (1-2 horas):
- Estados financieros del mes
- P&L del grupo
- Margen por línea de negocio
- Comparativo mensual

**Trimestral** (2-3 horas):
- Tendencias de margen por tipo de proyecto
- Rentabilidad por cliente y vendedor
- Decisiones sobre activos infrautilizados
- Revisión de tarifas internas

## Decisiones estratégicas que el sistema te facilita

**¿Subir precios?** P&L por tipo de proyecto te muestra si tu margen actual está abajo de objetivo. Si sí, subir precio es lógico.

**¿Cambiar mix de productos/servicios?** Si Residencial deja 18% margen y Comercial 32%, enfocar comercial puede ser más rentable que crecer todo.

**¿Despedir o promover?** Reporte de vendedores te muestra desempeño objetivo. NO solo volumen, sino margen.

**¿Comprar activo nuevo?** Reporte de utilización te dice si vale. Si TTR está al 80% del año en uso, otro TTR es justificable. Si está al 30%, no.

**¿Crecer una empresa o consolidar?** Margen por empresa te muestra cuál es más rentable. Crecer la rentable, consolidar la otra.

**¿Renegociar con un cliente?** Reporte por cliente te muestra histórico. Si un cliente representa 30% de tu margen, valorlo. Si representa 30% de tus dolores de cabeza pero 5% de margen, considerar dejarlo.

## Buenas prácticas

**Sobre el shadow del P&L de proyectos**: las primeras 6-8 semanas que esto está activo, valida que los números cuadran con tu sentido de la realidad. Si dice que un proyecto tuvo 15% margen pero tu intuición dice 25%, alguien capturó mal. Investiga.

**Sobre el cierre mensual**: protégelo. Si el cierre se posterga "una semana más", se vuelve hábito y se descontrola. Día 5 fijo, sin excusas.

**Sobre la comunicación con directores**: el sistema te da visibilidad pero NO substituye conversaciones. Reúnete con cada director mensualmente para revisar su empresa.

**Sobre confidencialidad**: lo que ves es información sensible. NO compartas datos de un director con otro casualmente. Usa criterio profesional.

**Sobre la calidad de datos**: tu sistema está bien construido pero la calidad depende del input. Si el equipo registra horas inventadas, tus reportes serán incorrectos. La disciplina del input es más importante que la sofisticación del output.

## Acciones críticas que solo tú o contralor pueden hacer

- Reabrir cierre mensual cerrado
- Modificar reglas de reparto vigentes
- Cambiar tarifas históricas
- Eliminar entidades (siempre soft, nunca hard)
- Reasignar transacciones aprobadas a otro centro
- Ajustar márgenes de activos compartidos
- Aprobar préstamos inter-co financieros grandes

Cada una requiere justificación que queda en bitácora permanente.

## Si algo crítico falla

**Si descubres fraude**: NO confrontes solo. Documenta vía screenshots, exporta logs de auditoría del usuario sospechoso, consulta con asesor legal antes de actuar.

**Si el sistema falla**: tienes respaldos automáticos en Supabase. Si pierdes datos, soporte técnico ayuda.

**Si un dato sale claramente mal**: probablemente input mal capturado. Trazas hacia atrás vía logs.

**Si tu despacho contable cuestiona algo**: el sistema te permite exportar a Excel cualquier reporte. Comparte con ellos para validar.

---

## Preguntas frecuentes

**¿Puedo cambiar el modelo de cobro de servicios compartidos a mitad de año?**
Sí pero ojo: las reglas vigentes aplican prospectivamente. Lo del primer semestre con reglas viejas, segundo con nuevas. Comunica al equipo y al despacho contable.

**¿El sistema substituye al despacho contable?**
No. El sistema es operativo y de gestión. El despacho hace la contabilidad formal y declaraciones. Idealmente alineas la información para que sus números cuadren con los del ERP.

**¿Puedo dar acceso a mi asesor externo (despacho, consultor)?**
Sí, dale rol "auditor_interno" o un perfil restringido. NUNCA compartas tu cuenta personal.

**¿Cuál es la mejor frecuencia de revisión del sistema?**
Diario 5min (notificaciones), semanal 15min (proyectos), mensual 2h (cierre y reportes), trimestral 3h (estratégico).

**¿Si quiero exportar todo el sistema, puedo?**
Sí. Cada reporte tiene "Exportar a Excel". Los datos crudos están en Supabase y son tuyos. NO hay vendor lock-in.

**¿Puedo usar el sistema en otro idioma?**
Hoy es 100% español. Si necesitas inglés (ej. para inversionista extranjero), abre solicitud con CEO/admin. Es desarrollable.

---

**Si necesitas decisión estratégica:** ningún sistema substituye conversaciones difíciles. El ERP te da datos. La decisión es tuya. Buena suerte.
