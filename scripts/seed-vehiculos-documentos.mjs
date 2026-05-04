// Seed de metadatos de documentos vehiculares (sin archivos reales en storage).
// Marker: descripcion "[DEMO_SEED]"
// Run: node scripts/seed-vehiculos-documentos.mjs
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

// Limpiar previos
{
  const { data: prev } = await supa
    .from("vehiculos_documentos")
    .select("id")
    .like("descripcion", `%${DEMO_TAG}%`);
  const ids = (prev ?? []).map((p) => p.id);
  if (ids.length > 0) {
    await supa.from("vehiculos_documentos").delete().in("id", ids);
    console.log(`Limpiados ${ids.length} docs vehiculares demo previos.`);
  }
}

const { data: vehiculos } = await supa
  .from("vehiculos")
  .select("id, placa, marca, modelo, fecha_vencimiento_seguro, poliza_seguro")
  .like("observaciones", `%${DEMO_TAG}%`)
  .limit(8);

if (!vehiculos || vehiculos.length === 0) {
  console.log("Sin vehículos demo. Corre seed-vehiculos.mjs primero.");
  process.exit(0);
}

const fmt = (d) => d.toISOString().slice(0, 10);
const addDays = (d, n) => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};
const hoy = new Date();

const docs = [];
for (const v of vehiculos) {
  // Factura (sin vencimiento)
  docs.push({
    vehiculo_id: v.id,
    categoria: "factura",
    nombre: `Factura ${v.marca} ${v.modelo} ${v.placa}`,
    descripcion: `Factura original de adquisición. ${DEMO_TAG}`,
    numero_documento: `A-${Math.floor(Math.random() * 90000) + 10000}`,
    emisor: ["Nissan Hermosillo", "Toyota Sonora", "Ford Bulevar", "VW Centro"][Math.floor(Math.random() * 4)],
    fecha_emision: fmt(addDays(hoy, -Math.floor(Math.random() * 1500) - 200)),
    monto: 380000 + Math.random() * 200000,
    storage_path: `${v.id}/factura/demo_${Date.now()}_factura.pdf`,
    mime_type: "application/pdf",
    tamano_bytes: 250000 + Math.floor(Math.random() * 800000),
    subido_por_nombre: "Joaquín Corella (demo)",
  });

  // Tarjeta de circulación (vence típicamente cada 4-5 años)
  docs.push({
    vehiculo_id: v.id,
    categoria: "tarjeta_circulacion",
    nombre: `Tarjeta circulación ${v.placa}`,
    descripcion: `Tarjeta vigente del Estado de Sonora. ${DEMO_TAG}`,
    numero_documento: `TC-${Math.floor(Math.random() * 900000) + 100000}`,
    emisor: "Gobierno del Estado de Sonora",
    fecha_emision: fmt(addDays(hoy, -800 + Math.floor(Math.random() * 400))),
    fecha_vencimiento: fmt(addDays(hoy, 600 + Math.floor(Math.random() * 800))),
    storage_path: `${v.id}/tarjeta_circulacion/demo_${Date.now()}_tarjeta.pdf`,
    mime_type: "application/pdf",
    tamano_bytes: 180000 + Math.floor(Math.random() * 200000),
    subido_por_nombre: "Joaquín Corella (demo)",
  });

  // Verificación (semestral o anual)
  const diasVerif = -100 + Math.floor(Math.random() * 250); // mezcla: algunos vencidos, otros vigentes
  docs.push({
    vehiculo_id: v.id,
    categoria: "verificacion",
    nombre: `Verificación ${v.placa}`,
    descripcion: `Centro de verificación oficial. ${DEMO_TAG}`,
    numero_documento: `VER-${Math.floor(Math.random() * 90000) + 10000}`,
    emisor: "Centro de Verificación 12 Hermosillo",
    fecha_emision: fmt(addDays(hoy, diasVerif - 180)),
    fecha_vencimiento: fmt(addDays(hoy, diasVerif)),
    monto: 540,
    storage_path: `${v.id}/verificacion/demo_${Date.now()}_ver.pdf`,
    mime_type: "application/pdf",
    tamano_bytes: 90000 + Math.floor(Math.random() * 150000),
    subido_por_nombre: "Joaquín Corella (demo)",
  });

  // Seguro (si tiene fecha_vencimiento_seguro en el vehículo, usarla)
  if (v.fecha_vencimiento_seguro) {
    docs.push({
      vehiculo_id: v.id,
      categoria: "seguro",
      nombre: `Póliza ${v.poliza_seguro ?? "N/A"} - ${v.placa}`,
      descripcion: `Póliza vigente. Cobertura amplia. ${DEMO_TAG}`,
      numero_documento: v.poliza_seguro ?? "N/A",
      emisor: ["GNP Seguros", "Qualitas", "AXA", "Mapfre"][Math.floor(Math.random() * 4)],
      fecha_emision: fmt(addDays(new Date(v.fecha_vencimiento_seguro), -365)),
      fecha_vencimiento: v.fecha_vencimiento_seguro,
      monto: 12000 + Math.random() * 18000,
      storage_path: `${v.id}/seguro/demo_${Date.now()}_seguro.pdf`,
      mime_type: "application/pdf",
      tamano_bytes: 380000 + Math.floor(Math.random() * 600000),
      subido_por_nombre: "Joaquín Corella (demo)",
    });
  }

  // Tenencia (anual)
  docs.push({
    vehiculo_id: v.id,
    categoria: "tenencia",
    nombre: `Tenencia ${new Date().getFullYear()} - ${v.placa}`,
    descripcion: `Pago de refrendo y tenencia anual. ${DEMO_TAG}`,
    numero_documento: `TEN-${new Date().getFullYear()}-${Math.floor(Math.random() * 90000) + 10000}`,
    emisor: "Gobierno del Estado de Sonora",
    fecha_emision: fmt(addDays(hoy, -100 + Math.floor(Math.random() * 100))),
    fecha_vencimiento: fmt(new Date(new Date().getFullYear() + 1, 2, 31)), // 31 marzo siguiente
    monto: 1500 + Math.random() * 4000,
    storage_path: `${v.id}/tenencia/demo_${Date.now()}_tenencia.pdf`,
    mime_type: "application/pdf",
    tamano_bytes: 70000 + Math.floor(Math.random() * 80000),
    subido_por_nombre: "Joaquín Corella (demo)",
  });
}

const { data, error } = await supa
  .from("vehiculos_documentos")
  .insert(docs)
  .select("id");

if (error) {
  console.error("Error:", error);
  process.exit(1);
}
console.log(
  `✓ ${data.length} documentos vehiculares demo creados (sin archivos en storage)`,
);
console.log(`→ http://localhost:3000/activos/vehiculos`);
