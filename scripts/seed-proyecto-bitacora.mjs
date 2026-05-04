// Seed de eventos de bitácora del proyecto para demo de UI.
// Marker: descripcion contiene "[DEMO_SEED]"
// Run: node scripts/seed-proyecto-bitacora.mjs
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

// Tomar el primer proyecto (PRY-2024-031 Torre Polanco)
const { data: proyectos } = await supa
  .from("proyectos")
  .select("id, codigo")
  .order("created_at", { ascending: false })
  .limit(1);

if (!proyectos || proyectos.length === 0) {
  console.log("Sin proyectos.");
  process.exit(0);
}
const proyecto = proyectos[0];
console.log(`→ Sembrando bitácora en ${proyecto.codigo}`);

// Limpiar previos
await supa
  .from("proyecto_bitacora")
  .delete()
  .eq("proyecto_id", proyecto.id)
  .like("descripcion", `%${DEMO_TAG}%`);

// Buscar primer user para capturado_por
const { data: authUsers } = await supa.auth.admin.listUsers();
const userId = authUsers?.users?.[0]?.id ?? null;

const hoy = new Date();
const dDays = (n) => new Date(hoy.getTime() - n * 86_400_000);

const EVENTOS = [
  {
    diasAtras: 60,
    tipo: "decision",
    titulo: "Aprobado proyecto en comité",
    descripcion: "Cliente firma propuesta económica con 30% anticipo. Plan de ejecución 90 días. " + DEMO_TAG,
    es_critica: false,
  },
  {
    diasAtras: 55,
    tipo: "visita",
    titulo: "Visita técnica al sitio",
    descripcion: "Inspección de azotea, mediciones eléctricas y fotos. Confirmamos viabilidad de instalación de 120 paneles. Sombras mínimas. " + DEMO_TAG,
    es_critica: false,
  },
  {
    diasAtras: 45,
    tipo: "hito_alcanzado",
    titulo: "Diseños aprobados",
    descripcion: "Cliente firma plano eléctrico y estructural sin observaciones. Procedemos con tramitología y procura. " + DEMO_TAG,
    visible_cliente: true,
  },
  {
    diasAtras: 35,
    tipo: "avance",
    titulo: "Solicitud CFE ingresada",
    descripcion: "Ingresada solicitud de interconexión en formato G500 con todos los anexos. Folio 2024-PSE-2031. " + DEMO_TAG,
  },
  {
    diasAtras: 28,
    tipo: "problema",
    titulo: "Atraso en entrega de inversores",
    descripcion: "Proveedor SMA reporta atraso de 2 semanas en importación. Estamos buscando alternativa con SolarEdge. " + DEMO_TAG,
    es_critica: true,
  },
  {
    diasAtras: 21,
    tipo: "decision",
    titulo: "Cambio a SolarEdge",
    descripcion: "Aprobado cambio de marca para mantener cronograma. Especificación técnica equivalente. Aprobado por el cliente vía correo. " + DEMO_TAG,
    visible_cliente: true,
  },
  {
    diasAtras: 14,
    tipo: "reunion",
    titulo: "Junta semanal de seguimiento",
    descripcion: "Asistentes: PM, supervisor obra, cliente. Revisamos cronograma actualizado. Próxima visita CFE programada para la próxima semana. " + DEMO_TAG,
  },
  {
    diasAtras: 7,
    tipo: "foto",
    titulo: "Llegada de paneles a sitio",
    descripcion: "120 paneles bifaciales recibidos en buen estado. Fotos en documentos. " + DEMO_TAG,
  },
  {
    diasAtras: 3,
    tipo: "avance",
    titulo: "Inicio de montaje estructural",
    descripcion: "Cuadrilla A inicia anclaje de rieles. Avance día 1: 30%. " + DEMO_TAG,
  },
  {
    diasAtras: 1,
    tipo: "nota",
    titulo: "Recordatorio: pago segundo plazo",
    descripcion: "Cliente debe pagar 40% al iniciar montaje. Coordinar con cobranza. " + DEMO_TAG,
  },
];

const rows = EVENTOS.map((e) => ({
  proyecto_id: proyecto.id,
  fecha: dDays(e.diasAtras).toISOString(),
  tipo: e.tipo,
  titulo: e.titulo,
  descripcion: e.descripcion,
  es_critica: e.es_critica ?? false,
  visible_cliente: e.visible_cliente ?? false,
  capturado_por: userId,
  capturado_por_nombre: "Joaquín Corella (demo)",
}));

const { data, error } = await supa
  .from("proyecto_bitacora")
  .insert(rows)
  .select("id");

if (error) {
  console.error("Error:", error);
  process.exit(1);
}

console.log(`✓ ${data.length} eventos de bitácora creados`);
console.log(`→ http://localhost:3000/proyectos/${proyecto.id}`);
