// Seed de reportes formales del proyecto para demo de UI.
// Marker: contenido / titulo contiene "[DEMO_SEED]"
// Run: node scripts/seed-proyecto-reportes.mjs
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const envText = readFileSync(resolve(__dirname, "..", ".env.local"), "utf8");
const env = Object.fromEntries(
  envText
    .split("\n")
    .filter((l) => l.includes("=") && !l.startsWith("#"))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    }),
);

const supa = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
);

const DEMO_TAG = "[DEMO_SEED]";

const { data: proyectos } = await supa
  .from("proyectos")
  .select("id, codigo")
  .order("created_at", { ascending: false })
  .limit(1);
if (!proyectos?.length) process.exit(0);
const proyecto = proyectos[0];

console.log(`→ Sembrando reportes en ${proyecto.codigo}`);

await supa
  .from("proyecto_reportes")
  .delete()
  .eq("proyecto_id", proyecto.id)
  .like("contenido", `%${DEMO_TAG}%`);

const { data: authUsers } = await supa.auth.admin.listUsers();
const userId = authUsers?.users?.[0]?.id ?? null;

const hoy = new Date();
const dDays = (n) => new Date(hoy.getTime() - n * 86_400_000).toISOString().slice(0, 10);

const REPORTES = [
  {
    tipo: "incidente",
    severidad: "alta",
    estado: "en_seguimiento",
    titulo: "Falso contacto en tablero principal · sin afectación a usuarios",
    resumen: "Durante prueba inicial de inversores se detectó arco voltaico en barra principal. Equipo seguro, sin lesionados.",
    fecha_evento: dDays(8),
    fecha_reporte: dDays(8),
    ubicacion: "Cuarto eléctrico azotea — tablero principal MT",
    impacto: "Retraso 3 días en pruebas funcionales · costo estimado adicional $12,500 MXN",
    accion_correctiva: "1) Reapriete de barra principal con torquímetro calibrado.\n2) Inspección termográfica antes de re-energizar.\n3) Procedimiento de bloqueo y etiquetado actualizado.\n4) Capacitación cuadrilla próxima semana.",
    fecha_compromiso: dDays(-5),
    contenido: `## Descripción del incidente
Durante la primera energización del tablero principal MT a las 14:23 hrs se observó un arco voltaico en la barra de fase B con duración aproximada de 2 segundos. La protección térmica del transformador interrumpió el suministro automáticamente.

## Causa raíz identificada
Falta de torque en barra de fase B (medido posteriormente: 8 N·m vs 25 N·m especificados). El error se generó durante el armado debido a uso de llave incorrecta.

## Personas involucradas / afectadas
- Cuadrilla A: 3 técnicos
- Supervisor obra: Ing. Hernández
- Sin lesionados, sin daño a terceros

## Acciones inmediatas tomadas
1. Apertura del interruptor principal y bloqueo
2. Inspección visual de las 3 fases
3. Aislamiento del área hasta confirmar seguridad
4. Aviso al cliente y a aseguradora (preventivo)

## Acción correctiva propuesta
Ver sección de plan de acción.

## Lecciones aprendidas
- Estandarizar uso de torquímetro calibrado en TODAS las conexiones de potencia
- Doble verificación obligatoria por supervisor antes de energizar
- Termografía pre-energización para tableros >100A

${DEMO_TAG}`,
    visible_cliente: true,
  },
  {
    tipo: "avance_semanal",
    severidad: "info",
    estado: "emitido",
    titulo: "Reporte semanal — semana 12 (instalación)",
    resumen: "Avance del 18% sobre el plan, 6 tareas completadas y 2 en curso. Sin riesgos críticos abiertos.",
    fecha_reporte: dDays(2),
    contenido: `## Resumen ejecutivo de la semana
Avance acumulado del proyecto: 67% (+18 puntos vs semana anterior).
Equipo y materiales en sitio. Cronograma alineado para cierre el 15 del próximo mes.

## Avance vs plan
- Tareas completadas: Diseño, trámites CFE, procura paneles, montaje estructural
- Tareas en curso: Conexionado de strings (60%), instalación inversores (40%)
- Tareas atrasadas: Permiso UVIE — esperando ventana del verificador

## Hitos alcanzados
- Equipo en sitio (planeado para esta semana, cumplido a tiempo)
- 100% del montaje estructural completado

## Riesgos identificados
- Atraso UVIE: contactando 2 verificadores adicionales como respaldo
- Pronóstico de lluvia próximo fin de semana: se prepararán cubiertas

## Plan próxima semana
- Cerrar conexionado de strings
- Energizar tablero principal y pruebas inversores
- Coordinar visita UVIE

## Apoyos requeridos
- Ninguno crítico esta semana

${DEMO_TAG}`,
    visible_cliente: true,
  },
  {
    tipo: "no_conformidad",
    severidad: "media",
    estado: "resuelto",
    titulo: "Cable solar de calibre incorrecto en string 3",
    resumen: "Auditoría detectó uso de cable 8 AWG en string 3 cuando especificación pedía 6 AWG.",
    fecha_evento: dDays(15),
    fecha_reporte: dDays(15),
    ubicacion: "Azotea sector norte — string 3 (paneles 41-60)",
    impacto: "Capacidad de conducción insuficiente · riesgo de sobrecalentamiento",
    accion_correctiva: "Reemplazo total del cable del string 3 por calibre 6 AWG · re-prueba de aislamiento · actualización de bitácora de materiales con doble verificación.",
    fecha_compromiso: dDays(13),
    contenido: `## Descripción de la no conformidad
Durante auditoría rutinaria del 15° día se detectó que el string 3 (20 paneles) está cableado con conductor 8 AWG. La memoria de cálculo y especificación técnica indican calibre mínimo 6 AWG para esa longitud y corriente.

## Norma / requisito incumplido
- Especificación técnica de proyecto sección 4.2
- NOM-001-SEDE-2012 (artículo 690-31)

## Evidencia objetiva
- Inspección visual + medición de calibre con calibrador
- Foto del cable y etiquetado original (en adjuntos)
- Memoria de cálculo del proyecto

## Causa raíz
Mezcla de carretes en almacén durante la entrega del segundo lote. El conductor de 8 AWG era para la conexión del datalogger, pero se tomó por error.

## Plan de acción correctiva
Completado en 2 días · ver fecha de resolución.

## Verificación de eficacia
Pruebas eléctricas posteriores: caída de tensión < 2%, temperatura operación normal. Cierre confirmado.

${DEMO_TAG}`,
  },
  {
    tipo: "hallazgo_seguridad",
    severidad: "alta",
    estado: "cerrado",
    titulo: "Trabajador sin arnés en pendiente >30°",
    resumen: "Casi accidente: técnico subió a azotea con pendiente sin línea de vida. Detectado por supervisor.",
    fecha_evento: dDays(20),
    fecha_reporte: dDays(20),
    ubicacion: "Azotea sector sur, pendiente 35°",
    impacto: "Potencial: caída desde altura ~6m. Real: ninguno (corregido a tiempo)",
    accion_correctiva: "1) Suspensión inmediata del técnico, capacitación obligatoria.\n2) Briefing diario reforzado con check de EPP firmado.\n3) Línea de vida adicional instalada.",
    fecha_compromiso: dDays(19),
    fecha_resolucion: dDays(18),
    contenido: `## Tipo de hallazgo
Acto inseguro / casi accidente

## Descripción
Trabajador subió a sección de azotea con pendiente >30° sin colocar arnés ni conectar línea de vida. Supervisor lo detectó antes de iniciar actividad.

## Riesgo potencial
Caída desde altura aproximada de 6 metros. Posible lesión grave o fatal.

## Acción inmediata
- Detención del trabajo
- Llamada de atención y registro en bitácora
- Reinstrucción in situ del procedimiento de altura

## Acción correctiva permanente
- Briefing diario obligatorio firmado por TODOS antes de subir
- Auditorías sorpresa de seguridad 2 veces por semana
- Línea de vida adicional instalada en sector sur

## Resultado
Cerrado: trabajador completó capacitación, no se han presentado más incidentes en este proyecto.

${DEMO_TAG}`,
  },
  {
    tipo: "cambio_alcance",
    severidad: "media",
    estado: "emitido",
    titulo: "Cliente solicita 2 paneles adicionales en planta baja",
    resumen: "Aumento de 2 paneles (1.16kW) en sistema. Costo adicional aprobado por cliente vía OC complementaria.",
    fecha_reporte: dDays(5),
    impacto: "Ajuste cronograma +2 días · costo +$11,600 MXN",
    contenido: `## Descripción del cambio solicitado
Cliente solicita instalar 2 paneles adicionales del modelo bifacial 580W en techumbre de bodega lateral, para alimentar zona de carga eléctrica que se construirá próximamente.

## Impacto técnico
- Inversor actual tiene capacidad
- Se requiere cable adicional ~25m
- Tablero requiere un disyuntor extra

## Impacto económico
- Material: $9,800
- Mano de obra: $1,200
- Trámite ante CFE (modificación menor): $600
- TOTAL: $11,600 MXN + IVA

## Impacto en cronograma
+2 días en la fase de instalación. Sin afectar fecha final de entrega.

## Aprobaciones
- Cliente: OC complementaria firmada (ver adjuntos)
- PSE: aprobado por dirección técnica
- CFE: modificación menor a la solicitud — pendiente respuesta

${DEMO_TAG}`,
    visible_cliente: true,
  },
  {
    tipo: "ejecutivo",
    severidad: "info",
    estado: "borrador",
    titulo: "Reporte ejecutivo · cierre de mes",
    resumen: "Borrador. Resumen mensual del proyecto para presentación al consejo.",
    fecha_reporte: dDays(0),
    contenido: `## Resumen ejecutivo del mes
Borrador en construcción. Pendiente:
- Datos finales de avance
- Costo real acumulado
- Riesgos abiertos al cierre del mes
- Proyección para próximo mes

${DEMO_TAG}`,
  },
];

const rows = REPORTES.map((r) => ({
  proyecto_id: proyecto.id,
  tipo: r.tipo,
  severidad: r.severidad,
  estado: r.estado,
  titulo: r.titulo,
  resumen: r.resumen,
  contenido: r.contenido,
  fecha_evento: r.fecha_evento ?? null,
  fecha_reporte: r.fecha_reporte,
  ubicacion: r.ubicacion ?? null,
  impacto: r.impacto ?? null,
  accion_correctiva: r.accion_correctiva ?? null,
  fecha_compromiso: r.fecha_compromiso ?? null,
  fecha_resolucion: r.fecha_resolucion ?? null,
  visible_cliente: r.visible_cliente ?? false,
  creado_por: userId,
  creado_por_nombre: "Joaquín Corella (demo)",
}));

const { data, error } = await supa
  .from("proyecto_reportes")
  .insert(rows)
  .select("id, numero, tipo");

if (error) {
  console.error("Error:", error);
  process.exit(1);
}

console.log(`✓ ${data.length} reportes creados:`);
data.forEach((r) => console.log(`  · ${r.numero} (${r.tipo})`));
console.log(`→ http://localhost:3000/proyectos/${proyecto.id}`);
