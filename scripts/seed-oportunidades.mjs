// Seed de oportunidades + actividades para el Pipeline CRM (demo).
// Marker: observaciones = "[DEMO_SEED]"
// Run: node scripts/seed-oportunidades.mjs
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
const hoy = new Date();

// Limpiar demos anteriores
{
  const { data: prev } = await supa
    .from("oportunidades")
    .select("id")
    .like("observaciones", `%${DEMO_TAG}%`);
  const ids = (prev ?? []).map((p) => p.id);
  if (ids.length > 0) {
    await supa.from("actividades_comerciales").delete().in("oportunidad_id", ids);
    await supa.from("oportunidades").delete().in("id", ids);
    console.log(`Limpiadas ${ids.length} oportunidades demo previas.`);
  }
}

// Empresas + clientes existentes
const { data: empresas } = await supa
  .from("empresas")
  .select("id, codigo")
  .eq("activa", true);
const empresaPorCodigo = Object.fromEntries(
  (empresas ?? []).map((e) => [e.codigo, e.id]),
);

// Clientes (todos los del sistema; la relación cliente-empresa es vía clientes_empresas).
// Para el demo añadimos un campo "empresaPreferida" al elegir clientes para cada oportunidad.
let { data: clientes } = await supa
  .from("clientes")
  .select("id, razon_social, rfc")
  .limit(50);

const CLIENTES_DEMO = [
  { razon_social: "Granja Porcícola Sonorense SA de CV", rfc: "GPS220115AB1", empresa: "CIAE" },
  { razon_social: "Centro Logístico Carbajal SA de CV", rfc: "CLC180322XX2", empresa: "PSE" },
  { razon_social: "Hotel Boutique San Carlos SA", rfc: "HBS150610YZ3", empresa: "CIAE" },
  { razon_social: "Bodega Frigorífica MarBlue SA de CV", rfc: "BFM200705AC4", empresa: "CIAE" },
  { razon_social: "TecnoMex Maquiladora SA", rfc: "TMM170820BD5", empresa: "PSE" },
  { razon_social: "Cementera Holcim México SA de CV", rfc: "CHM050315EF6", empresa: "IED" },
  { razon_social: "Walmart de México SAB de CV", rfc: "NWM970611KX7", empresa: "LIMSON" },
  { razon_social: "Distribuidora del Yaqui SA de CV", rfc: "DDY190905FG8", empresa: "CIAE" },
];

// Si no hay clientes, crear los demo (con marker)
if (!clientes || clientes.length === 0) {
  console.log("Sin clientes — creando 8 clientes demo...");
  const { data: nuevosClientes, error: errCl } = await supa
    .from("clientes")
    .insert(
      CLIENTES_DEMO.map((c) => ({
        razon_social: c.razon_social,
        rfc: c.rfc,
        observaciones: DEMO_TAG,
        activo: true,
      })),
    )
    .select("id, razon_social, rfc");

  if (errCl) {
    console.error("Error creando clientes demo:", errCl);
    process.exit(1);
  }
  clientes = nuevosClientes;

  // Vincular cada cliente con su empresa correspondiente vía clientes_empresas
  const vinculos = clientes.map((c) => {
    const def = CLIENTES_DEMO.find((d) => d.rfc === c.rfc);
    return {
      cliente_id: c.id,
      empresa_id: empresaPorCodigo[def?.empresa ?? "CIAE"],
      activo: true,
    };
  });
  const { error: errVin } = await supa.from("clientes_empresas").insert(vinculos);
  if (errVin) console.error("Error vinculando clientes-empresas:", errVin.message);
  console.log(`✓ ${clientes.length} clientes demo creados y vinculados`);
}
console.log(`Clientes disponibles: ${clientes.length}`);

// Buscar primer auth.users para capturado_por en actividades
const { data: authUsers } = await supa.auth.admin.listUsers();
const primerUserId = authUsers?.users?.[0]?.id ?? null;
console.log(`Capturado_por user: ${primerUserId ?? "(ninguno, sin actividades)"}`);

// Mapear cliente → empresa vía clientes_empresas
const { data: vincs } = await supa
  .from("clientes_empresas")
  .select("cliente_id, empresa_id")
  .eq("activo", true);
const empresasPorCliente = new Map();
for (const v of vincs ?? []) {
  if (!empresasPorCliente.has(v.cliente_id))
    empresasPorCliente.set(v.cliente_id, new Set());
  empresasPorCliente.get(v.cliente_id).add(v.empresa_id);
}

// Helper para clientes random por empresa
const clientesPorEmpresa = (empresaId) =>
  clientes.filter((c) => empresasPorCliente.get(c.id)?.has(empresaId));

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

// 16 oportunidades distribuidas en todas las etapas + ganadas/perdidas
const PIPELINE = [
  // LEAD (4)
  { empresa: "CIAE", nombre: "Granja porcícola Hermosillo · Solar 80kW", monto: 1450000, estado: "lead", fuente: "web", diasCierre: 90 },
  { empresa: "PSE", nombre: "Centro logístico Carbajal · Solar 200kW", monto: 3800000, estado: "lead", fuente: "referido", diasCierre: 120 },
  { empresa: "CIAE", nombre: "Cadena restaurantes 5 sucursales · Mantenimiento", monto: 280000, estado: "lead", fuente: "llamada", diasCierre: 45 },
  { empresa: "IED", nombre: "Subestación industrial 5MW · Pemex Aldama", monto: 18500000, estado: "lead", fuente: "feria", diasCierre: 180 },

  // CALIFICADO (3)
  { empresa: "CIAE", nombre: "Hotel boutique San Carlos · Solar 60kW", monto: 1180000, estado: "calificado", fuente: "redes_sociales", diasCierre: 60 },
  { empresa: "PSE", nombre: "Universidad UNISON · Auditoría energética", monto: 450000, estado: "calificado", fuente: "evento", diasCierre: 30 },
  { empresa: "LIMSON", nombre: "Limpieza solar Walmart 12 sucursales", monto: 720000, estado: "calificado", fuente: "cliente_existente", diasCierre: 45 },

  // VISITA TÉCNICA (2)
  { empresa: "CIAE", nombre: "Bodega frigorífica MarBlue · Solar 150kW + baterías", monto: 4200000, estado: "visita_tecnica", fuente: "referido", diasCierre: 75 },
  { empresa: "PSE", nombre: "Maquila electrónica TecnoMex · 90kW", monto: 1750000, estado: "visita_tecnica", fuente: "prospeccion_directa", diasCierre: 60 },

  // COTIZACIÓN EN PROCESO (2)
  { empresa: "CIAE", nombre: "Rancho ganadero El Mezquital · 40kW + bombeo", monto: 980000, estado: "cotizacion_proceso", fuente: "referido", diasCierre: 30 },
  { empresa: "IED", nombre: "Tablero MT 13.8kV · Cementera Holcim", monto: 2850000, estado: "cotizacion_proceso", fuente: "cliente_existente", diasCierre: 45 },

  // COTIZACIÓN ENVIADA (2)
  { empresa: "CIAE", nombre: "Centro médico Pueblo Nuevo · 35kW", monto: 720000, estado: "cotizacion_enviada", fuente: "web", diasCierre: 21 },
  { empresa: "PSE", nombre: "Edificio corporativo Vértice · Solar + UPS", monto: 5400000, estado: "cotizacion_enviada", fuente: "referido", diasCierre: 60 },

  // NEGOCIACIÓN (1)
  { empresa: "CIAE", nombre: "Planta procesadora HortoFresh · 220kW", monto: 4100000, estado: "negociacion", fuente: "feria", diasCierre: 14 },

  // GANADO (1)
  { empresa: "CIAE", nombre: "Bodega Distribuidora del Yaqui · 100kW", monto: 1980000, estado: "ganado", fuente: "referido", diasCierre: -10 },

  // PERDIDO (1)
  { empresa: "PSE", nombre: "Hospital privado · Solar 180kW", monto: 3650000, estado: "perdido", fuente: "llamada", diasCierre: -30, motivo: "Cliente eligió otra opción por crédito a 7 años que no podemos igualar." },
];

const PROB_DEFAULT = {
  lead: 0.1, calificado: 0.25, visita_tecnica: 0.4,
  cotizacion_proceso: 0.55, cotizacion_enviada: 0.7,
  negociacion: 0.85, ganado: 1.0, perdido: 0.0,
};

const PROXIMAS = {
  lead: "Llamada inicial de calificación",
  calificado: "Agendar visita técnica",
  visita_tecnica: "Realizar visita y levantamiento",
  cotizacion_proceso: "Terminar diseño preliminar",
  cotizacion_enviada: "Seguimiento de cotización",
  negociacion: "Cierre con cliente",
};

const inserts = PIPELINE.map((o) => {
  const empresaId = empresaPorCodigo[o.empresa];
  const clientesEmp = clientesPorEmpresa(empresaId);
  const cliente = clientesEmp.length > 0 ? pick(clientesEmp) : pick(clientes);
  const fechaCierre = addDays(hoy, o.diasCierre);
  const esGanada = o.estado === "ganado";
  const esPerdida = o.estado === "perdido";

  return {
    empresa_id: empresaId,
    cliente_id: cliente.id,
    nombre: o.nombre,
    descripcion: `${o.nombre.split("·")[0].trim()} — Oportunidad detectada vía ${o.fuente}.`,
    estado: o.estado,
    monto_estimado: o.monto,
    probabilidad: PROB_DEFAULT[o.estado],
    fuente: o.fuente,
    fecha_proxima_accion:
      esGanada || esPerdida ? null : fmt(addDays(hoy, 1 + Math.floor(Math.random() * 14))),
    proxima_accion: esGanada || esPerdida ? null : PROXIMAS[o.estado],
    fecha_cierre_estimada: fmt(fechaCierre),
    fecha_cierre_real: esGanada || esPerdida ? fmt(fechaCierre) : null,
    motivo_perdida: o.motivo ?? null,
    observaciones: DEMO_TAG,
  };
});

const { data: creadas, error: errO } = await supa
  .from("oportunidades")
  .insert(inserts)
  .select("id, nombre, estado");

if (errO) {
  console.error("Error insertando oportunidades:", errO);
  process.exit(1);
}
console.log(`✓ ${creadas.length} oportunidades creadas`);

// Actividades — solo si tenemos un user para capturado_por
if (primerUserId) {
  const TIPOS_ACT = ["llamada", "correo", "reunion", "visita_tecnica", "demo", "seguimiento", "envio_cotizacion", "nota"];
  const NOTAS = [
    "Cliente interesado, mostró bonos de luz altos",
    "Pendiente confirmación de fechas",
    "Solicita propuesta económica formal",
    "Reunión productiva, ya tenemos plano del sitio",
    "Negociando descuento por volumen",
    "Esperando aprobación interna del cliente",
    "Visita realizada, todo OK estructuralmente",
    "Demo de monitoreo enviada por correo",
  ];

  const actividades = [];
  for (const op of creadas) {
    const numAct = 2 + Math.floor(Math.random() * 4); // 2-5 actividades
    for (let i = 0; i < numAct; i++) {
      const diasAtras = (numAct - i) * 7 + Math.floor(Math.random() * 5);
      const fecha = new Date(hoy.getTime() - diasAtras * 86_400_000);
      actividades.push({
        oportunidad_id: op.id,
        tipo: pick(TIPOS_ACT),
        fecha: fecha.toISOString(),
        duracion_minutos: 15 + Math.floor(Math.random() * 60),
        notas: pick(NOTAS),
        capturado_por: primerUserId,
      });
    }
  }

  const { data: actInserted, error: errA } = await supa
    .from("actividades_comerciales")
    .insert(actividades)
    .select("id");

  if (errA) {
    console.error("Error insertando actividades:", errA.message);
  } else {
    console.log(`✓ ${actInserted.length} actividades creadas`);
  }
}

console.log("\n→ http://localhost:3000/comercial/oportunidades");
