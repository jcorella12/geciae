"use server";

import { revalidatePath } from "next/cache";

import {
  esCEO,
  esRolEn,
  obtenerVinculos,
  tieneAtributo,
} from "@/lib/auth/permisos";
import { extraerEdocuenta } from "@/lib/claude/extractors/edocta";
import { createClient } from "@/lib/supabase/server";

async function gateConciliacion(empresaId: string): Promise<boolean> {
  const v = await obtenerVinculos();
  return (
    esCEO(v) ||
    tieneAtributo(v, "tesorero_corporativo") ||
    esRolEn(v, empresaId, "director")
  );
}

export async function conciliarConCFDI(
  movimientoId: string,
  cfdiId: string,
): Promise<{ ok: boolean; error: string | null }> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sin sesión." };

  const { data: mov } = await supabase
    .from("bancos_movimientos")
    .select("id, cuenta_id, bancos_cuentas(empresa_id)")
    .eq("id", movimientoId)
    .maybeSingle();
  if (!mov) return { ok: false, error: "Movimiento no encontrado." };
  const empresaId = (mov.bancos_cuentas as { empresa_id: string } | null)
    ?.empresa_id;
  if (!empresaId || !(await gateConciliacion(empresaId))) {
    return { ok: false, error: "Sin permiso." };
  }

  const { error } = await supabase
    .from("bancos_movimientos")
    .update({
      cfdi_relacionado_id: cfdiId,
      conciliado: true,
      conciliado_por: user.id,
      fecha_conciliacion: new Date().toISOString(),
    })
    .eq("id", movimientoId);
  if (error) return { ok: false, error: error.message };

  revalidatePath(`/finanzas/tesoreria/cuentas/${mov.cuenta_id}`);
  return { ok: true, error: null };
}

export async function conciliarConOC(
  movimientoId: string,
  ocId: string,
): Promise<{ ok: boolean; error: string | null }> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sin sesión." };

  const { data: mov } = await supabase
    .from("bancos_movimientos")
    .select("id, cuenta_id, bancos_cuentas(empresa_id)")
    .eq("id", movimientoId)
    .maybeSingle();
  if (!mov) return { ok: false, error: "Movimiento no encontrado." };
  const empresaId = (mov.bancos_cuentas as { empresa_id: string } | null)
    ?.empresa_id;
  if (!empresaId || !(await gateConciliacion(empresaId))) {
    return { ok: false, error: "Sin permiso." };
  }

  const { error } = await supabase
    .from("bancos_movimientos")
    .update({
      oc_relacionada_id: ocId,
      conciliado: true,
      conciliado_por: user.id,
      fecha_conciliacion: new Date().toISOString(),
    })
    .eq("id", movimientoId);
  if (error) return { ok: false, error: error.message };

  // Marcar la OC como pagada si el monto coincide
  const { data: oc } = await supabase
    .from("ordenes_compra")
    .select("total")
    .eq("id", ocId)
    .maybeSingle();
  const { data: movFull } = await supabase
    .from("bancos_movimientos")
    .select("monto")
    .eq("id", movimientoId)
    .maybeSingle();
  if (oc && movFull && Math.abs(Math.abs(Number(movFull.monto)) - Number(oc.total)) < 1) {
    await supabase
      .from("ordenes_compra")
      .update({
        estado: "pagada",
        fecha_pago: new Date().toISOString().slice(0, 10),
      })
      .eq("id", ocId);
  }

  revalidatePath(`/finanzas/tesoreria/cuentas/${mov.cuenta_id}`);
  revalidatePath(`/finanzas/oc/${ocId}`);
  return { ok: true, error: null };
}

export async function desconciliar(
  movimientoId: string,
): Promise<{ ok: boolean; error: string | null }> {
  const supabase = createClient();
  const { data: mov } = await supabase
    .from("bancos_movimientos")
    .select("id, cuenta_id, bancos_cuentas(empresa_id)")
    .eq("id", movimientoId)
    .maybeSingle();
  if (!mov) return { ok: false, error: "Movimiento no encontrado." };
  const empresaId = (mov.bancos_cuentas as { empresa_id: string } | null)
    ?.empresa_id;
  if (!empresaId || !(await gateConciliacion(empresaId))) {
    return { ok: false, error: "Sin permiso." };
  }

  const { error } = await supabase
    .from("bancos_movimientos")
    .update({
      cfdi_relacionado_id: null,
      oc_relacionada_id: null,
      conciliado: false,
      conciliado_por: null,
      fecha_conciliacion: null,
      conciliacion_notas: null,
    })
    .eq("id", movimientoId);
  if (error) return { ok: false, error: error.message };

  revalidatePath(`/finanzas/tesoreria/cuentas/${mov.cuenta_id}`);
  return { ok: true, error: null };
}

/**
 * Lee un estado de cuenta PDF con Claude vision y llena los campos
 * saldo_inicial, saldo_final, total_abonos, total_cargos, num_abonos, num_cargos.
 * Si es el más reciente de la cuenta, también actualiza el saldo_actual.
 *
 * Costo: ~1 call a Claude haiku con caching → muy barato si se reprocesa.
 */
export async function extraerSaldoEdocuentaIA(
  estadoId: string,
): Promise<{
  ok: boolean;
  error: string | null;
  saldo_final?: number | null;
  num_movs?: number | null;
}> {
  const supabase = createClient();
  // estados_cuenta_bancarios no está en types regenerados — cast minimo
  const { data: edocta } = await supabase
    .from("estados_cuenta_bancarios")
    .select(
      "id, cuenta_id, empresa_id, url_archivo, periodo_fin, bancos_cuentas(banco, empresa_id)",
    )
    .eq("id", estadoId)
    .maybeSingle();
  if (!edocta) return { ok: false, error: "Estado de cuenta no encontrado." };

  const empresaId =
    (edocta.bancos_cuentas as { empresa_id: string } | null)?.empresa_id ??
    edocta.empresa_id;
  if (!empresaId || !(await gateConciliacion(empresaId))) {
    return { ok: false, error: "Sin permiso." };
  }

  if (!edocta.url_archivo) {
    return { ok: false, error: "No hay PDF asociado a este estado." };
  }

  // Descargar PDF del bucket
  const { data: pdfData, error: dlErr } = await supabase.storage
    .from("estados-cuenta")
    .download(edocta.url_archivo);
  if (dlErr || !pdfData) {
    return {
      ok: false,
      error: `No se pudo descargar el PDF: ${dlErr?.message ?? "desconocido"}`,
    };
  }

  // Convertir a base64
  const arrayBuffer = await pdfData.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const base64 = buffer.toString("base64");

  const banco =
    (edocta.bancos_cuentas as { banco: string } | null)?.banco ??
    "banco mexicano";

  const result = await extraerEdocuenta(base64, banco, empresaId);
  if (!result.ok) {
    return {
      ok: false,
      error: `Extracción IA falló: ${result.error}`,
    };
  }

  const d = result.data;
  if (d.saldo_final == null) {
    return {
      ok: false,
      error: "No se pudo extraer saldo final del PDF.",
    };
  }

  // Update edocta
  const updatePayload: Record<string, unknown> = {
    saldo_final: d.saldo_final,
    observaciones: `Extraído con IA · confidence ${(result.meta.confidence * 100).toFixed(0)}%${result.meta.cache_hit ? " · cache hit" : ""}`,
  };
  if (d.saldo_inicial != null) updatePayload.saldo_inicial = d.saldo_inicial;
  if (d.total_abonos != null) updatePayload.total_abonos = d.total_abonos;
  if (d.total_cargos != null) updatePayload.total_cargos = d.total_cargos;
  if (d.num_abonos != null) updatePayload.num_abonos = d.num_abonos;
  if (d.num_cargos != null) updatePayload.num_cargos = d.num_cargos;
  if (d.periodo_inicio) updatePayload.periodo_inicio = d.periodo_inicio;
  if (d.periodo_fin) updatePayload.periodo_fin = d.periodo_fin;

  const { error: upErr } = await supabase
    .from("estados_cuenta_bancarios")
    // Patch dinámico (Record<string,unknown>); cast localizado al tipo Update.
    .update(updatePayload as never)
    .eq("id", estadoId);
  if (upErr) return { ok: false, error: upErr.message };

  // Si es el último estado de la cuenta, actualizar saldo_actual
  const { data: ultimo } = await supabase
    .from("estados_cuenta_bancarios")
    .select("id, periodo_fin, saldo_final")
    .eq("cuenta_id", edocta.cuenta_id)
    .order("periodo_fin", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (ultimo && ultimo.id === estadoId) {
    await supabase
      .from("bancos_cuentas")
      .update({
        saldo_actual: d.saldo_final,
        fecha_actualizacion_saldo: new Date(
          (d.periodo_fin ?? edocta.periodo_fin) + "T23:59:59+00:00",
        ).toISOString(),
      })
      .eq("id", edocta.cuenta_id);
  }

  revalidatePath(`/finanzas/tesoreria/cuentas/${edocta.cuenta_id}`);
  return {
    ok: true,
    error: null,
    saldo_final: d.saldo_final,
    num_movs: (d.num_abonos ?? 0) + (d.num_cargos ?? 0),
  };
}

/**
 * Marca un estado de cuenta como "no leíble" (saldo manual = 0 indica que se
 * intentó pero no se pudo extraer datos). Útil para PDFs que no son edocuenta.
 */
export async function descartarEdocuenta(
  estadoId: string,
  motivo: string,
): Promise<{ ok: boolean; error: string | null }> {
  const supabase = createClient();
  const { data: edocta } = await supabase
    .from("estados_cuenta_bancarios")
    .select("cuenta_id, empresa_id, bancos_cuentas(empresa_id)")
    .eq("id", estadoId)
    .maybeSingle();
  if (!edocta) return { ok: false, error: "No encontrado." };
  const empresaId =
    (edocta.bancos_cuentas as { empresa_id: string } | null)?.empresa_id ??
    edocta.empresa_id;
  if (!empresaId || !(await gateConciliacion(empresaId))) {
    return { ok: false, error: "Sin permiso." };
  }

  const { error } = await supabase
    .from("estados_cuenta_bancarios")
    .update({
      observaciones: `Descartado: ${motivo.trim() || "no aplica"}`,
    })
    .eq("id", estadoId);
  if (error) return { ok: false, error: error.message };

  revalidatePath(`/finanzas/tesoreria/cuentas/${edocta.cuenta_id}`);
  return { ok: true, error: null };
}

export async function marcarConciliadoSinCFDI(
  movimientoId: string,
  notas: string,
): Promise<{ ok: boolean; error: string | null }> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sin sesión." };

  const { data: mov } = await supabase
    .from("bancos_movimientos")
    .select("id, cuenta_id, bancos_cuentas(empresa_id)")
    .eq("id", movimientoId)
    .maybeSingle();
  if (!mov) return { ok: false, error: "Movimiento no encontrado." };
  const empresaId = (mov.bancos_cuentas as { empresa_id: string } | null)
    ?.empresa_id;
  if (!empresaId || !(await gateConciliacion(empresaId))) {
    return { ok: false, error: "Sin permiso." };
  }

  const { error } = await supabase
    .from("bancos_movimientos")
    .update({
      conciliado: true,
      conciliado_por: user.id,
      fecha_conciliacion: new Date().toISOString(),
      conciliacion_notas: notas.trim() || null,
    })
    .eq("id", movimientoId);
  if (error) return { ok: false, error: error.message };

  revalidatePath(`/finanzas/tesoreria/cuentas/${mov.cuenta_id}`);
  return { ok: true, error: null };
}

// ============================================================================
// Auto-conciliación masiva de movimientos
// ============================================================================

/**
 * Recorre todos los movimientos NO conciliados de la cuenta en el mes especificado
 * y los concilia automáticamente con la mejor sugerencia de CFDI/OC si la similitud
 * supera el umbral.
 *
 * Usa la RPC `sugerir_match_movimiento` que ya está en BD (basada en monto+fecha+rfc).
 *
 * Idempotente: solo procesa los que aún están sin conciliar.
 */
export async function autoConciliarMes(
  cuentaId: string,
  mesYYYYMM: string,
  umbralSimilitud: number = 0.85,
): Promise<{
  ok: boolean;
  error: string | null;
  procesados: number;
  conciliados: number;
  sin_match: number;
}> {
  const supabase = createClient();
  // Permiso
  const { data: cuenta } = await supabase
    .from("bancos_cuentas")
    .select("id, empresa_id")
    .eq("id", cuentaId)
    .maybeSingle();
  if (!cuenta) {
    return {
      ok: false,
      error: "Cuenta no encontrada.",
      procesados: 0,
      conciliados: 0,
      sin_match: 0,
    };
  }
  if (!(await gateConciliacion(cuenta.empresa_id))) {
    return {
      ok: false,
      error: "Sin permiso.",
      procesados: 0,
      conciliados: 0,
      sin_match: 0,
    };
  }

  // Sesión
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return {
      ok: false,
      error: "Sin sesión.",
      procesados: 0,
      conciliados: 0,
      sin_match: 0,
    };
  }

  // Rango del mes
  const [year, month] = mesYYYYMM.split("-").map(Number);
  if (!year || !month) {
    return {
      ok: false,
      error: "Mes inválido (formato YYYY-MM).",
      procesados: 0,
      conciliados: 0,
      sin_match: 0,
    };
  }
  const desde = `${year}-${String(month).padStart(2, "0")}-01`;
  const hastaDate = new Date(year, month, 1);
  const hasta = hastaDate.toISOString().slice(0, 10);

  // Cargar movs no conciliados del mes
  const { data: movs } = await supabase
    .from("bancos_movimientos")
    .select("id, fecha, monto, tipo, conciliado")
    .eq("cuenta_id", cuentaId)
    .eq("conciliado", false)
    .gte("fecha", desde)
    .lt("fecha", hasta)
    .order("fecha");

  if (!Array.isArray(movs) || movs.length === 0) {
    return {
      ok: true,
      error: null,
      procesados: 0,
      conciliados: 0,
      sin_match: 0,
    };
  }

  let conciliados = 0;
  let sinMatch = 0;
  const ahora = new Date().toISOString();

  for (const m of movs) {
    // Pedir sugerencias
    const { data: sugerencias } = await supabase.rpc(
      "sugerir_match_movimiento",
      { p_movimiento_id: m.id },
    );
    const lista =
      (sugerencias as Array<{
        tipo: string;
        match_id: string;
        similitud: number;
      }> | null) ?? [];
    if (lista.length === 0) {
      sinMatch++;
      continue;
    }
    // Mejor sugerencia
    const top = lista.reduce((a, b) =>
      a.similitud > b.similitud ? a : b,
    );
    if ((top.similitud ?? 0) < umbralSimilitud) {
      sinMatch++;
      continue;
    }

    // Conciliar
    const updatePayload: Record<string, unknown> = {
      conciliado: true,
      conciliado_por: user.id,
      fecha_conciliacion: ahora,
      conciliacion_notas: `Auto-conciliado · similitud ${(top.similitud * 100).toFixed(1)}%`,
    };
    if (top.tipo === "cfdi") {
      updatePayload.cfdi_relacionado_id = top.match_id;
    } else if (top.tipo === "oc") {
      updatePayload.oc_relacionada_id = top.match_id;
    }

    const { error: upErr } = await supabase
      .from("bancos_movimientos")
      // Patch dinámico; cast localizado al tipo Update.
      .update(updatePayload as never)
      .eq("id", m.id);

    if (!upErr) {
      conciliados++;
    } else {
      sinMatch++;
    }
  }

  revalidatePath(`/finanzas/tesoreria/cuentas/${cuentaId}`);
  return {
    ok: true,
    error: null,
    procesados: movs.length,
    conciliados,
    sin_match: sinMatch,
  };
}

// ============================================================================
// Subida de archivos (PDF estados de cuenta + .exp movimientos diarios)
// ============================================================================

/**
 * Sube un archivo de estado de cuenta (PDF mensual o .exp diario BBVA) al bucket
 * y crea una fila en estados_cuenta_bancarios.
 *
 * Para PDF: usa "Leer con IA" después para extraer saldos y conteos.
 * Para .exp: usa "Procesar .exp" para parsear TSV e insertar movimientos.
 */
export async function subirArchivoEdocta(
  cuentaId: string,
  formData: FormData,
): Promise<{
  ok: boolean;
  error: string | null;
  estadoId?: string | null;
  formato?: "pdf" | "exp" | null;
  filename?: string;
}> {
  const supabase = createClient();
  const file = formData.get("file") as File | null;
  if (!file || !file.name) return { ok: false, error: "Sin archivo." };

  const lower = file.name.toLowerCase();
  let formato: "pdf" | "exp";
  if (lower.endsWith(".pdf")) formato = "pdf";
  else if (
    lower.endsWith(".exp") ||
    lower.endsWith(".tsv") ||
    lower.endsWith(".txt")
  )
    formato = "exp";
  else
    return {
      ok: false,
      error: "Formato no soportado. Solo se aceptan .pdf o .exp.",
    };

  const { data: cuenta } = await supabase
    .from("bancos_cuentas")
    .select("id, empresa_id, banco, numero_cuenta")
    .eq("id", cuentaId)
    .maybeSingle();
  if (!cuenta) return { ok: false, error: "Cuenta no encontrada." };
  if (!(await gateConciliacion(cuenta.empresa_id))) {
    return { ok: false, error: "Sin permiso." };
  }

  const ahora = new Date();
  const periodoInicio = `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, "0")}-01`;
  const ultimoDia = new Date(ahora.getFullYear(), ahora.getMonth() + 1, 0);
  const periodoFin = ultimoDia.toISOString().slice(0, 10);

  const ts = Date.now();
  const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_");
  const bucketPath = `${cuenta.empresa_id}/uploads/${ts}-${safeName}`;

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const { error: upErr } = await supabase.storage
    .from("estados-cuenta")
    .upload(bucketPath, buffer, {
      contentType: formato === "pdf" ? "application/pdf" : "text/plain",
      upsert: true,
    });
  if (upErr) {
    return { ok: false, error: `Error al subir al bucket: ${upErr.message}` };
  }

  const observaciones =
    formato === "pdf"
      ? "Subido manualmente · pendiente extracción IA"
      : "Subido manualmente · pendiente procesar movimientos";

  // Idempotencia: si ya existe un estado para (cuenta, periodo), reemplazamos
  // url_archivo y reset de extracción para que el usuario pueda re-leer.
  const { data: existente } = await supabase
    .from("estados_cuenta_bancarios")
    .select("id")
    .eq("cuenta_id", cuentaId)
    .eq("periodo_inicio", periodoInicio)
    .eq("periodo_fin", periodoFin)
    .maybeSingle();

  if (existente?.id) {
    const { error: updErr } = await supabase
      .from("estados_cuenta_bancarios")
      .update({
        formato,
        url_archivo: bucketPath,
        saldo_final: 0,
        observaciones: `${observaciones} · re-subido ${ahora.toISOString()}`,
      })
      .eq("id", existente.id);
    if (updErr) {
      return {
        ok: false,
        error: `Error al reemplazar archivo del periodo: ${updErr.message}`,
      };
    }
    revalidatePath(`/finanzas/tesoreria/cuentas/${cuentaId}`);
    return {
      ok: true,
      error: null,
      estadoId: existente.id,
      formato,
      filename: file.name,
    };
  }

  const { data: nuevo, error: insErr } = await supabase
    .from("estados_cuenta_bancarios")
    .insert({
      cuenta_id: cuentaId,
      empresa_id: cuenta.empresa_id,
      periodo_inicio: periodoInicio,
      periodo_fin: periodoFin,
      saldo_final: 0,
      formato,
      url_archivo: bucketPath,
      observaciones,
    })
    .select("id")
    .single();
  if (insErr || !nuevo) {
    return {
      ok: false,
      error: `Error al registrar archivo: ${insErr?.message ?? "desconocido"}`,
    };
  }

  revalidatePath(`/finanzas/tesoreria/cuentas/${cuentaId}`);
  return {
    ok: true,
    error: null,
    estadoId: nuevo.id,
    formato,
    filename: file.name,
  };
}

/**
 * Procesa un archivo .exp BBVA (TSV latin-1) — parsea movimientos y los inserta
 * en bancos_movimientos. Idempotente por rango de fechas.
 */
export async function procesarExpFile(estadoId: string): Promise<{
  ok: boolean;
  error: string | null;
  movs_insertados?: number;
  saldo_final?: number | null;
}> {
  const supabase = createClient();
  const { data: edocta } = await supabase
    .from("estados_cuenta_bancarios")
    .select(
      "id, cuenta_id, empresa_id, url_archivo, formato, bancos_cuentas(empresa_id)",
    )
    .eq("id", estadoId)
    .maybeSingle();
  if (!edocta) return { ok: false, error: "Estado no encontrado." };
  if (edocta.formato !== "exp") {
    return { ok: false, error: "Este archivo no es .exp." };
  }
  const empresaId =
    (edocta.bancos_cuentas as { empresa_id: string } | null)?.empresa_id ??
    edocta.empresa_id;
  if (!empresaId || !(await gateConciliacion(empresaId))) {
    return { ok: false, error: "Sin permiso." };
  }
  if (!edocta.url_archivo) {
    return { ok: false, error: "Sin archivo asociado." };
  }

  const { data: blob, error: dlErr } = await supabase.storage
    .from("estados-cuenta")
    .download(edocta.url_archivo);
  if (dlErr || !blob) {
    return {
      ok: false,
      error: `Error al descargar: ${dlErr?.message ?? "desconocido"}`,
    };
  }

  const arrayBuffer = await blob.arrayBuffer();
  const buf = new Uint8Array(arrayBuffer);
  const text = new TextDecoder("latin1").decode(buf);

  const lineas = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lineas.length < 2) {
    return { ok: false, error: "Archivo .exp vacío o malformado." };
  }
  const dataLines = lineas.slice(1);

  type Mov = {
    fecha: string;
    concepto: string;
    cargo: number | null;
    abono: number | null;
    saldo: number | null;
  };
  const parseMonto = (s: string): number | null => {
    if (!s) return null;
    const n = parseFloat(s.replace(/,/g, ""));
    return isNaN(n) ? null : n;
  };

  const movs: Mov[] = [];
  for (const linea of dataLines) {
    const cols = linea.split("\t");
    if (cols.length < 4) continue;
    const fechaRaw = cols[0]?.trim() ?? "";
    const concepto = cols[1]?.trim() ?? "";
    const cargoRaw = cols[2]?.trim() ?? "";
    const abonoRaw = cols[3]?.trim() ?? "";
    const saldoRaw = cols[4]?.trim() ?? "";
    const m = fechaRaw.match(/^(\d{2})-(\d{2})-(\d{4})$/);
    if (!m) continue;
    const fecha = `${m[3]}-${m[2]}-${m[1]}`;
    movs.push({
      fecha,
      concepto,
      cargo: parseMonto(cargoRaw),
      abono: parseMonto(abonoRaw),
      saldo: parseMonto(saldoRaw),
    });
  }
  if (movs.length === 0) {
    return { ok: false, error: "No se encontraron movimientos." };
  }

  const fechasOrdenadas = movs.map((m) => m.fecha).sort();
  const fechaMin = fechasOrdenadas[0];
  const fechaMax = fechasOrdenadas[fechasOrdenadas.length - 1];
  const saldoFinal = movs[0]?.saldo ?? null;
  const fechaFinal = movs[0]?.fecha ?? fechaMax;

  // Borrar movs previos en el rango (idempotencia por origen=exp)
  await supabase
    .from("bancos_movimientos")
    .delete()
    .eq("cuenta_id", edocta.cuenta_id)
    .eq("origen", "exp")
    .gte("fecha", fechaMin)
    .lte("fecha", fechaMax);

  const payload = movs
    .filter((m) => m.cargo || m.abono)
    .map((m) => ({
      cuenta_id: edocta.cuenta_id,
      fecha: m.fecha,
      concepto: m.concepto.split("/")[0]?.trim() ?? m.concepto,
      referencia: m.concepto.includes("/")
        ? m.concepto.split("/").slice(1).join("/").trim().slice(0, 50)
        : null,
      monto: m.cargo ? -Math.abs(m.cargo) : Math.abs(m.abono ?? 0),
      tipo: m.cargo ? "cargo" : "abono",
      saldo_resultante: m.saldo,
      origen: "exp",
      conciliado: false,
    }));

  if (payload.length > 0) {
    const { error: insErr } = await supabase
      .from("bancos_movimientos")
      .insert(payload);
    if (insErr) {
      return {
        ok: false,
        error: `Error insertando movs: ${insErr.message}`,
      };
    }
  }

  const totalAbonos = movs
    .filter((m) => m.abono)
    .reduce((a, m) => a + (m.abono ?? 0), 0);
  const totalCargos = movs
    .filter((m) => m.cargo)
    .reduce((a, m) => a + (m.cargo ?? 0), 0);

  await supabase
    .from("estados_cuenta_bancarios")
    .update({
      saldo_final: saldoFinal ?? 0,
      total_abonos: totalAbonos,
      total_cargos: totalCargos,
      num_abonos: movs.filter((m) => m.abono).length,
      num_cargos: movs.filter((m) => m.cargo).length,
      movimientos_cargados: payload.length,
      periodo_inicio: fechaMin,
      periodo_fin: fechaMax,
      observaciones: `Procesado .exp · ${payload.length} movs ${fechaMin} → ${fechaMax}`,
    })
    .eq("id", estadoId);

  if (saldoFinal != null) {
    await supabase
      .from("bancos_cuentas")
      .update({
        saldo_actual: saldoFinal,
        fecha_actualizacion_saldo: new Date(
          fechaFinal + "T23:59:59+00:00",
        ).toISOString(),
      })
      .eq("id", edocta.cuenta_id);
  }

  revalidatePath(`/finanzas/tesoreria/cuentas/${edocta.cuenta_id}`);
  return {
    ok: true,
    error: null,
    movs_insertados: payload.length,
    saldo_final: saldoFinal,
  };
}
