"use server";

import { revalidatePath } from "next/cache";

import {
  esCEO,
  esRolEn,
  obtenerVinculos,
  tieneAtributo,
} from "@/lib/auth/permisos";
import {
  ActualizarCentroSchema,
  ActualizarReglaRepartoSchema,
  ArchivarCentroSchema,
  ArchivarReglaSchema,
  CrearCentroSchema,
  CrearMovimientoSchema,
  CrearReglaRepartoSchema,
} from "@/lib/centros/schemas";
import {
  initialCentroState,
  initialMovimientoState,
  initialReglaRepartoState,
  initialSimpleCentroState,
  type CentroState,
  type MovimientoState,
  type ReglaRepartoState,
  type SimpleCentroState,
  type SubtipoCentro,
  type TipoCentro,
} from "@/lib/centros/state";
import { createClient } from "@/lib/supabase/server";

/**
 * Server actions para Centros de costo y utilidad (Sprint 5.5.1).
 *
 * Permisos generales:
 *  - Crear/editar/archivar CENTRO: CEO, tesorero corporativo o director de
 *    la empresa propietaria.
 *  - Crear/editar/archivar REGLA DE REPARTO: solo CEO o tesorero corporativo
 *    (impacto financiero alto, afecta inter-co).
 *  - Crear MOVIMIENTO MANUAL: CEO, tesorero corporativo, director u
 *    operativo de la empresa.
 *
 * Esta acción NO toca transacciones existentes (eso es 5.5.3) ni ejecuta
 * el cálculo de cierre mensual (eso es 5.5.4).
 */

async function gateCentroEmpresa(
  empresaId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const v = await obtenerVinculos();
  const puede =
    esCEO(v) ||
    tieneAtributo(v, "tesorero_corporativo") ||
    esRolEn(v, empresaId, "director");
  if (!puede)
    return {
      ok: false,
      error:
        "Solo CEO, tesorero corporativo o director de la empresa pueden gestionar centros.",
    };
  return { ok: true };
}

async function gateCentro(
  centroId: string,
): Promise<
  | { ok: true; empresaId: string; tipo: TipoCentro; subtipo: SubtipoCentro }
  | { ok: false; error: string }
> {
  const supabase = createClient();
  const { data } = await supabase
    .from("centros")
    .select("empresa_id, tipo, subtipo")
    .eq("id", centroId)
    .maybeSingle();
  if (!data) return { ok: false, error: "Centro no encontrado." };
  const g = await gateCentroEmpresa(data.empresa_id);
  if (!g.ok) return g;
  return {
    ok: true,
    empresaId: data.empresa_id,
    tipo: data.tipo as TipoCentro,
    subtipo: data.subtipo as SubtipoCentro,
  };
}

async function gateReglaReparto(): Promise<
  { ok: true } | { ok: false; error: string }
> {
  const v = await obtenerVinculos();
  const puede =
    esCEO(v) || tieneAtributo(v, "tesorero_corporativo");
  if (!puede)
    return {
      ok: false,
      error:
        "Solo CEO o tesorero corporativo pueden gestionar reglas de reparto.",
    };
  return { ok: true };
}

function flatErrors(
  err: { issues: Array<{ path: (string | number)[]; message: string }> },
): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const i of err.issues) {
    const k = String(i.path[0] ?? "_");
    if (!out[k]) out[k] = [];
    out[k].push(i.message);
  }
  return out;
}

// ============================================================================
// CENTROS — CRUD
// ============================================================================

export async function crearCentro(
  _prev: CentroState,
  formData: FormData,
): Promise<CentroState> {
  const parsed = CrearCentroSchema.safeParse({
    empresa_id: formData.get("empresa_id"),
    codigo: formData.get("codigo"),
    nombre: formData.get("nombre"),
    descripcion: formData.get("descripcion") ?? "",
    tipo: formData.get("tipo"),
    subtipo: formData.get("subtipo"),
    responsable_id: formData.get("responsable_id") ?? "",
    centro_padre_id: formData.get("centro_padre_id") ?? "",
    presupuesto_anual: formData.get("presupuesto_anual") || null,
    observaciones: formData.get("observaciones") ?? "",
  });
  if (!parsed.success) {
    return {
      ...initialCentroState,
      error: "Revisa los campos.",
      fieldErrors: flatErrors(parsed.error),
    };
  }
  const d = parsed.data;
  const g = await gateCentroEmpresa(d.empresa_id);
  if (!g.ok) return { ...initialCentroState, error: g.error };

  // Si es sub-centro, validar que el padre exista, sea de la misma empresa
  // y tenga subtipo coherente.
  if (d.centro_padre_id) {
    const supabase = createClient();
    const { data: padre } = await supabase
      .from("centros")
      .select("empresa_id, subtipo, activo")
      .eq("id", d.centro_padre_id)
      .maybeSingle();
    if (!padre)
      return {
        ...initialCentroState,
        error: "Centro padre no encontrado.",
      };
    if (padre.empresa_id !== d.empresa_id)
      return {
        ...initialCentroState,
        error: "El centro padre debe pertenecer a la misma empresa.",
      };
    if (padre.activo === false)
      return {
        ...initialCentroState,
        error: "El centro padre está archivado; no se puede crear sub-centro.",
      };
  }

  const supabase = createClient();
  const { data: nuevo, error } = await supabase
    .from("centros")
    .insert({
      empresa_id: d.empresa_id,
      codigo: d.codigo.toUpperCase(),
      nombre: d.nombre,
      descripcion: d.descripcion,
      tipo: d.tipo as TipoCentro,
      subtipo: d.subtipo as SubtipoCentro,
      responsable_id: d.responsable_id,
      centro_padre_id: d.centro_padre_id,
      presupuesto_anual: d.presupuesto_anual ?? null,
      observaciones: d.observaciones,
      activo: true,
    })
    .select("id")
    .single();

  if (error || !nuevo) {
    if (error?.message?.includes("duplicate"))
      return {
        ...initialCentroState,
        error: `Ya existe un centro con código '${d.codigo.toUpperCase()}' en esta empresa.`,
      };
    return {
      ...initialCentroState,
      error: error?.message ?? "Error al crear",
    };
  }

  revalidatePath("/configuracion/centros");
  return { ok: true, error: null, centroId: nuevo.id };
}

export async function actualizarCentro(
  _prev: SimpleCentroState,
  formData: FormData,
): Promise<SimpleCentroState> {
  const parsed = ActualizarCentroSchema.safeParse({
    centro_id: formData.get("centro_id"),
    nombre: formData.get("nombre") ?? undefined,
    descripcion: formData.get("descripcion") ?? undefined,
    responsable_id: formData.get("responsable_id") ?? "",
    presupuesto_anual: formData.get("presupuesto_anual") || null,
    observaciones: formData.get("observaciones") ?? undefined,
  });
  if (!parsed.success)
    return { ...initialSimpleCentroState, error: "Datos inválidos." };

  const g = await gateCentro(parsed.data.centro_id);
  if (!g.ok) return { ...initialSimpleCentroState, error: g.error };

  const supabase = createClient();
  const patch: Record<string, unknown> = {};
  if (parsed.data.nombre !== undefined) patch.nombre = parsed.data.nombre;
  if (parsed.data.descripcion !== undefined)
    patch.descripcion = parsed.data.descripcion;
  if (parsed.data.responsable_id !== undefined)
    patch.responsable_id = parsed.data.responsable_id;
  if (parsed.data.presupuesto_anual !== undefined)
    patch.presupuesto_anual = parsed.data.presupuesto_anual;
  if (parsed.data.observaciones !== undefined)
    patch.observaciones = parsed.data.observaciones;
  if (Object.keys(patch).length === 0)
    return { ok: true, error: null };

  const { error } = await supabase
    .from("centros")
    // Patch dinámico; cast localizado al tipo Update<centros>.
    .update(patch as never)
    .eq("id", parsed.data.centro_id);
  if (error)
    return { ...initialSimpleCentroState, error: error.message };

  revalidatePath("/configuracion/centros");
  revalidatePath(`/configuracion/centros/${parsed.data.centro_id}`);
  return { ok: true, error: null };
}

export async function archivarCentro(
  _prev: SimpleCentroState,
  formData: FormData,
): Promise<SimpleCentroState> {
  const parsed = ArchivarCentroSchema.safeParse({
    centro_id: formData.get("centro_id"),
  });
  if (!parsed.success)
    return { ...initialSimpleCentroState, error: "Centro inválido." };
  const g = await gateCentro(parsed.data.centro_id);
  if (!g.ok) return { ...initialSimpleCentroState, error: g.error };

  // Validar: no se puede archivar centro con movimientos en mes no cerrado.
  const supabase = createClient();
  const ahora = new Date();
  const inicioMesActual = new Date(ahora.getFullYear(), ahora.getMonth(), 1)
    .toISOString()
    .slice(0, 10);
  const { count: movsRecientes } = await supabase
    .from("centros_movimientos")
    .select("id", { count: "exact", head: true })
    .eq("centro_id", parsed.data.centro_id)
    .gte("fecha", inicioMesActual);
  if ((movsRecientes ?? 0) > 0) {
    return {
      ...initialSimpleCentroState,
      error: `Centro tiene ${movsRecientes} movimiento(s) en el mes actual sin cerrar. Cierra el mes antes de archivar.`,
    };
  }

  // Validar: no archivar si tiene sub-centros activos
  const { count: subActivos } = await supabase
    .from("centros")
    .select("id", { count: "exact", head: true })
    .eq("centro_padre_id", parsed.data.centro_id)
    .eq("activo", true);
  if ((subActivos ?? 0) > 0) {
    return {
      ...initialSimpleCentroState,
      error: `Centro tiene ${subActivos} sub-centro(s) activos. Archívalos primero.`,
    };
  }

  const { error } = await supabase
    .from("centros")
    .update({ activo: false })
    .eq("id", parsed.data.centro_id);
  if (error)
    return { ...initialSimpleCentroState, error: error.message };

  revalidatePath("/configuracion/centros");
  return { ok: true, error: null };
}

// ============================================================================
// REGLAS DE REPARTO — CRUD
// ============================================================================

export async function crearReglaReparto(
  _prev: ReglaRepartoState,
  formData: FormData,
): Promise<ReglaRepartoState> {
  const parsed = CrearReglaRepartoSchema.safeParse({
    centro_origen_id: formData.get("centro_origen_id"),
    empresa_destino_id: formData.get("empresa_destino_id"),
    centro_destino_id: formData.get("centro_destino_id") ?? "",
    metodo: formData.get("metodo"),
    valor: formData.get("valor") || null,
    emision: formData.get("emision") || "asiento_interno",
    vigencia_desde: formData.get("vigencia_desde"),
    vigencia_hasta: formData.get("vigencia_hasta") ?? "",
    observaciones: formData.get("observaciones") ?? "",
  });
  if (!parsed.success) {
    return {
      ...initialReglaRepartoState,
      error: "Revisa los campos.",
      fieldErrors: flatErrors(parsed.error),
    };
  }
  const d = parsed.data;
  const gate = await gateReglaReparto();
  if (!gate.ok) return { ...initialReglaRepartoState, error: gate.error };

  // Validar que el centro origen exista y sea servicio_compartido
  const supabase = createClient();
  const { data: origen } = await supabase
    .from("centros")
    .select("id, subtipo, activo, empresa_id")
    .eq("id", d.centro_origen_id)
    .maybeSingle();
  if (!origen)
    return {
      ...initialReglaRepartoState,
      error: "Centro origen no encontrado.",
    };
  if (!origen.activo)
    return {
      ...initialReglaRepartoState,
      error: "Centro origen está archivado.",
    };
  if (origen.subtipo !== "servicio_compartido")
    return {
      ...initialReglaRepartoState,
      error:
        "Solo centros de subtipo 'servicio_compartido' pueden tener reglas de reparto.",
    };
  if (origen.empresa_id === d.empresa_destino_id)
    return {
      ...initialReglaRepartoState,
      error: "El destino debe ser una empresa distinta a la del origen.",
    };

  // Validar que el centro destino (si se especifica) sea de la empresa destino
  if (d.centro_destino_id) {
    const { data: destino } = await supabase
      .from("centros")
      .select("empresa_id, activo")
      .eq("id", d.centro_destino_id)
      .maybeSingle();
    if (!destino)
      return {
        ...initialReglaRepartoState,
        error: "Centro destino no encontrado.",
      };
    if (destino.empresa_id !== d.empresa_destino_id)
      return {
        ...initialReglaRepartoState,
        error:
          "El centro destino debe pertenecer a la empresa destino seleccionada.",
      };
    if (!destino.activo)
      return {
        ...initialReglaRepartoState,
        error: "Centro destino está archivado.",
      };
  }

  // Validar suma de % si método es porcentaje_fijo
  if (d.metodo === "porcentaje_fijo" && d.valor !== null && d.valor !== undefined) {
    const { data: existentes } = await supabase
      .from("centros_reglas_reparto")
      .select("valor, vigencia_desde, vigencia_hasta")
      .eq("centro_origen_id", d.centro_origen_id)
      .eq("metodo", "porcentaje_fijo")
      .eq("activa", true);
    // Reglas que se solapan con la vigencia nueva
    const desde = d.vigencia_desde;
    const hasta = d.vigencia_hasta ?? "9999-12-31";
    const sumaSolapadas = (existentes ?? []).reduce((acc, r) => {
      const rDesde = r.vigencia_desde as string;
      const rHasta = (r.vigencia_hasta as string | null) ?? "9999-12-31";
      const seSolapa = rDesde <= hasta && rHasta >= desde;
      return seSolapa ? acc + Number(r.valor ?? 0) : acc;
    }, 0);
    const sumaTotal = sumaSolapadas + Number(d.valor);
    if (sumaTotal > 100.0001) {
      return {
        ...initialReglaRepartoState,
        error: `La suma de % activos vigentes para este centro origen sería ${sumaTotal.toFixed(2)}%, que excede 100%. Reglas existentes solapadas suman ${sumaSolapadas.toFixed(2)}%.`,
      };
    }
  }

  const { data: nueva, error } = await supabase
    .from("centros_reglas_reparto")
    .insert({
      centro_origen_id: d.centro_origen_id,
      empresa_destino_id: d.empresa_destino_id,
      centro_destino_id: d.centro_destino_id,
      metodo: d.metodo as never,
      valor: d.valor ?? null,
      emision: d.emision as never,
      vigencia_desde: d.vigencia_desde,
      vigencia_hasta: d.vigencia_hasta,
      observaciones: d.observaciones,
      activa: true,
    })
    .select("id")
    .single();
  if (error || !nueva)
    return {
      ...initialReglaRepartoState,
      error: error?.message ?? "Error al crear regla.",
    };

  revalidatePath("/configuracion/centros");
  revalidatePath(
    `/configuracion/centros/${d.centro_origen_id}`,
  );
  return { ok: true, error: null, reglaId: nueva.id };
}

export async function actualizarReglaReparto(
  _prev: SimpleCentroState,
  formData: FormData,
): Promise<SimpleCentroState> {
  const parsed = ActualizarReglaRepartoSchema.safeParse({
    regla_id: formData.get("regla_id"),
    metodo: formData.get("metodo") ?? undefined,
    valor: formData.get("valor") || null,
    emision: formData.get("emision") ?? undefined,
    vigencia_hasta: formData.get("vigencia_hasta") || null,
    observaciones: formData.get("observaciones") ?? undefined,
  });
  if (!parsed.success)
    return { ...initialSimpleCentroState, error: "Datos inválidos." };
  const gate = await gateReglaReparto();
  if (!gate.ok) return { ...initialSimpleCentroState, error: gate.error };

  const supabase = createClient();
  const patch: Record<string, unknown> = {};
  if (parsed.data.metodo !== undefined) patch.metodo = parsed.data.metodo;
  if (parsed.data.valor !== undefined) patch.valor = parsed.data.valor;
  if (parsed.data.emision !== undefined) patch.emision = parsed.data.emision;
  if (parsed.data.vigencia_hasta !== undefined)
    patch.vigencia_hasta = parsed.data.vigencia_hasta;
  if (parsed.data.observaciones !== undefined)
    patch.observaciones = parsed.data.observaciones;
  if (Object.keys(patch).length === 0)
    return { ok: true, error: null };

  const { error } = await supabase
    .from("centros_reglas_reparto")
    .update(patch as never)
    .eq("id", parsed.data.regla_id);
  if (error)
    return { ...initialSimpleCentroState, error: error.message };

  revalidatePath("/configuracion/centros");
  return { ok: true, error: null };
}

export async function archivarReglaReparto(
  _prev: SimpleCentroState,
  formData: FormData,
): Promise<SimpleCentroState> {
  const parsed = ArchivarReglaSchema.safeParse({
    regla_id: formData.get("regla_id"),
  });
  if (!parsed.success)
    return { ...initialSimpleCentroState, error: "Regla inválida." };
  const gate = await gateReglaReparto();
  if (!gate.ok) return { ...initialSimpleCentroState, error: gate.error };

  const supabase = createClient();
  const { error } = await supabase
    .from("centros_reglas_reparto")
    .update({ activa: false })
    .eq("id", parsed.data.regla_id);
  if (error)
    return { ...initialSimpleCentroState, error: error.message };

  revalidatePath("/configuracion/centros");
  return { ok: true, error: null };
}

// ============================================================================
// MOVIMIENTOS MANUALES (asiento manual; el resto vienen de hooks de OC/OT/etc)
// ============================================================================

export async function crearMovimientoManual(
  _prev: MovimientoState,
  formData: FormData,
): Promise<MovimientoState> {
  const parsed = CrearMovimientoSchema.safeParse({
    centro_id: formData.get("centro_id"),
    fecha: formData.get("fecha"),
    tipo: formData.get("tipo"),
    concepto: formData.get("concepto"),
    monto: formData.get("monto"),
    proyecto_id: formData.get("proyecto_id") ?? "",
    observaciones: formData.get("observaciones") ?? "",
  });
  if (!parsed.success) {
    return {
      ...initialMovimientoState,
      error: "Revisa los campos.",
      fieldErrors: flatErrors(parsed.error),
    };
  }
  const d = parsed.data;
  const g = await gateCentro(d.centro_id);
  if (!g.ok) return { ...initialMovimientoState, error: g.error };

  const supabase = createClient();
  const { data: usr } = await supabase.auth.getUser();
  if (!usr.user)
    return { ...initialMovimientoState, error: "Sesión expirada." };

  // Bloquear inserción si el mes ya está cerrado para esta empresa
  const fecha = new Date(d.fecha);
  const { data: cierre } = await supabase
    .from("centros_cierres_mensuales")
    .select("cerrado")
    .eq("empresa_id", g.empresaId)
    .eq("anio", fecha.getFullYear())
    .eq("mes", fecha.getMonth() + 1)
    .maybeSingle();
  if (cierre?.cerrado) {
    return {
      ...initialMovimientoState,
      error: `El mes ${fecha.getMonth() + 1}/${fecha.getFullYear()} ya está cerrado para esta empresa. Reabre el cierre primero.`,
    };
  }

  const { data: nuevo, error } = await supabase
    .from("centros_movimientos")
    .insert({
      centro_id: d.centro_id,
      empresa_id: g.empresaId,
      fecha: d.fecha,
      tipo: d.tipo as never,
      concepto: d.concepto,
      monto: d.monto,
      proyecto_id: d.proyecto_id,
      observaciones: d.observaciones,
      capturado_por: usr.user.id,
    })
    .select("id")
    .single();
  if (error || !nuevo)
    return {
      ...initialMovimientoState,
      error: error?.message ?? "Error al registrar",
    };

  revalidatePath("/configuracion/centros");
  revalidatePath(`/configuracion/centros/${d.centro_id}`);
  return { ok: true, error: null, movimientoId: nuevo.id };
}
