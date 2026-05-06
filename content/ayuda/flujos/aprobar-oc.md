# Aprobar una Orden de Compra (OC)

> **Para quién**: aprobador financiero, director, CEO
> **Cuándo se hace**: cuando llega notificación o ves cola de pendientes
> **Tiempo estimado**: 2-5 minutos por OC

## Antes de empezar

Recibes notificación cuando alguien somete OC que requiere tu aprobación según umbral.

Tu umbral está configurado en [Configuración → Usuarios → tu perfil](/configuracion/usuarios). OCs sobre ese monto suben al siguiente nivel.

## Pasos

### 1. Ve a tu cola de pendientes

**Ruta:** [Solicitudes](/solicitudes) o desde [Notificaciones](/notificaciones)

Filtra por "OCs por aprobar".

### 2. Click en la OC para ver detalle

Verás:
- Número OC, fecha
- Solicitante
- Proveedor (incluyendo si está en lista 69-B del SAT)
- Conceptos con cantidades y precios
- Total con desglose de IVA
- Proyecto vinculado (si tiene)
- Centro de costo asignado (si tiene)
- Justificación
- Documentos adjuntos (cotizaciones del proveedor, etc.)

### 3. Valida cada punto

**Lista de verificación antes de aprobar:**

✓ **Proveedor autorizado**: ¿está en tu catálogo? ¿tiene documentación al día (RFC, opinión positiva 32-D, etc.)? El sistema te avisa si está en lista 69-B (NO aprobar si está).

✓ **Precios razonables**: ¿el precio unitario tiene sentido vs mercado? Si es muy alto, pregunta. Si muy bajo, también pregunta (puede ser error o producto chafa).

✓ **Justificación clara**: ¿hace sentido por qué se necesita? "Para proyecto X" no es suficiente. "Cable XHHW para tendido Manufacturera Noroeste, 200m según plano X" es bueno.

✓ **Proyecto vinculado**: ¿está vinculado al proyecto correcto? Importante para que aparezca en P&L del proyecto.

✓ **Centro de costo**: ¿tiene CC asignado? Si no, el costo se queda "huérfano".

✓ **Documentación adjunta**: cotización del proveedor, comparativos si aplica.

### 4. Decide

**Si todo OK**: Click "Aprobar"
- Opcionalmente agrega comentarios
- Click confirmar

**Si algo falta**: Click "Solicitar correcciones"
- Indica qué falta o cambiar
- Solicitante ajusta y re-somete

**Si NO procede**: Click "Rechazar"
- Motivo claro y específico
- NO "rechazado" a secas. Mejor "rechazado: precio 30% sobre mercado, validar con otra cotización"

### 5. Sistema notifica al solicitante

Llega notificación al solicitante con tu decisión y comentarios.

Si aprobaste:
- OC pasa a estado "aprobada"
- Solicitante puede enviar al proveedor
- Sistema reserva el monto en presupuesto del proyecto (si vinculado)

Si rechazaste:
- OC pasa a estado "rechazada"
- Solicitante puede ajustar y re-someter como nueva OC

## Buenas prácticas

**Aprueba o rechaza en máximo 24h**: si te tardas, frenas al equipo. Mejor aprobar/rechazar el mismo día con info disponible.

**Lee la justificación completa**: NO apruebes en automático. La OC representa dinero real saliendo de tu empresa.

**Pregunta cuando dudes**: si no estás seguro, mejor "Solicitar correcciones" pidiendo info adicional que aprobar a ciegas.

**Verifica proveedor primera vez**: si es un proveedor nuevo, valida documentación antes de aprobar la primera OC.

**Para OCs grandes (>$100k)**: pide cotizaciones comparativas si no las traen.

**Si el solicitante insiste con OC rechazada**: si justifican mejor, aprueba. Si insisten sin ajustar info, escala a tu director.

## Errores comunes

**Error 1: aprobar sin proyecto vinculado**
Si la OC NO tiene proyecto, el costo no aparece en P&L de ningún proyecto y se vuelve costo "general" difícil de rastrear. Mejor solicitar correcciones para que vinculen al proyecto.

**Error 2: aprobar OC duplicada**
A veces dos personas someten la misma compra. Antes de aprobar, busca en histórico OCs similares del mismo proyecto.

**Error 3: aprobar sin verificar proveedor**
Si el proveedor está en lista 69-B (presunción de operaciones inexistentes), su CFDI será rechazado por SAT y NO podrás deducir. Verifica.

**Error 4: aprobar a las prisas**
"Apruebo esto rápido para salir de la cola" suele costar caro. Mejor 5 minutos de validación que 5 horas de cuadrar después.

---

## Si descubres algo raro

**Si descubres irregularidad**: reporta al CEO directamente. Sistema tiene logs de auditoría.

**Si te presionan por aprobar rápido**: a veces hay urgencia genuina, a veces presión injustificada. Tu criterio. Si presionan demasiado, sospecha.

**Si OC tiene desviación grande vs presupuesto del proyecto**: el sistema te alerta. Investiga: ¿cambio alcance? ¿error en presupuesto? ¿oportunidad de renegociar con cliente?

---

**Flujos relacionados:**
- [Crear orden de trabajo inter-co](/ayuda/flujos/crear-ot)
- [Cierre mensual de centros](/ayuda/flujos/cierre-mensual-centros)
