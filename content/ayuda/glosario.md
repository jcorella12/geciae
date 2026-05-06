# Glosario

Términos técnicos que aparecen en el sistema. Usa la búsqueda arriba si buscas algo específico.

## Términos fiscales y legales

### CFDI
**Comprobante Fiscal Digital por Internet**. La factura electrónica oficial del SAT. Cada CFDI tiene un UUID (folio fiscal) único e irrepetible. Se usan tanto para emitir (venta a clientes) como para registrar recibidos (compras a proveedores).

### RFC
**Registro Federal de Contribuyentes**. Identificador fiscal único en México. Personas físicas tienen 13 caracteres, morales 12. Cada empresa del grupo (PSE, CIAE, IED, Limson, IAE) tiene su RFC.

### CURP
**Clave Única de Registro de Población**. Identificador único de persona física en México (18 caracteres). Se usa para vincular empleados a su nómina XML.

### NSS
**Número de Seguridad Social**. Asignado por IMSS, identifica a empleado para servicios médicos y pensiones.

### CSF
**Constancia de Situación Fiscal**. Documento del SAT que certifica datos fiscales actualizados de empresa o persona. Vence anualmente.

### Lista 69-B
Lista pública del SAT con contribuyentes con presunción de operaciones inexistentes (fantasmas). Si tu proveedor está aquí, NO puedes deducir sus CFDIs. El sistema te alerta automáticamente.

### REPSE
**Registro de Prestadoras de Servicios Especializados**. Reforma de 2021 que regula subcontratación. Empresas que prestan servicios especializados deben estar registradas en STPS.

### Régimen fiscal
Categoría tributaria del SAT. PSE típicamente Régimen General de Ley Personas Morales (601). Cada CFDI especifica el régimen del emisor.

### ISR
**Impuesto Sobre la Renta**. Impuesto federal sobre ingresos. En nómina se retiene cada periodo de pago según tabla SAT.

### IVA
**Impuesto al Valor Agregado**. 16% en zonas no fronterizas, 8% en franjas fronterizas. Se traslada al cliente o se acredita en compras.

### IMSS
**Instituto Mexicano del Seguro Social**. Cuotas obligatorias que paga patrón y empleado (parte cubierta) cada bimestre.

### INFONAVIT
**Instituto del Fondo Nacional de Vivienda para los Trabajadores**. Si empleado tiene crédito, descuento mensual de su nómina hasta liquidar.

### ISN
**Impuesto Sobre Nómina**. Impuesto estatal sobre lo que paga la empresa por concepto de nómina. En Sonora es 1%.

### DC-3
Constancia oficial STPS que documenta capacitación recibida por empleado. Algunos cursos (Trabajo en Alturas, etc.) son obligatorios y vencen.

### Línea de captura
Código bancario que el SAT genera para pagos. Cada obligación (pago provisional, declaración mensual) tiene su línea. Sistema la captura para tracking.

## Términos del sistema (ERP)

### RLS
**Row Level Security**. Característica de Supabase/Postgres donde cada fila de la base de datos tiene reglas de quién puede verla. Por eso un empleado de PSE NO ve datos de IED, aunque ambos usen el mismo sistema.

### Atributo
Capacidad adicional que se le da a un usuario sobre su rol base. Ejemplos: `aprobador_financiero`, `vendedor`, `contralor`. Un mismo usuario puede tener varios.

### Rol base
La categoría principal de un usuario: ceo, director, operativo, empleado, cliente. Define la mayoría de los permisos.

### Categoría laboral
De empleados: planta (tiempo completo, prestaciones), por_obra (proyecto específico), repse (subcontratado bajo REPSE).

### Centro de costo (CC)
Función dentro de la empresa que consume recursos. Ejemplos: Administración General, Ingeniería PSE, Marketing.

### Centro de utilidad (CU)
Línea de negocio que genera ingresos. Ejemplos: PSE Comercial Industrial, Limson Mantenimientos Externos, CIAE Certificación.

### Reparto (allocation)
Distribución de costos de un CC compartido (ej. Admin) entre las empresas o proyectos que lo consumen. Métodos: por ingresos, por empleados, por proyectos, % manual.

### OC (Orden de Compra)
Documento interno que autoriza compra a un proveedor. Pasa por flujo de aprobación según monto.

### OT (Orden de Trabajo)
**Orden de Trabajo inter-co**: documento que registra servicio prestado entre empresas del grupo. Ejemplo: PSE le paga a Limson para que instale paneles para un cliente PSE.

### Levantamiento técnico
Visita a sitio del cliente para evaluar feasibility de un proyecto solar. Costoso (horas ingeniero + viáticos). Se carga al sub-centro del vendedor que lo solicita.

### Marca visible
La marca con la que el cliente final ve el proyecto, independiente de qué empresa lo opera. Ejemplo: Limson puede ejecutar bajo marca PSE para clientes PSE, o bajo marca Limson para clientes propios.

### Plantilla de proyecto
Estructura predefinida (etapas, tareas, hitos, documentos requeridos) que se aplica al crear un proyecto. PSE Solar tiene 3: Residencial, Comercial, Industrial.

### Tarifa interna
Costo por unidad de un recurso interno: hora_ingeniero, hora_supervisor, hora_técnico_obra, viáticos_dia, kilometraje. Se usa para valorizar levantamientos y horas trabajadas.

### Active compartido
Equipo costoso del grupo (grúa, montacargas, TTR, etc.) que se presta entre empresas. Distinto a vehículos (asignados a empleados) y a `activos_asignados` (EPP/herramientas personales).

### P&L (Profit & Loss)
Estado de Resultados: ingresos - costos = utilidad. En tu sistema, el P&L por proyecto desglosa todo.

### Margen de contribución
Ingresos - costos directos. Mide si el proyecto cubrió sus costos específicos.

### Margen neto
Ingresos - costos directos - costos indirectos. Mide si el proyecto cubrió todo, incluyendo su parte de gastos generales.

### Provisión de garantía
Reserva financiera apartada al inicio del proyecto para cubrir garantías post-venta. Default 3% del ingreso. Se ajusta con realidad al cerrar proyecto.

### $ por Wp
Costo en pesos por Watt pico instalado. KPI específico de proyectos solares. Benchmark: $1.80-2.20 MXN/Wp residencial, menos para industrial.

### Cierre mensual
Proceso administrativo cada mes donde se ejecutan las reglas de reparto de centros, se generan asientos contables internos y opcionalmente CFDIs inter-co. Idealmente día 5 del mes siguiente.

### Cash flow
Flujo de efectivo: timeline de cuándo entra dinero (cobros) vs cuándo sale (pagos). Distinto a margen (que es solo rentabilidad).

### CRM
**Customer Relationship Management**. Sección Comercial del sistema (oportunidades, cotizaciones, clientes).

### SGC
**Sistema de Gestión de Calidad** (ISO 9001). Sección donde viven políticas, procedimientos, formatos del sistema.

### Modo simple / avanzado
Preferencia de UI por usuario. Modo simple es para empleados de campo (Mi Espacio con 4 botones grandes). Modo avanzado es para personal administrativo (Mi Día con widgets).

### Widget
Tarjeta configurable en Mi Día / Dashboard. Cada usuario arma su tablero arrastrando.

### Command Palette
Atajo de teclado `⌘K` (Mac) o `Ctrl+K` (Windows) que abre buscador global desde cualquier página. Acelera navegación y búsqueda de entidades.

### Token de calendario
URL única personal para suscribir el calendario del ERP a Google Calendar / Outlook. Cada usuario puede generar el suyo.

## Conceptos de negocio del grupo CIAE

### El Grupo
Conjunto de 4 empresas operativas (PSE, CIAE, IED, Limson) más IAE (servicios compartidos). Bajo control común.

### PSENERGIA (PSE)
Empresa de venta de sistemas solares al cliente final. Comercial, levantamientos, ingeniería ejecutiva, gestión del cliente.

### CIAE
Empresa con tres líneas: organismo certificador acreditado por EMA, UVIE (verificación NOM-001-SEDE), capacitación con Kajabi LMS.

### IED
Construcción eléctrica industrial, subestaciones, media tensión.

### Limson
Empresa de servicios. Ejecuta para PSE bajo marca PSE (instalaciones, mantenimientos vendidos por PSE), y atiende clientes propios (incluso de competencia de PSE) bajo marca Limson.

### IAE
Servicios compartidos del grupo: Administración, RH, Marketing, Calidad. NO es operativa, presta servicios a las otras 4.

### Inter-co
Abreviación de "intercompañía". Operación entre empresas del grupo. OTs inter-co, préstamos inter-co, cobros inter-co.

### UVIE
Unidad de Verificación de Instalaciones Eléctricas. Servicio de CIAE: verifica cumplimiento NOM-001-SEDE. Necesario para proyectos industriales solares.

### UIIE
Unidad de Inspección de Instalaciones Eléctricas (similar a UVIE para otros propósitos).

---

**Si encuentras un término que no está aquí**, abre [Sugerir mejora](/admin/sugerencias) y lo agregamos.
