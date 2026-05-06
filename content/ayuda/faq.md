# Preguntas frecuentes

## Acceso y cuenta

### ¿Olvidé mi contraseña, qué hago?
En la pantalla de login, click "¿Olvidaste tu contraseña?". Te llega correo con link para crear una nueva. Si no llega, revisa spam o contacta al admin.

### No puedo iniciar sesión aunque mi contraseña es correcta
Verifica que tu cuenta esté activa. Habla con admin para confirmar. También puede ser MFA (autenticación de dos factores) si lo habilitaste — necesitas código de tu app.

### ¿Cómo cambio mi contraseña?
Ve a [Perfil](/perfil) → Seguridad → Cambiar contraseña. Te pide la actual antes de cambiar.

### ¿Cómo cambio mi correo?
Es proceso administrativo. Habla con admin o RH para cambiar tu email registrado.

### ¿El sistema funciona desde celular?
Sí, perfectamente. Tiene vista mobile-first con bottom nav. Para captura de fotos se abre la cámara directo.

### ¿Puedo usar el sistema offline?
No, requiere internet. Si pierdes conexión a mitad de captura, los datos no guardados se pierden. Mejor zona con buena cobertura.

## Personalización

### ¿Cómo cambio entre Modo simple y Modo avanzado?
[Perfil](/perfil) → Preferencias → Modo de usuario. Modo simple es para campo, modo avanzado es completo.

### ¿Puedo cambiar widgets de Mi Día?
Sí. Arriba a la derecha, botón "Personalizar". Puedes agregar, quitar, reordenar (arrastrando), cambiar tamaño.

### ¿Cómo configuro qué notificaciones recibo?
[Perfil → Notificaciones](/perfil/notificaciones). Puedes activar/desactivar por tipo (financieras, proyectos, personas, etc.)

### ¿Hay atajos de teclado útiles?
- `⌘K` o `Ctrl+K`: abre Command Palette (búsqueda global)
- `⌘/` o `Ctrl+/`: muestra todos los atajos disponibles

### ¿Puedo cambiar el tema (claro/oscuro)?
Sí. [Perfil](/perfil) → Apariencia.

## Permisos

### ¿Por qué no puedo ver X que dice el manual?
Probablemente tu rol o atributos no incluyen ese permiso. Habla con tu director si crees que deberías ver.

### Tengo el rol pero no veo cierta empresa
Cada usuario tiene vínculos a empresas específicas. Si necesitas acceso a otra empresa, RH o admin te agrega vínculo.

### ¿Cómo le doy permiso a alguien?
Solo CEO, director o admin pueden gestionar usuarios. Ve a [Configuración → Usuarios](/configuracion/usuarios).

### ¿Por qué hay datos que mi compañero ve pero yo no?
Privacidad. Sueldos, datos de clientes, márgenes — son sensibles y se comparten solo con quien necesita verlos. Si crees que deberías ver, justifica con tu director.

## Datos y rendimiento

### El sistema va lento
Posibles causas:
- Internet lento en tu lado
- Carga inicial pesada (primera vez)
- Reportes con muchos datos

Si persiste, abre [Soporte](/soporte/tickets) con detalle de qué página y cuándo.

### ¿Mis datos se respaldan?
Sí, automáticamente en Supabase. Respaldos diarios. Si pierdes algo por error, contacta admin antes de 7 días para recuperación.

### ¿Puedo exportar todo a Excel?
Sí, casi todas las listas y reportes tienen botón "Exportar a Excel".

### ¿Puedo importar datos de otro sistema?
Para entidades estándar (proveedores, clientes, OCs) hay importadores en algunas secciones. Para casos masivos, abre solicitud.

## Notificaciones

### Recibo demasiadas notificaciones
Ve a [Perfil → Notificaciones](/perfil/notificaciones) y desactiva tipos que no necesitas. NO puedes desactivar las críticas (alertas de seguridad).

### NO me llegan notificaciones
Verifica que en [Perfil → Notificaciones](/perfil/notificaciones) no las hayas desactivado. Si están activas pero no llegan, abre [Soporte](/soporte/tickets).

### ¿Las notificaciones llegan también a mi email?
Hoy NO. Solo en el centro de notificaciones del sistema (campana arriba). Email es feature futura.

## Datos de empleado

### ¿Puedo ver mi recibo de nómina?
Sí, [Portal Empleado](/portal-empleado) → click en cualquier mes → Descargar XML/PDF.

### ¿Puedo ver mi compensación total del año?
Sí, [Portal Empleado](/portal-empleado). Te muestra: sueldo, bonos, vehículo (si tienes), gasolina, capacitaciones, total anual.

### Recibí un bono pero no aparece en mi portal
Habla con RH. Probablemente falta registrarlo en sistema, no es problema técnico.

### Mi vehículo asignado aparece mal
RH actualiza esto. Habla con tu director o RH.

## Proyectos

### ¿Cómo veo mis proyectos?
[Proyectos](/proyectos) con filtro "Asignados a mí" o desde Mi Día.

### Mi proyecto está en "rojo" en P&L, ¿qué hago?
Habla con tu director rápido. Mejor avisar a tiempo que descubrir al final. El sistema solo te muestra el dato, las acciones son humanas.

### ¿Puedo agregar un cliente nuevo?
Sí desde [Clientes → Nuevo](/clientes/nuevo). Si tienes permiso de crearlos.

### ¿Cómo cambio el estado de un proyecto?
Desde el detalle del proyecto, botón "Cambiar estado". Algunos cambios requieren aprobación del director.

## CFDIs y facturas

### Recibí un CFDI por correo, ¿lo subo al sistema?
RH y contralor lo gestionan. Reenvíaselos por mail o al sistema según el flujo de tu empresa.

### Necesito un CFDI de algo que compré, ¿dónde lo solicito?
Habla con el proveedor directamente. El sistema NO genera CFDIs hacia ti, los recibe.

### ¿Cómo veo CFDIs que emití a mi cliente?
[Finanzas → CFDI](/finanzas/cfdi) con filtros. Si tienes permiso financiero.

## Solicitudes y aprobaciones

### Sometí una OC y no me han aprobado
Si pasaron >24h, contacta directo al aprobador (verás quién en el detalle). Si urge, escala a director.

### Mi OC fue rechazada y no entiendo por qué
Lee el motivo en el rechazo. Si no es claro, pregunta al aprobador. Re-somete con ajustes.

### ¿Puedo aprobar OCs de otra empresa?
No por default. Solo aprobador financiero de cada empresa. Si CEO te da permiso especial, sí.

## Preguntas técnicas

### ¿En qué se construyó el sistema?
Next.js 14, Supabase (Postgres), TypeScript estricto, Tailwind CSS, shadcn/ui.

### ¿Quién hace mantenimiento del sistema?
Tu equipo (interno o consultores). El sistema vive en Vercel + Supabase, es propio del grupo, no servicio de terceros.

### ¿Puedo conectar mi calendario de Google?
Próximamente. La feature está documentada pero no implementada todavía. Si urge, comunícale al CEO.

### El manual dice que algo existe pero NO lo veo en mi sistema
El manual cubre TODO el sistema en el momento que se generó. Si no ves algo, puede ser:
- Tu rol/permisos lo restringen
- Es funcionalidad reciente que no se ha implementado en tu instancia
- El sistema cambió y el manual está desactualizado (repórtalo)

---

**¿No encontraste tu pregunta?** Ve a [Soporte → Tickets](/soporte/tickets) o usa el botón "Sugerir mejora" en cualquier página.
