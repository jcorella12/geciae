// Limpieza de TODOS los datos demo etiquetados con [DEMO_SEED] en `observaciones`.
// Run: node scripts/clean-demo-seeds.mjs
// Pasar --dry-run para solo listar lo que se eliminaría.
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
const DRY = process.argv.includes("--dry-run");

console.log(`==== Limpieza de datos demo (tag: "${DEMO_TAG}") ====`);
if (DRY) console.log("MODO DRY-RUN — no se eliminará nada\n");

let resumen = [];

// 1. Tareas de proyecto
{
  const { data, error } = await supa
    .from("proyecto_tareas")
    .select("id, titulo")
    .like("observaciones", `%${DEMO_TAG}%`);
  if (error) throw error;
  resumen.push({ tabla: "proyecto_tareas", n: data.length });
  if (!DRY && data.length > 0) {
    await supa
      .from("proyecto_tareas")
      .delete()
      .in("id", data.map((d) => d.id));
  }
}

// 1b. Bitácora de proyecto (marker en descripcion)
{
  const { data, error } = await supa
    .from("proyecto_bitacora")
    .select("id")
    .like("descripcion", `%${DEMO_TAG}%`);
  if (error) throw error;
  resumen.push({ tabla: "proyecto_bitacora", n: data.length });
  if (!DRY && data.length > 0) {
    await supa
      .from("proyecto_bitacora")
      .delete()
      .in("id", data.map((d) => d.id));
  }
}

// 1d. Inventario items demo + movimientos
{
  const { data: prev } = await supa
    .from("catalogo_productos")
    .select("id")
    .like("observaciones", `%${DEMO_TAG}%`);
  const ids = (prev ?? []).map((p) => p.id);
  let movN = 0;
  if (ids.length > 0) {
    const { count } = await supa
      .from("inventario_movimientos")
      .select("id", { count: "exact", head: true })
      .in("producto_id", ids);
    movN = count ?? 0;
    if (!DRY) {
      await supa.from("inventario_movimientos").delete().in("producto_id", ids);
      await supa.from("catalogo_productos").delete().in("id", ids);
    }
  }
  resumen.push({ tabla: "inventario_movimientos", n: movN });
  resumen.push({ tabla: "catalogo_productos (inventario)", n: ids.length });
}

// 1c. Reportes de proyecto (marker en contenido) + storage
{
  const { data, error } = await supa
    .from("proyecto_reportes")
    .select("id, adjuntos")
    .like("contenido", `%${DEMO_TAG}%`);
  if (error) throw error;
  resumen.push({ tabla: "proyecto_reportes", n: data.length });
  if (!DRY && data.length > 0) {
    // Limpiar adjuntos del storage
    const paths = data.flatMap(
      (r) =>
        (r.adjuntos ?? []).map((a) => a.path).filter(Boolean) ?? [],
    );
    if (paths.length > 0) {
      await supa.storage.from("proyecto-archivos").remove(paths);
    }
    await supa
      .from("proyecto_reportes")
      .delete()
      .in("id", data.map((d) => d.id));
  }
}

// 2. Vehículos (eliminar bitácora + documentos primero por FK)
{
  const { data: vh } = await supa
    .from("vehiculos")
    .select("id, placa")
    .like("observaciones", `%${DEMO_TAG}%`);
  const ids = (vh ?? []).map((v) => v.id);
  let bitN = 0;
  let docN = 0;
  if (ids.length > 0) {
    const { count: cBit } = await supa
      .from("vehiculos_bitacora")
      .select("id", { count: "exact", head: true })
      .in("vehiculo_id", ids);
    bitN = cBit ?? 0;
    const { count: cDoc } = await supa
      .from("vehiculos_documentos")
      .select("id", { count: "exact", head: true })
      .in("vehiculo_id", ids);
    docN = cDoc ?? 0;
    if (!DRY) {
      await supa.from("vehiculos_bitacora").delete().in("vehiculo_id", ids);
      await supa.from("vehiculos_documentos").delete().in("vehiculo_id", ids);
      await supa.from("vehiculos").delete().in("id", ids);
    }
  }
  resumen.push({ tabla: "vehiculos_bitacora", n: bitN });
  resumen.push({ tabla: "vehiculos_documentos", n: docN });
  resumen.push({ tabla: "vehiculos", n: ids.length });
}

// 3. Oportunidades (eliminar actividades primero)
{
  const { data: ops } = await supa
    .from("oportunidades")
    .select("id, nombre")
    .like("observaciones", `%${DEMO_TAG}%`);
  const ids = (ops ?? []).map((o) => o.id);
  let actN = 0;
  if (ids.length > 0) {
    const { count } = await supa
      .from("actividades_comerciales")
      .select("id", { count: "exact", head: true })
      .in("oportunidad_id", ids);
    actN = count ?? 0;
    if (!DRY) {
      await supa.from("actividades_comerciales").delete().in("oportunidad_id", ids);
      await supa.from("oportunidades").delete().in("id", ids);
    }
  }
  resumen.push({ tabla: "actividades_comerciales", n: actN });
  resumen.push({ tabla: "oportunidades", n: ids.length });
}

// 4. Clientes demo (si existen — su detección se basa en observaciones)
{
  const { data, error } = await supa
    .from("clientes")
    .select("id, razon_social")
    .like("observaciones", `%${DEMO_TAG}%`);
  if (error) throw error;
  if (data.length > 0 && !DRY) {
    // Importante: si el cliente tiene CFDI, OC, etc. no podemos borrarlo.
    // Intentamos borrar; los que fallen los reportamos.
    const ids = data.map((d) => d.id);
    await supa.from("clientes_empresas").delete().in("cliente_id", ids);
    const { error: errCl } = await supa
      .from("clientes")
      .delete()
      .in("id", ids);
    if (errCl) {
      console.log(
        `  ⚠ No se pudieron eliminar ${data.length} clientes (posible FK):`,
        errCl.message,
      );
    }
  }
  resumen.push({ tabla: "clientes (con marker)", n: data.length });
}

console.log("\nResumen:");
console.table(resumen);

if (DRY) {
  console.log("\n→ Re-ejecuta sin --dry-run para eliminar realmente.");
} else {
  console.log("\n✓ Limpieza completada.");
}
