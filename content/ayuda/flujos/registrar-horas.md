# Registrar horas trabajadas

> **Para quién**: ingenieros (sus propias horas), líderes de proyecto (estimado de cuadrilla)
> **Cuándo se hace**: cada viernes, idealmente en menos de 60 segundos
> **Tiempo estimado**: <2 minutos
> **Por qué importa**: tu tiempo cuesta dinero. Si no se registra, los proyectos parecen más rentables de lo que son y las cotizaciones futuras quedan mal calibradas.

## Si eres ingeniero (registras tus propias horas)

### Pasos

**1. Ve a Mis horas**

**Ruta:** [Personas → Mis horas](/personas/horas)

O desde Mi Día, widget "Registrar horas" si aún no lo hiciste esta semana.

**2. Selecciona la semana**

Default es la semana actual (lunes a domingo). Puedes navegar a semanas anteriores con flechas.

**3. Para cada proyecto donde trabajaste, escribe horas**

Verás cards de los proyectos donde tienes asignación activa. Por cada uno:
- Nombre del proyecto y código
- Input numérico de horas
- Costo calculado en vivo (horas × tarifa hora_ingeniero)

**Tip**: si esta semana fue similar a la pasada, click "Esta semana es como la anterior" — copia los datos.

**4. Verifica el total**

Abajo se muestra el total de horas. Idealmente entre 35-50 horas. Si está fuera del rango, sale warning (no bloqueo).

**5. Click "Guardar"**

Listo. Sistema:
- Guarda tus horas
- Multiplica por tarifa hora_ingeniero vigente de tu empresa
- Costo aparece en P&L del proyecto como "mano de obra ingeniería"

## Si eres líder de proyecto (registras horas estimadas de cuadrilla)

### Pasos

**1. Ve al proyecto**

**Ruta:** [Proyectos → tu proyecto → Horas campo](/proyectos/[id]/horas-campo)

**2. Selecciona la semana**

Misma navegación que ingeniería.

**3. Registra cada cuadrilla activa**

Botón "+ Agregar cuadrilla" o edita las que ya registraste:
- Descripción ("Cuadrilla A - 4 técnicos")
- # personas (4)
- Horas estimadas (default 40h × 4 = 160h, editable)
- Notas opcionales

**4. Click "Guardar"**

Sistema:
- Guarda registro como "campo_estimado"
- Multiplica horas × tarifa hora_técnico_obra
- Costo aparece en P&L del proyecto como "mano de obra campo"

## Tips para hacerlo rápido

**Hábito viernes 4pm**: registra tu semana cada viernes. Si lo haces todas las semanas, te toma <60s. Si esperas a fin de mes, vas a olvidar y a inventar.

**Para ingenieros: ten en mente proyectos top**: probablemente trabajas en 2-3 proyectos a la vez. No 10. Captura solo los que efectivamente atendiste esa semana.

**Para PMs: cuadrillas estables**: si tu Cuadrilla A es siempre 4 personas durante el proyecto, configúrala una vez y solo ajusta horas por semana.

## Errores comunes

**Error 1: olvidar registrar**
Si dejas pasar la semana, el lunes siguiente vas a haber olvidado detalles. Captura el viernes mismo.

**Error 2: sobrestimar horas**
Si captures 50h "sólo por que sí", el P&L del proyecto sale más caro de lo real. Captura honestamente.

**Error 3: NO captarar el proyecto completo**
Si registras solo 20h porque "el resto fue admin", el sistema entiende que solo trabajaste 20h. Si en verdad fue 40 (20 al proyecto + 20 a otras cosas), captura las 20 al proyecto y deja claro el resto.

**Error 4: PM olvidar registrar cuadrilla**
Sin esto, los costos de obra no aparecen en P&L del proyecto. Es información crítica.

## Si necesitas modificar después

Las horas registradas se pueden editar:
- Tú mismo en cualquier momento de la semana actual
- En semanas anteriores si fueron tuyas y no han pasado >30 días
- Más antiguo: requiere CEO

## Sobre las tarifas

Las tarifas internas (hora_ingeniero, hora_técnico_obra) las configura el contralor. Si crees que están desactualizadas, comunícale.

Las tarifas se aplican según vigencia: la hora registrada hoy usa la tarifa vigente hoy. Si cambian la tarifa mañana, las nuevas horas usan la nueva. Las anteriores mantienen la vieja.

## Lo que NO necesitas hacer

- **No registres todos los días**: es semanal, no diario.
- **No registres minuto a minuto**: redondea a la media hora.
- **No registres tareas administrativas**: solo lo que fue trabajo a proyectos.
- **No registres horas de viaje a obra**: incluye en el proyecto si fue de trabajo.

---

**Flujos relacionados:**
- [Capturar presupuesto inicial](/ayuda/flujos/capturar-presupuesto-proyecto)
- [Registrar avance de proyecto](/ayuda/flujos/registrar-avance-proyecto)
