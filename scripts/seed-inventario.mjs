// Seed de inventario demo: items + movimientos.
// Marker: descripcion "[DEMO_SEED]"
// Run: node scripts/seed-inventario.mjs
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

// Limpiar previos
{
  const { data: prev } = await supa
    .from("catalogo_productos")
    .select("id")
    .like("observaciones", `%${DEMO_TAG}%`);
  const ids = (prev ?? []).map((p) => p.id);
  if (ids.length > 0) {
    await supa.from("inventario_movimientos").delete().in("producto_id", ids);
    await supa.from("catalogo_productos").delete().in("id", ids);
    console.log(`Limpiados ${ids.length} items demo previos.`);
  }
}

// User para capturado_por
const { data: authUsers } = await supa.auth.admin.listUsers();
const userId = authUsers?.users?.[0]?.id;
if (!userId) {
  console.log("Sin usuarios; abortando.");
  process.exit(0);
}

// Empresas
const { data: empresas } = await supa
  .from("empresas")
  .select("id, codigo")
  .eq("activa", true);
const empresaCIAE = empresas.find((e) => e.codigo === "CIAE");
if (!empresaCIAE) {
  console.log("Sin empresa CIAE; abortando.");
  process.exit(0);
}

// Almacén principal CIAE
const { data: almacenes } = await supa
  .from("almacenes")
  .select("id, codigo, empresa_id")
  .eq("empresa_id", empresaCIAE.id)
  .eq("activo", true);
const alm = almacenes?.[0];
if (!alm) {
  console.log("Sin almacén CIAE; abortando.");
  process.exit(0);
}

// Items demo: paneles, inversores, estructura, cable, herrajes, etc.
const ITEMS = [
  {
    codigo: "PSE-PAN-580B",
    nombre: "Panel solar bifacial 580W",
    categoria: "panel_solar",
    marca: "Trina Solar",
    modelo: "TSM-580NEG19RC.20",
    unidad: "pieza",
    stock_min: 20,
    valor_mercado: 5800,
    fuente_valor: "Cotización Mayorista Solar 2026",
    compras: [
      { dias: -180, cantidad: 60, costo: 5400 },
      { dias: -90, cantidad: 80, costo: 5650 },
      { dias: -20, cantidad: 100, costo: 5750 },
    ],
  },
  {
    codigo: "PSE-PAN-540M",
    nombre: "Panel solar monofacial 540W",
    categoria: "panel_solar",
    marca: "JA Solar",
    modelo: "JAM72S30-540/MR",
    unidad: "pieza",
    stock_min: 15,
    valor_mercado: 4900,
    fuente_valor: "Lista de precios distribuidor",
    compras: [
      { dias: -150, cantidad: 40, costo: 4700 },
      { dias: -45, cantidad: 60, costo: 4850 },
    ],
  },
  {
    codigo: "PSE-INV-50T",
    nombre: "Inversor trifásico 50kW",
    categoria: "inversor",
    marca: "SMA",
    modelo: "Sunny Tripower CORE2 50",
    unidad: "pieza",
    stock_min: 2,
    valor_mercado: 195000,
    fuente_valor: "Cotización SMA México",
    compras: [
      { dias: -120, cantidad: 4, costo: 185000 },
      { dias: -30, cantidad: 6, costo: 192000 },
    ],
  },
  {
    codigo: "PSE-INV-25E",
    nombre: "Inversor trifásico 25kW",
    categoria: "inversor",
    marca: "SolarEdge",
    modelo: "SE25K-RWS",
    unidad: "pieza",
    stock_min: 3,
    valor_mercado: 95000,
    fuente_valor: "Cotización febrero 2026",
    compras: [
      { dias: -100, cantidad: 5, costo: 92000 },
      { dias: -15, cantidad: 4, costo: 96500 },
    ],
  },
  {
    codigo: "PSE-EST-RAIL",
    nombre: "Riel de aluminio 4.4m",
    categoria: "estructura",
    marca: "K2 Systems",
    modelo: "SpeedRail SR40",
    unidad: "metro",
    stock_min: 200,
    valor_mercado: 280,
    fuente_valor: "Lista mayorista marzo 2026",
    compras: [
      { dias: -200, cantidad: 800, costo: 245 },
      { dias: -60, cantidad: 600, costo: 265 },
      { dias: -10, cantidad: 400, costo: 275 },
    ],
  },
  {
    codigo: "PSE-EST-CLAMP-INT",
    nombre: "Clamp intermedio aluminio 30-40mm",
    categoria: "herraje",
    marca: "K2 Systems",
    modelo: "MidClamp Pro",
    unidad: "pieza",
    stock_min: 100,
    valor_mercado: 75,
    compras: [
      { dias: -200, cantidad: 800, costo: 65 },
      { dias: -60, cantidad: 500, costo: 70 },
    ],
  },
  {
    codigo: "PSE-CAB-6AWG",
    nombre: "Cable solar 6 AWG TUV",
    categoria: "cable",
    marca: "Lapp Kabel",
    modelo: "ÖLFLEX SOLAR XLR-R",
    unidad: "metro",
    stock_min: 500,
    valor_mercado: 95,
    fuente_valor: "Cotización febrero 2026",
    compras: [
      { dias: -180, cantidad: 2000, costo: 78 },
      { dias: -30, cantidad: 1500, costo: 88 },
    ],
  },
  {
    codigo: "PSE-CON-MC4",
    nombre: "Conector MC4 par",
    categoria: "cable",
    marca: "Stäubli",
    modelo: "PV-KST4/PV-KBT4",
    unidad: "pieza",
    stock_min: 50,
    valor_mercado: 65,
    compras: [
      { dias: -180, cantidad: 200, costo: 55 },
      { dias: -30, cantidad: 200, costo: 60 },
    ],
  },
  {
    codigo: "PSE-MON-DL3",
    nombre: "Datalogger Solar-Log 50",
    categoria: "monitoreo",
    marca: "Solar-Log",
    modelo: "Solar-Log 50",
    unidad: "pieza",
    stock_min: 1,
    valor_mercado: 18500,
    compras: [
      { dias: -120, cantidad: 3, costo: 17500 },
    ],
  },
  {
    codigo: "PSE-PROT-DC",
    nombre: "Protección DC string 1000V",
    categoria: "proteccion",
    marca: "Mersen",
    modelo: "PV20-1000",
    unidad: "pieza",
    stock_min: 10,
    valor_mercado: 850,
    compras: [
      { dias: -90, cantidad: 30, costo: 780 },
    ],
  },
];

// Insertar items
const itemRows = ITEMS.map((i) => ({
  empresa_id: empresaCIAE.id,
  codigo: i.codigo,
  nombre: i.nombre,
  descripcion: `${i.nombre} · ${i.marca} · ${i.modelo}. ${DEMO_TAG}`,
  categoria: i.categoria,
  marca: i.marca,
  modelo: i.modelo,
  unidad_medida: i.unidad,
  stock_minimo: i.stock_min,
  valor_mercado: i.valor_mercado,
  fecha_actualizacion_valor: fmt(hoy),
  fuente_valor: i.fuente_valor ?? "Cotización demo",
  observaciones: DEMO_TAG,
  activo: true,
}));

const { data: itemsCreated, error: errItems } = await supa
  .from("catalogo_productos")
  .insert(itemRows)
  .select("id, codigo");

if (errItems) {
  console.error("Error insertando items:", errItems);
  process.exit(1);
}
console.log(`✓ ${itemsCreated.length} items demo creados`);

// Insertar movimientos (entradas)
const movs = [];
for (const item of ITEMS) {
  const dbItem = itemsCreated.find((c) => c.codigo === item.codigo);
  if (!dbItem) continue;
  for (const compra of item.compras) {
    movs.push({
      empresa_id: empresaCIAE.id,
      producto_id: dbItem.id,
      almacen_id: alm.id,
      tipo: "entrada_compra",
      fecha: fmt(addDays(hoy, compra.dias)),
      cantidad: compra.cantidad,
      costo_unitario: compra.costo,
      observaciones: `Compra demo. ${DEMO_TAG}`,
      capturado_por: userId,
    });
  }
}

const { error: errMov } = await supa
  .from("inventario_movimientos")
  .insert(movs);

if (errMov) {
  console.error("Error insertando movimientos:", errMov);
  process.exit(1);
}
console.log(`✓ ${movs.length} movimientos de entrada creados`);

// Salidas de algunos items a proyectos demo
const { data: proyectos } = await supa
  .from("proyectos")
  .select("id, codigo, empresa_id")
  .eq("empresa_id", empresaCIAE.id)
  .limit(3);

if (proyectos && proyectos.length > 0) {
  const proy = proyectos[0];
  const salidas = [];
  // Sacar paneles, riel, cable al primer proyecto
  const itemMap = Object.fromEntries(itemsCreated.map((i) => [i.codigo, i.id]));
  if (itemMap["PSE-PAN-580B"]) {
    salidas.push({
      empresa_id: empresaCIAE.id,
      producto_id: itemMap["PSE-PAN-580B"],
      almacen_id: alm.id,
      tipo: "salida_proyecto",
      fecha: fmt(addDays(hoy, -10)),
      cantidad: 60,
      proyecto_id: proy.id,
      observaciones: `Salida a proyecto ${proy.codigo}. ${DEMO_TAG}`,
      capturado_por: userId,
    });
  }
  if (itemMap["PSE-INV-50T"]) {
    salidas.push({
      empresa_id: empresaCIAE.id,
      producto_id: itemMap["PSE-INV-50T"],
      almacen_id: alm.id,
      tipo: "salida_proyecto",
      fecha: fmt(addDays(hoy, -8)),
      cantidad: 2,
      proyecto_id: proy.id,
      observaciones: `Salida a proyecto. ${DEMO_TAG}`,
      capturado_por: userId,
    });
  }
  if (itemMap["PSE-EST-RAIL"]) {
    salidas.push({
      empresa_id: empresaCIAE.id,
      producto_id: itemMap["PSE-EST-RAIL"],
      almacen_id: alm.id,
      tipo: "salida_proyecto",
      fecha: fmt(addDays(hoy, -5)),
      cantidad: 320,
      proyecto_id: proy.id,
      observaciones: `Riel de aluminio. ${DEMO_TAG}`,
      capturado_por: userId,
    });
  }
  if (itemMap["PSE-CAB-6AWG"]) {
    salidas.push({
      empresa_id: empresaCIAE.id,
      producto_id: itemMap["PSE-CAB-6AWG"],
      almacen_id: alm.id,
      tipo: "salida_proyecto",
      fecha: fmt(addDays(hoy, -3)),
      cantidad: 800,
      proyecto_id: proy.id,
      observaciones: `Cableado proyecto. ${DEMO_TAG}`,
      capturado_por: userId,
    });
  }
  const { error: errSal } = await supa
    .from("inventario_movimientos")
    .insert(salidas);
  if (errSal) {
    console.error("Error insertando salidas:", errSal);
  } else {
    console.log(
      `✓ ${salidas.length} salidas a proyecto ${proy.codigo} creadas`,
    );
  }
}

console.log("\n→ http://localhost:3000/inventario");
