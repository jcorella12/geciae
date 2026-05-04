// Seed sample tareas in proyectos for UI demo.
// Run with: node scripts/seed-proyecto-tareas.mjs
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
// load env from .env.local
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

const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error("Missing Supabase env");

const supa = createClient(url, key, { auth: { persistSession: false } });

// Listar proyectos disponibles (ordenados por fecha)
const { data: proyectos, error: errP } = await supa
  .from("proyectos")
  .select("id, codigo, nombre, fecha_inicio_planeado, fecha_fin_planeado, presupuesto_costo")
  .order("created_at", { ascending: false })
  .limit(5);

if (errP) throw errP;
console.log(`Proyectos disponibles: ${proyectos?.length ?? 0}`);
proyectos?.forEach((p) => {
  console.log(
    `  · ${p.codigo} — ${p.nombre} (${p.fecha_inicio_planeado ?? "?"} → ${p.fecha_fin_planeado ?? "?"})`,
  );
});

if (!proyectos || proyectos.length === 0) {
  console.log("No hay proyectos. Crea uno desde la UI primero.");
  process.exit(0);
}

// Tomar primer proyecto solamente (más detallado)
const proyecto = proyectos[0];
console.log(`\n→ Sembrando tareas para: ${proyecto.codigo}`);

// Si no tiene fechas, usar hoy
const inicio = proyecto.fecha_inicio_planeado
  ? new Date(proyecto.fecha_inicio_planeado)
  : new Date();
const fmt = (d) => d.toISOString().slice(0, 10);
const addDays = (d, n) => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};

// Marker para limpieza posterior
const DEMO_TAG = "[DEMO_SEED]";

// Limpiar tareas previas del demo para idempotencia
await supa.from("proyecto_tareas").delete().eq("proyecto_id", proyecto.id);

// Plantilla de tareas tipo solar industrial / comercial
const TAREAS = [
  // Etapa 1 — Diseño (15 días)
  {
    titulo: "Levantamiento técnico en sitio",
    descripcion: "Visita a sitio, mediciones eléctricas, fotos de azotea, sombras",
    estado: "completada",
    prioridad: "alta",
    porcentaje_avance: 100,
    diasInicio: 0,
    duracion: 3,
    horas_estimadas: 16,
    horas_reales: 18,
    costo_estimado: 8000,
    costo_real: 8500,
  },
  {
    titulo: "Diseño eléctrico preliminar",
    descripcion: "Diagrama unifilar, dimensionamiento de inversores y strings",
    estado: "completada",
    prioridad: "alta",
    porcentaje_avance: 100,
    diasInicio: 3,
    duracion: 5,
    horas_estimadas: 24,
    horas_reales: 22,
    costo_estimado: 15000,
    costo_real: 14000,
  },
  {
    titulo: "Diseño estructural (planos azotea)",
    descripcion: "Cálculo de cargas, fijación, pendientes",
    estado: "completada",
    prioridad: "media",
    porcentaje_avance: 100,
    diasInicio: 5,
    duracion: 6,
    horas_estimadas: 20,
    horas_reales: 24,
    costo_estimado: 12000,
    costo_real: 13500,
  },
  {
    titulo: "Diseños aprobados por cliente",
    es_hito: true,
    estado: "completada",
    prioridad: "alta",
    porcentaje_avance: 100,
    diasInicio: 11,
    duracion: 1,
  },

  // Etapa 2 — Trámites (20 días, paralelo a procura)
  {
    titulo: "Solicitud de interconexión CFE",
    descripcion: "Captura de solicitud en portal CFE, anexos técnicos",
    estado: "en_curso",
    prioridad: "urgente",
    porcentaje_avance: 60,
    diasInicio: 12,
    duracion: 7,
    horas_estimadas: 12,
    horas_reales: 8,
    costo_estimado: 5000,
    costo_real: 3000,
  },
  {
    titulo: "Trámite UVIE (verificación)",
    descripcion: "Contratación de UVIE acreditada, agenda de verificación",
    estado: "bloqueada",
    prioridad: "alta",
    porcentaje_avance: 20,
    diasInicio: 19,
    duracion: 10,
    horas_estimadas: 8,
    costo_estimado: 22000,
  },

  // Etapa 3 — Procura (paralelo)
  {
    titulo: "OC de paneles solares",
    descripcion: "120 paneles bifaciales 580W",
    estado: "en_curso",
    prioridad: "urgente",
    porcentaje_avance: 80,
    diasInicio: 12,
    duracion: 21,
    horas_estimadas: 4,
    horas_reales: 3,
    costo_estimado: 720000,
    costo_real: 680000,
  },
  {
    titulo: "OC inversores SMA",
    descripcion: "2 inversores trifásicos 50kW",
    estado: "en_curso",
    prioridad: "alta",
    porcentaje_avance: 50,
    diasInicio: 14,
    duracion: 28,
    horas_estimadas: 4,
    costo_estimado: 380000,
    costo_real: 195000,
  },
  {
    titulo: "Estructura y cableado",
    descripcion: "Riel de aluminio + cable solar TUV",
    estado: "pendiente",
    prioridad: "media",
    porcentaje_avance: 0,
    diasInicio: 18,
    duracion: 10,
    costo_estimado: 145000,
  },
  {
    titulo: "Equipo en sitio",
    es_hito: true,
    estado: "pendiente",
    prioridad: "alta",
    porcentaje_avance: 0,
    diasInicio: 33,
    duracion: 1,
  },

  // Etapa 4 — Instalación
  {
    titulo: "Montaje estructural",
    descripcion: "Anclaje a azotea, instalación de rieles",
    estado: "pendiente",
    prioridad: "alta",
    porcentaje_avance: 0,
    diasInicio: 35,
    duracion: 5,
    horas_estimadas: 80,
    costo_estimado: 60000,
  },
  {
    titulo: "Colocación de paneles",
    descripcion: "Fijación, conexionado por strings",
    estado: "pendiente",
    prioridad: "alta",
    porcentaje_avance: 0,
    diasInicio: 39,
    duracion: 4,
    horas_estimadas: 64,
    costo_estimado: 48000,
  },
  {
    titulo: "Instalación de inversores y tablero",
    descripcion: "Montaje en muro, conexión AC/DC",
    estado: "pendiente",
    prioridad: "alta",
    porcentaje_avance: 0,
    diasInicio: 42,
    duracion: 3,
    horas_estimadas: 32,
    costo_estimado: 35000,
  },

  // Etapa 5 — Pruebas y entrega
  {
    titulo: "Pruebas funcionales (megger, IV curve)",
    estado: "pendiente",
    prioridad: "media",
    porcentaje_avance: 0,
    diasInicio: 44,
    duracion: 2,
    horas_estimadas: 16,
    costo_estimado: 8000,
  },
  {
    titulo: "Inspección UVIE",
    es_hito: true,
    estado: "pendiente",
    prioridad: "urgente",
    porcentaje_avance: 0,
    diasInicio: 46,
    duracion: 1,
  },
  {
    titulo: "Capacitación a cliente y entrega",
    descripcion: "Manual de operación, lectura de monitoreo",
    estado: "pendiente",
    prioridad: "media",
    porcentaje_avance: 0,
    diasInicio: 47,
    duracion: 2,
    horas_estimadas: 8,
    costo_estimado: 5000,
  },
  {
    titulo: "Cierre de proyecto y RC entregada",
    es_hito: true,
    estado: "pendiente",
    prioridad: "alta",
    porcentaje_avance: 0,
    diasInicio: 49,
    duracion: 1,
  },
];

const rows = TAREAS.map((t, i) => ({
  proyecto_id: proyecto.id,
  orden: i + 1,
  titulo: t.titulo,
  descripcion: t.descripcion ?? null,
  es_hito: t.es_hito ?? false,
  estado: t.estado,
  prioridad: t.prioridad,
  porcentaje_avance: t.porcentaje_avance ?? 0,
  fecha_inicio_planeada: fmt(addDays(inicio, t.diasInicio)),
  fecha_fin_planeada: fmt(addDays(inicio, t.diasInicio + t.duracion - 1)),
  horas_estimadas: t.horas_estimadas ?? null,
  horas_reales: t.horas_reales ?? null,
  costo_estimado: t.costo_estimado ?? null,
  costo_real: t.costo_real ?? null,
  observaciones: DEMO_TAG,
}));

const { data: inserted, error: errI } = await supa
  .from("proyecto_tareas")
  .insert(rows)
  .select("id");

if (errI) {
  console.error("Error insertando tareas:", errI);
  process.exit(1);
}

console.log(`\n✓ ${inserted?.length ?? 0} tareas creadas en ${proyecto.codigo}`);
console.log(`  → http://localhost:3000/proyectos/${proyecto.id}`);
