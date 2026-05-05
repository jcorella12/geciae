"use server";

import { revalidatePath } from "next/cache";

import {
  esCEO,
  esRolEn,
  obtenerVinculos,
  tieneAtributo,
} from "@/lib/auth/permisos";
import {
  initialImportCSVState,
  initialMovimientoManualState,
  type ImportCSVState,
  type MovimientoManualState,
} from "@/lib/bancos-movimientos/state";
import { createClient } from "@/lib/supabase/server";

/**
 * Server actions sprint 2.3 — captura manual e import CSV de movimientos
 * bancarios. Convive con el flujo Edocta (extracción IA del PDF/XLS), que
 * sigue siendo la fuente principal. Estos manuales/csv son "huecos":
 * depósito en efectivo, transferencias que no salieron en el estado, etc.
 */

async function gateMovimientos(
  empresaId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const v = await obtenerVinculos();
  const puede =
    esCEO(v) ||
    tieneAtributo(v, "tesorero_corporativo") ||
    esRolEn(v, empresaId, "director");
  if (!puede) return { ok: false, error: "Sin permiso." };
  return { ok: true };
}

async function obtenerEmpresaId(
  cuentaId: string,
): Promise<{ ok: true; empresaId: string } | { ok: false; error: string }> {
  const supabase = createClient();
  const { data } = await supabase
    .from("bancos_cuentas")
    .select("empresa_id")
    .eq("id", cuentaId)
    .maybeSingle();
  if (!data) return { ok: false, error: "Cuenta no encontrada." };
  return { ok: true, empresaId: data.empresa_id };
}

/**
 * Recalcula `saldo_resultante` de todos los movimientos de una cuenta a partir
 * de un saldo inicial conocido (por ejemplo el del último estado de cuenta).
 * Útil después de insertar un movimiento en fecha pasada.
 *
 * Implementación O(n): trae todos los movimientos ordenados, recorre
 * acumulando, y bulk-updatea con upserts individuales (Supabase client
 * no permite WHERE+UPDATE batch sobre arrays con el SDK).
 */
async function recalcularSaldosDesde(
  cuentaId: string,
  desdeFecha: string,
): Promise<{ ok: boolean; error: string | null }> {
  const supabase = createClient();
  // Obtener saldo inicial: último movimiento ANTES de `desdeFecha`.
  const { data: anterior } = await supabase
    .from("bancos_movimientos")
    .select("saldo_resultante")
    .eq("cuenta_id", cuentaId)
    .lt("fecha", desdeFecha)
    .order("fecha", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  let saldo = Number(anterior?.saldo_resultante ?? 0);

  // Movimientos a recalcular: los de fecha >= desdeFecha en orden cronológico
  const { data: movs } = await supabase
    .from("bancos_movimientos")
    .select("id, monto, tipo")
    .eq("cuenta_id", cuentaId)
    .gte("fecha", desdeFecha)
    .order("fecha", { ascending: true })
    .order("created_at", { ascending: true });

  for (const m of movs ?? []) {
    const monto = Number(m.monto ?? 0);
    saldo += m.tipo === "abono" ? monto : -monto;
    const { error } = await supabase
      .from("bancos_movimientos")
      .update({ saldo_resultante: saldo })
      .eq("id", m.id);
    if (error) return { ok: false, error: error.message };
  }
  return { ok: true, error: null };
}

/**
 * Captura un movimiento manual (depósito efectivo, transferencia, comisión, etc).
 * Inserta con origen='manual'; recalcula saldos posteriores si la fecha es
 * retroactiva.
 */
export async function crearMovimientoManual(
  _prev: MovimientoManualState,
  formData: FormData,
): Promise<MovimientoManualState> {
  const cuentaId = formData.get("cuenta_id") as string;
  const fecha = (formData.get("fecha") as string) || "";
  const fechaAplicacion =
    (formData.get("fecha_aplicacion") as string) || null;
  const concepto = ((formData.get("concepto") as string) ?? "").trim();
  const referencia =
    ((formData.get("referencia") as string) ?? "").trim() || null;
  const tipo = formData.get("tipo") as "abono" | "cargo";
  const montoStr = (formData.get("monto") as string) ?? "";
  const observaciones =
    ((formData.get("observaciones") as string) ?? "").trim() || null;

  if (!cuentaId || !fecha || !concepto || !tipo)
    return { ...initialMovimientoManualState, error: "Faltan campos requeridos." };
  const monto = Number(montoStr);
  if (!Number.isFinite(monto) || monto <= 0)
    return { ...initialMovimientoManualState, error: "Monto inválido." };
  if (tipo !== "abono" && tipo !== "cargo")
    return { ...initialMovimientoManualState, error: "Tipo inválido." };

  const ge = await obtenerEmpresaId(cuentaId);
  if (!ge.ok) return { ...initialMovimientoManualState, error: ge.error };
  const g = await gateMovimientos(ge.empresaId);
  if (!g.ok) return { ...initialMovimientoManualState, error: g.error };

  const supabase = createClient();
  const { data: nuevo, error } = await supabase
    .from("bancos_movimientos")
    .insert({
      cuenta_id: cuentaId,
      fecha,
      fecha_aplicacion: fechaAplicacion,
      concepto,
      referencia,
      monto,
      tipo,
      origen: "manual",
      observaciones,
    })
    .select("id")
    .single();
  if (error || !nuevo)
    return {
      ...initialMovimientoManualState,
      error: error?.message ?? "Error al crear",
    };

  // Recalcular saldos desde la fecha del movimiento
  await recalcularSaldosDesde(cuentaId, fecha);

  revalidatePath(`/finanzas/tesoreria/cuentas/${cuentaId}`);
  return { ok: true, error: null, movimientoId: nuevo.id };
}

/**
 * Edita un movimiento manual o de import CSV. NO permite editar de Edocta
 * (origen != 'manual' y != 'csv_manual').
 */
export async function editarMovimientoManual(
  movId: string,
  patch: {
    fecha?: string;
    concepto?: string;
    referencia?: string | null;
    monto?: number;
    tipo?: "abono" | "cargo";
    observaciones?: string | null;
  },
): Promise<{ ok: boolean; error: string | null }> {
  const supabase = createClient();
  const { data: mov } = await supabase
    .from("bancos_movimientos")
    .select("cuenta_id, fecha, origen, bancos_cuentas(empresa_id)")
    .eq("id", movId)
    .maybeSingle();
  if (!mov) return { ok: false, error: "Movimiento no encontrado." };
  if (mov.origen !== "manual" && mov.origen !== "csv_manual")
    return {
      ok: false,
      error:
        "Solo movimientos manuales o de import CSV son editables. Los de estado de cuenta IA son inmutables.",
    };
  const empresaId = (mov.bancos_cuentas as { empresa_id: string } | null)
    ?.empresa_id;
  if (!empresaId) return { ok: false, error: "Empresa no resuelta." };
  const g = await gateMovimientos(empresaId);
  if (!g.ok) return { ok: false, error: g.error };

  const update: Record<string, unknown> = {};
  if (patch.fecha) update.fecha = patch.fecha;
  if (patch.concepto !== undefined) update.concepto = patch.concepto;
  if (patch.referencia !== undefined) update.referencia = patch.referencia;
  if (patch.monto !== undefined) update.monto = patch.monto;
  if (patch.tipo) update.tipo = patch.tipo;
  if (patch.observaciones !== undefined)
    update.observaciones = patch.observaciones;

  const { error } = await supabase
    .from("bancos_movimientos")
    // Patch dinámico; cast localizado al tipo Update.
    .update(update as never)
    .eq("id", movId);
  if (error) return { ok: false, error: error.message };

  // Recalcular saldos desde la fecha más temprana afectada
  const desde = patch.fecha ?? (mov.fecha as string);
  await recalcularSaldosDesde(mov.cuenta_id, desde);

  revalidatePath(`/finanzas/tesoreria/cuentas/${mov.cuenta_id}`);
  return { ok: true, error: null };
}

/** Elimina un movimiento manual. NO permite eliminar de Edocta. */
export async function eliminarMovimientoManual(
  movId: string,
): Promise<{ ok: boolean; error: string | null }> {
  const supabase = createClient();
  const { data: mov } = await supabase
    .from("bancos_movimientos")
    .select("cuenta_id, fecha, origen, bancos_cuentas(empresa_id)")
    .eq("id", movId)
    .maybeSingle();
  if (!mov) return { ok: false, error: "Movimiento no encontrado." };
  if (mov.origen !== "manual" && mov.origen !== "csv_manual")
    return {
      ok: false,
      error:
        "Solo movimientos manuales o de import CSV son eliminables.",
    };
  const empresaId = (mov.bancos_cuentas as { empresa_id: string } | null)
    ?.empresa_id;
  if (!empresaId) return { ok: false, error: "Empresa no resuelta." };
  const g = await gateMovimientos(empresaId);
  if (!g.ok) return { ok: false, error: g.error };

  const { error } = await supabase
    .from("bancos_movimientos")
    .delete()
    .eq("id", movId);
  if (error) return { ok: false, error: error.message };

  // Recalcular saldos desde la fecha del movimiento eliminado
  await recalcularSaldosDesde(mov.cuenta_id, mov.fecha as string);

  revalidatePath(`/finanzas/tesoreria/cuentas/${mov.cuenta_id}`);
  return { ok: true, error: null };
}

// ============================================================================
// Import CSV
// ============================================================================

/**
 * Detecta el separador (`,` o `;`) y la columna por nombre fuzzy.
 *
 * Columnas soportadas:
 *  - fecha: "fecha", "date", "fecha_movimiento", "fecha mov"
 *  - concepto: "concepto", "descripcion", "descripción", "operación"
 *  - referencia: "referencia", "ref", "folio"
 *  - cargo: "cargo", "debe", "salida", "egreso", "withdrawal"
 *  - abono: "abono", "haber", "entrada", "ingreso", "deposit"
 *  - monto (signed): "monto", "importe", "amount" — si presente, se usa
 *    el signo (+ → abono, - → cargo)
 */
function detectarSeparador(linea: string): "," | ";" | "\t" {
  const c = (linea.match(/,/g) ?? []).length;
  const sc = (linea.match(/;/g) ?? []).length;
  const tab = (linea.match(/\t/g) ?? []).length;
  if (sc >= c && sc >= tab) return ";";
  if (tab > c) return "\t";
  return ",";
}

function normHeader(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

function detectarColumnas(headers: string[]): {
  fecha?: number;
  concepto?: number;
  referencia?: number;
  cargo?: number;
  abono?: number;
  monto?: number;
} {
  const norm = headers.map(normHeader);
  const find = (candidatos: string[]) => {
    for (let i = 0; i < norm.length; i++) {
      if (candidatos.some((c) => norm[i].includes(c))) return i;
    }
    return undefined;
  };
  return {
    fecha: find(["fecha", "date", "dia"]),
    concepto: find(["concepto", "descripcion", "descrip", "operacion", "detalle"]),
    referencia: find(["referencia", "ref", "folio"]),
    cargo: find(["cargo", "debe", "salida", "egreso", "withdrawal", "retiro"]),
    abono: find(["abono", "haber", "entrada", "ingreso", "deposit", "deposito"]),
    monto: find(["monto", "importe", "amount"]),
  };
}

/** Convierte "1,234.56" / "1.234,56" / "1234.56" a number. */
function parseMonto(raw: string): number {
  if (!raw) return NaN;
  const s = raw.trim().replace(/\s/g, "");
  if (!s) return NaN;
  // Detectar formato: si tiene tanto . como , el último separador es decimal
  const lastDot = s.lastIndexOf(".");
  const lastComma = s.lastIndexOf(",");
  let normalizado = s;
  if (lastDot > 0 && lastComma > 0) {
    if (lastDot > lastComma) {
      // formato 1,234.56
      normalizado = s.replace(/,/g, "");
    } else {
      // formato 1.234,56
      normalizado = s.replace(/\./g, "").replace(",", ".");
    }
  } else if (lastComma > 0 && lastDot < 0) {
    // formato 1234,56 (probable decimal con coma)
    normalizado = s.replace(",", ".");
  }
  return Number(normalizado);
}

function parseFecha(raw: string): string | null {
  if (!raw) return null;
  const s = raw.trim();
  // YYYY-MM-DD, ya válido
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  // DD/MM/YYYY o DD-MM-YYYY
  const m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
  if (m) {
    const [, d, mo, y] = m;
    const yy = y.length === 2 ? `20${y}` : y;
    return `${yy.padStart(4, "0")}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  // Fallback: intentar Date
  const dt = new Date(s);
  if (!Number.isNaN(dt.getTime())) {
    return dt.toISOString().slice(0, 10);
  }
  return null;
}

function splitCSVLine(line: string, sep: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === sep && !inQuotes) {
      out.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

export async function importarMovimientosCSV(
  _prev: ImportCSVState,
  formData: FormData,
): Promise<ImportCSVState> {
  const cuentaId = formData.get("cuenta_id") as string;
  const file = formData.get("archivo") as File | null;
  if (!cuentaId)
    return { ...initialImportCSVState, error: "Falta cuenta." };
  if (!file || file.size === 0)
    return { ...initialImportCSVState, error: "Selecciona un archivo CSV." };
  if (file.size > 5 * 1024 * 1024)
    return { ...initialImportCSVState, error: "Archivo > 5MB no permitido." };

  const ge = await obtenerEmpresaId(cuentaId);
  if (!ge.ok) return { ...initialImportCSVState, error: ge.error };
  const g = await gateMovimientos(ge.empresaId);
  if (!g.ok) return { ...initialImportCSVState, error: g.error };

  // Decodificar; intentar UTF-8 y caer a Latin-1 si trae caracteres raros.
  const buf = await file.arrayBuffer();
  let text = new TextDecoder("utf-8").decode(buf);
  if (text.includes("�")) {
    // Caracteres replacement → probable Latin-1
    text = new TextDecoder("latin1").decode(buf);
  }
  const lineas = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
  if (lineas.length < 2) {
    return {
      ...initialImportCSVState,
      error: "El CSV no tiene encabezado + filas.",
    };
  }
  const sep = detectarSeparador(lineas[0]);
  const headers = splitCSVLine(lineas[0], sep);
  const cols = detectarColumnas(headers);
  if (cols.fecha === undefined || cols.concepto === undefined) {
    return {
      ...initialImportCSVState,
      error: `No se detectó columna fecha o concepto. Encabezados: ${headers.join(", ")}`,
    };
  }
  if (
    cols.cargo === undefined &&
    cols.abono === undefined &&
    cols.monto === undefined
  ) {
    return {
      ...initialImportCSVState,
      error: "No se detectó columna de cargo/abono ni de monto.",
    };
  }

  const supabase = createClient();
  const errores: Array<{ fila: number; mensaje: string }> = [];
  const filasProcesadas: Array<{
    cuenta_id: string;
    fecha: string;
    concepto: string;
    referencia: string | null;
    monto: number;
    tipo: "abono" | "cargo";
    origen: "csv_manual";
  }> = [];

  for (let i = 1; i < lineas.length; i++) {
    const filaNum = i + 1;
    const partes = splitCSVLine(lineas[i], sep);
    const fechaRaw = partes[cols.fecha] ?? "";
    const conceptoRaw = partes[cols.concepto] ?? "";
    const refRaw =
      cols.referencia !== undefined ? partes[cols.referencia] ?? "" : "";
    const fecha = parseFecha(fechaRaw);
    if (!fecha) {
      errores.push({ fila: filaNum, mensaje: `Fecha inválida: ${fechaRaw}` });
      continue;
    }
    if (!conceptoRaw) {
      errores.push({ fila: filaNum, mensaje: "Concepto vacío" });
      continue;
    }

    let monto = NaN;
    let tipo: "abono" | "cargo" = "abono";
    if (cols.cargo !== undefined && partes[cols.cargo]?.trim()) {
      const m = parseMonto(partes[cols.cargo]);
      if (Number.isFinite(m) && m !== 0) {
        monto = Math.abs(m);
        tipo = "cargo";
      }
    }
    if (
      Number.isNaN(monto) &&
      cols.abono !== undefined &&
      partes[cols.abono]?.trim()
    ) {
      const m = parseMonto(partes[cols.abono]);
      if (Number.isFinite(m) && m !== 0) {
        monto = Math.abs(m);
        tipo = "abono";
      }
    }
    if (Number.isNaN(monto) && cols.monto !== undefined) {
      const m = parseMonto(partes[cols.monto]);
      if (Number.isFinite(m) && m !== 0) {
        monto = Math.abs(m);
        tipo = m >= 0 ? "abono" : "cargo";
      }
    }
    if (!Number.isFinite(monto) || monto <= 0) {
      errores.push({ fila: filaNum, mensaje: "Monto vacío o cero" });
      continue;
    }

    filasProcesadas.push({
      cuenta_id: cuentaId,
      fecha,
      concepto: conceptoRaw.slice(0, 500),
      referencia: refRaw ? refRaw.slice(0, 100) : null,
      monto,
      tipo,
      origen: "csv_manual",
    });
  }

  if (filasProcesadas.length === 0) {
    return {
      ...initialImportCSVState,
      error: "No se importó ninguna fila válida.",
      errores,
    };
  }

  // Detectar duplicados por (cuenta_id, fecha, concepto, monto, tipo)
  const fechaMin = filasProcesadas.reduce(
    (a, f) => (f.fecha < a ? f.fecha : a),
    filasProcesadas[0].fecha,
  );
  const fechaMax = filasProcesadas.reduce(
    (a, f) => (f.fecha > a ? f.fecha : a),
    filasProcesadas[0].fecha,
  );
  const { data: existentes } = await supabase
    .from("bancos_movimientos")
    .select("fecha, concepto, monto, tipo")
    .eq("cuenta_id", cuentaId)
    .gte("fecha", fechaMin)
    .lte("fecha", fechaMax);
  const claveExistente = new Set(
    (existentes ?? []).map(
      (m) =>
        `${m.fecha}|${(m.concepto ?? "").slice(0, 100)}|${Number(m.monto)}|${m.tipo}`,
    ),
  );

  const aInsertar = filasProcesadas.filter((f) => {
    const k = `${f.fecha}|${f.concepto.slice(0, 100)}|${f.monto}|${f.tipo}`;
    return !claveExistente.has(k);
  });
  const duplicados = filasProcesadas.length - aInsertar.length;

  if (aInsertar.length > 0) {
    const { error: insErr } = await supabase
      .from("bancos_movimientos")
      .insert(aInsertar);
    if (insErr) {
      return {
        ok: false,
        error: `Insertando: ${insErr.message}`,
        importados: 0,
        duplicados,
        errores,
      };
    }
    // Recalcular saldos desde la fecha más temprana
    await recalcularSaldosDesde(cuentaId, fechaMin);
  }

  revalidatePath(`/finanzas/tesoreria/cuentas/${cuentaId}`);
  return {
    ok: true,
    error: null,
    importados: aInsertar.length,
    duplicados,
    errores,
  };
}
