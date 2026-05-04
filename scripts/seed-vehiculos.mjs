// Seed sample vehículos + bitácora para demo de UI.
// Marker: observaciones = "[DEMO_SEED]" en cada vehículo y cada evento de bitácora.
// Run: node scripts/seed-vehiculos.mjs
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

// Mapeo de empresas
const { data: empresas } = await supa
  .from("empresas")
  .select("id, codigo")
  .eq("activa", true);

const empresaPorCodigo = Object.fromEntries(
  (empresas ?? []).map((e) => [e.codigo, e.id]),
);
console.log("Empresas:", Object.keys(empresaPorCodigo));

// Limpiar demos anteriores (vehículos cuyas observaciones contengan el tag)
{
  const { data: prev } = await supa
    .from("vehiculos")
    .select("id")
    .like("observaciones", `%${DEMO_TAG}%`);
  const ids = (prev ?? []).map((p) => p.id);
  if (ids.length > 0) {
    await supa.from("vehiculos_bitacora").delete().in("vehiculo_id", ids);
    await supa.from("vehiculos").delete().in("id", ids);
    console.log(`Limpiados ${ids.length} vehículos demo previos.`);
  }
}

const fmt = (d) => d.toISOString().slice(0, 10);
const addDays = (d, n) => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};
const hoy = new Date();

// 8 vehículos con perfiles variados
const VEHICULOS = [
  {
    empresa: "CIAE",
    placa: "SON-A12-345",
    numero_economico: "C-01",
    serie: "1N4AL3AP4DC301234",
    marca: "Nissan",
    modelo: "NP300 Frontier",
    anio: 2022,
    color: "Blanco",
    tipo: "pickup",
    uso: "Operativo - Cuadrillas instalación solar",
    combustible: "diesel",
    tipo_propiedad: "propio",
    fecha_adquisicion: "2022-03-15",
    costo_adquisicion: 485000,
    estatus: "activo",
    km_actual: 78400,
    poliza_seguro: "GNP-2024-78912",
    fecha_vencimiento_seguro: fmt(addDays(hoy, 45)),
    asignado_a: "Cuadrilla A — Lic. Rodríguez",
  },
  {
    empresa: "CIAE",
    placa: "SON-B45-678",
    numero_economico: "C-02",
    serie: "1N4AL3AP4DC987654",
    marca: "Nissan",
    modelo: "NP300 Frontier",
    anio: 2023,
    color: "Plata",
    tipo: "pickup",
    uso: "Operativo - Mantenimientos",
    combustible: "diesel",
    tipo_propiedad: "arrendamiento_financiero",
    fecha_adquisicion: "2023-06-01",
    costo_adquisicion: 545000,
    fecha_termino_contrato: "2027-06-01",
    estatus: "activo",
    km_actual: 42100,
    poliza_seguro: "QUALITAS-2024-32145",
    fecha_vencimiento_seguro: fmt(addDays(hoy, 12)), // próxima a vencer
    asignado_a: "Cuadrilla B",
  },
  {
    empresa: "PSE",
    placa: "SON-C78-901",
    numero_economico: "P-01",
    marca: "Toyota",
    modelo: "Hilux",
    anio: 2021,
    color: "Gris",
    tipo: "pickup",
    uso: "Operativo - Supervisión obra",
    combustible: "diesel",
    tipo_propiedad: "propio",
    fecha_adquisicion: "2021-09-20",
    costo_adquisicion: 520000,
    estatus: "mantenimiento",
    km_actual: 95300,
    poliza_seguro: "AXA-2024-99841",
    fecha_vencimiento_seguro: fmt(addDays(hoy, 180)),
    asignado_a: "Ing. Hernández",
  },
  {
    empresa: "PSE",
    placa: "SON-D02-345",
    numero_economico: "P-02",
    marca: "Volkswagen",
    modelo: "Jetta",
    anio: 2024,
    color: "Negro",
    tipo: "sedan",
    uso: "Ejecutivo",
    combustible: "gasolina",
    tipo_propiedad: "arrendamiento_puro",
    fecha_adquisicion: "2024-01-10",
    costo_adquisicion: 0,
    fecha_termino_contrato: "2027-01-10",
    estatus: "activo",
    km_actual: 18200,
    poliza_seguro: "QUALITAS-2024-44521",
    fecha_vencimiento_seguro: fmt(addDays(hoy, 240)),
    asignado_a: "Director general",
  },
  {
    empresa: "IED",
    placa: "SON-E36-678",
    numero_economico: "I-01",
    marca: "Ford",
    modelo: "Transit",
    anio: 2020,
    color: "Blanco",
    tipo: "van",
    uso: "Transporte personal a obras",
    combustible: "diesel",
    tipo_propiedad: "propio",
    fecha_adquisicion: "2020-04-05",
    costo_adquisicion: 620000,
    estatus: "activo",
    km_actual: 142000,
    poliza_seguro: "GNP-2024-12390",
    fecha_vencimiento_seguro: fmt(addDays(hoy, -15)), // VENCIDO
    asignado_a: "Logística IED",
  },
  {
    empresa: "IED",
    placa: "SON-F70-901",
    numero_economico: "I-02",
    marca: "Chevrolet",
    modelo: "Silverado 2500",
    anio: 2019,
    color: "Rojo",
    tipo: "camion",
    uso: "Carga de equipo solar",
    combustible: "diesel",
    tipo_propiedad: "propio",
    fecha_adquisicion: "2019-11-12",
    costo_adquisicion: 780000,
    estatus: "reparacion",
    km_actual: 187500,
    poliza_seguro: "GNP-2024-44120",
    fecha_vencimiento_seguro: fmt(addDays(hoy, 90)),
  },
  {
    empresa: "LIMSON",
    placa: "SON-G14-234",
    numero_economico: "L-01",
    marca: "Nissan",
    modelo: "Versa",
    anio: 2022,
    color: "Blanco",
    tipo: "sedan",
    uso: "Visitas a sucursales (limpieza solar)",
    combustible: "gasolina",
    tipo_propiedad: "rentado_corto_plazo",
    fecha_adquisicion: "2024-08-01",
    costo_adquisicion: 0,
    fecha_termino_contrato: fmt(addDays(hoy, 60)),
    estatus: "activo",
    km_actual: 8400,
  },
  {
    empresa: "LIMSON",
    placa: "SON-H47-567",
    numero_economico: "L-02",
    marca: "Honda",
    modelo: "CRF150",
    anio: 2023,
    color: "Rojo",
    tipo: "motocicleta",
    uso: "Inspecciones rápidas",
    combustible: "gasolina",
    tipo_propiedad: "propio",
    fecha_adquisicion: "2023-03-15",
    costo_adquisicion: 78000,
    estatus: "fuera_servicio",
    km_actual: 12500,
  },
];

const inserts = VEHICULOS.filter((v) => empresaPorCodigo[v.empresa]).map(
  (v) => ({
    empresa_id: empresaPorCodigo[v.empresa],
    placa: v.placa,
    numero_economico: v.numero_economico,
    serie: v.serie ?? null,
    marca: v.marca,
    modelo: v.modelo,
    anio: v.anio,
    color: v.color,
    tipo: v.tipo,
    uso: v.uso ?? null,
    combustible: v.combustible,
    tipo_propiedad: v.tipo_propiedad,
    fecha_adquisicion: v.fecha_adquisicion ?? null,
    costo_adquisicion: v.costo_adquisicion ?? null,
    fecha_termino_contrato: v.fecha_termino_contrato ?? null,
    estatus: v.estatus,
    km_actual: v.km_actual ?? 0,
    poliza_seguro: v.poliza_seguro ?? null,
    fecha_vencimiento_seguro: v.fecha_vencimiento_seguro ?? null,
    // asignado_a: requiere UUID de auth.users — se guarda en observaciones
    observaciones:
      DEMO_TAG + (v.asignado_a ? ` Asignado: ${v.asignado_a}` : ""),
  }),
);

const { data: creados, error: errV } = await supa
  .from("vehiculos")
  .insert(inserts)
  .select("id, placa, numero_economico, empresa_id, km_actual");

if (errV) {
  console.error("Error insertando vehículos:", errV);
  process.exit(1);
}
console.log(`\n✓ ${creados.length} vehículos creados`);

// Bitácora: 5-12 eventos por vehículo, mezcla de combustible + mantenimiento + lecturas
const TIPOS_NO_COMB = [
  "mantenimiento_preventivo",
  "mantenimiento_correctivo",
  "verificacion",
  "tenencia",
  "siniestro",
  "lectura_km",
];

const eventos = [];
for (const veh of creados) {
  const numEventos = 5 + Math.floor(Math.random() * 7); // 5 a 11
  let kmActual = Math.max(0, (veh.km_actual ?? 0) - 6000); // empezamos atrás

  for (let i = 0; i < numEventos; i++) {
    const diasAtras = 360 - Math.floor((360 / numEventos) * i);
    const fecha = fmt(addDays(hoy, -diasAtras));

    // 70% combustible, 30% otro
    const esComb = Math.random() < 0.7;

    if (esComb) {
      const litros = 30 + Math.random() * 40; // 30-70 L
      const ppl = 22 + Math.random() * 4; // 22-26 / L
      const monto = litros * ppl;
      const incrementoKm = 250 + Math.floor(Math.random() * 600);
      kmActual += incrementoKm;
      eventos.push({
        vehiculo_id: veh.id,
        fecha,
        tipo: "carga_combustible",
        descripcion: `Carga de combustible · ${litros.toFixed(1)} L`,
        litros: Number(litros.toFixed(2)),
        precio_por_litro: Number(ppl.toFixed(2)),
        monto: Number(monto.toFixed(2)),
        proveedor_nombre: ["Pemex Centro", "Shell Bulevar", "Mobil Norte", "BP Carretera"][Math.floor(Math.random() * 4)],
        km_lectura: kmActual,
        observaciones: DEMO_TAG,
      });
    } else {
      const tipo = TIPOS_NO_COMB[Math.floor(Math.random() * TIPOS_NO_COMB.length)];
      const desc = {
        mantenimiento_preventivo: "Servicio de 10,000 km — aceite, filtros",
        mantenimiento_correctivo: "Reparación de frenos delanteros",
        verificacion: "Verificación vehicular semestral",
        tenencia: "Pago de tenencia anual",
        siniestro: "Reparación por choque leve",
        lectura_km: "Toma de kilómetros mensual",
      }[tipo];
      const monto =
        tipo === "lectura_km"
          ? null
          : tipo === "mantenimiento_preventivo"
            ? 2500 + Math.random() * 2500
            : tipo === "mantenimiento_correctivo"
              ? 4000 + Math.random() * 8000
              : tipo === "verificacion"
                ? 540
                : tipo === "tenencia"
                  ? 1500 + Math.random() * 3000
                  : 8000 + Math.random() * 15000;

      kmActual += 200 + Math.floor(Math.random() * 400);
      eventos.push({
        vehiculo_id: veh.id,
        fecha,
        tipo,
        descripcion: desc,
        monto: monto != null ? Number(monto.toFixed(2)) : null,
        proveedor_nombre:
          tipo === "verificacion"
            ? "Centro de Verificación 12"
            : tipo === "tenencia"
              ? "Gobierno del Estado"
              : ["Taller Méndez", "Auto Service Plus", "Autosur"][Math.floor(Math.random() * 3)],
        km_lectura: kmActual,
        observaciones: DEMO_TAG,
      });
    }
  }
}

const { data: bitInserted, error: errB } = await supa
  .from("vehiculos_bitacora")
  .insert(eventos)
  .select("id");

if (errB) {
  console.error("Error insertando bitácora:", errB);
  process.exit(1);
}

console.log(`✓ ${bitInserted.length} eventos de bitácora creados`);
console.log(`\nTotal: ${creados.length} vehículos · ${bitInserted.length} eventos`);
console.log("→ http://localhost:3000/activos/vehiculos");
