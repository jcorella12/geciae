// Sembrar variantes simples de tareas en los otros proyectos disponibles
// para que las vistas (lista/kanban/gantt/costos) tengan variedad.
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

const fmt = (d) => d.toISOString().slice(0, 10);
const addDays = (d, n) => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};

// Plantillas por escenario
const ESCENARIOS = {
  // Proyecto cerrado (todo completo)
  cerrado: [
    { titulo: "Levantamiento técnico", estado: "completada", avance: 100, dias: 0, dur: 3, costoEst: 8000, costoReal: 7500, hEst: 16, hReal: 14 },
    { titulo: "Diseño eléctrico aprobado", es_hito: true, estado: "completada", avance: 100, dias: 8, dur: 1 },
    { titulo: "Tramitología CFE / UVIE", estado: "completada", avance: 100, dias: 9, dur: 25, costoEst: 28000, costoReal: 30000, hEst: 20, hReal: 22 },
    { titulo: "Compra de paneles e inversores", estado: "completada", avance: 100, dias: 10, dur: 30, costoEst: 1100000, costoReal: 1080000 },
    { titulo: "Instalación", estado: "completada", avance: 100, dias: 35, dur: 12, costoEst: 145000, costoReal: 152000, hEst: 192, hReal: 210 },
    { titulo: "Pruebas y entrega", estado: "completada", avance: 100, dias: 47, dur: 4, costoEst: 18000, costoReal: 17000 },
    { titulo: "Cierre de proyecto", es_hito: true, estado: "completada", avance: 100, dias: 51, dur: 1 },
  ],
  // Proyecto en arranque (mayoría pendiente)
  arranque: [
    { titulo: "Kick-off con cliente", estado: "completada", avance: 100, dias: 0, dur: 1 },
    { titulo: "Levantamiento técnico", estado: "en_curso", avance: 40, dias: 1, dur: 4, costoEst: 12000, costoReal: 5000, hEst: 24, hReal: 9 },
    { titulo: "Diseño eléctrico", estado: "pendiente", avance: 0, dias: 5, dur: 7, costoEst: 22000, hEst: 32 },
    { titulo: "Diseño estructural", estado: "pendiente", avance: 0, dias: 7, dur: 6, costoEst: 14000, hEst: 24 },
    { titulo: "Diseños aprobados", es_hito: true, estado: "pendiente", avance: 0, dias: 13, dur: 1 },
    { titulo: "Trámite CFE", estado: "pendiente", avance: 0, dias: 14, dur: 30, costoEst: 8000 },
    { titulo: "Compra de equipos", estado: "pendiente", avance: 0, dias: 16, dur: 35, costoEst: 950000 },
    { titulo: "Instalación", estado: "pendiente", avance: 0, dias: 50, dur: 14, costoEst: 180000, hEst: 240 },
    { titulo: "Entrega", es_hito: true, estado: "pendiente", avance: 0, dias: 65, dur: 1 },
  ],
  // Proyecto con problemas (bloqueada + retrasos)
  problematico: [
    { titulo: "Diseño aprobado", estado: "completada", avance: 100, dias: 0, dur: 10, costoEst: 35000, costoReal: 42000, hEst: 60, hReal: 80 },
    { titulo: "Trámite CFE (con observaciones)", estado: "bloqueada", avance: 30, dias: 8, dur: 20, costoEst: 8000, costoReal: 12000 },
    { titulo: "Compra de paneles", estado: "completada", avance: 100, dias: 12, dur: 18, costoEst: 600000, costoReal: 715000 },
    { titulo: "Compra de inversores (atrasado por importación)", estado: "bloqueada", avance: 50, dias: 14, dur: 25, costoEst: 380000, costoReal: 220000 },
    { titulo: "Permiso UVIE", estado: "pendiente", avance: 0, dias: 28, dur: 14, costoEst: 25000 },
    { titulo: "Instalación parcial", estado: "en_curso", avance: 60, dias: 30, dur: 18, costoEst: 165000, costoReal: 110000, hEst: 200, hReal: 145 },
    { titulo: "Pruebas funcionales", estado: "pendiente", avance: 0, dias: 47, dur: 4, costoEst: 12000 },
    { titulo: "Entrega final (en riesgo)", es_hito: true, estado: "pendiente", avance: 0, dias: 51, dur: 1 },
  ],
};

// Listar proyectos disponibles
const { data: proyectos } = await supa
  .from("proyectos")
  .select("id, codigo, nombre, fecha_inicio_planeado")
  .order("created_at", { ascending: false })
  .limit(5);

console.log(`Proyectos: ${proyectos.length}`);

// Mapping: skip primer proyecto (ya tiene tareas), sembrar siguientes con escenarios distintos
const MAPPING = [
  null, // skip primer (ya sembrado por el otro script)
  "cerrado",
  "arranque",
  "problematico",
];

for (let i = 0; i < proyectos.length && i < MAPPING.length; i++) {
  const proyecto = proyectos[i];
  const esc = MAPPING[i];
  if (!esc) {
    console.log(`  · ${proyecto.codigo} → SKIP (ya tiene tareas)`);
    continue;
  }

  const inicio = proyecto.fecha_inicio_planeado
    ? new Date(proyecto.fecha_inicio_planeado)
    : new Date();

  // Limpiar previos
  await supa.from("proyecto_tareas").delete().eq("proyecto_id", proyecto.id);

  const plantilla = ESCENARIOS[esc];
  const rows = plantilla.map((t, idx) => ({
    proyecto_id: proyecto.id,
    orden: idx + 1,
    titulo: t.titulo,
    es_hito: t.es_hito ?? false,
    estado: t.estado,
    prioridad: t.es_hito ? "alta" : t.estado === "bloqueada" ? "urgente" : "media",
    porcentaje_avance: t.avance ?? 0,
    fecha_inicio_planeada: fmt(addDays(inicio, t.dias)),
    fecha_fin_planeada: fmt(addDays(inicio, t.dias + t.dur - 1)),
    horas_estimadas: t.hEst ?? null,
    horas_reales: t.hReal ?? null,
    costo_estimado: t.costoEst ?? null,
    costo_real: t.costoReal ?? null,
    observaciones: DEMO_TAG,
  }));

  const { error } = await supa.from("proyecto_tareas").insert(rows);
  if (error) {
    console.error(`  ✗ ${proyecto.codigo}:`, error.message);
  } else {
    console.log(`  ✓ ${proyecto.codigo} → ${esc} (${rows.length} tareas)`);
  }
}

console.log("\nListo. Visita /proyectos para ver los demos.");
