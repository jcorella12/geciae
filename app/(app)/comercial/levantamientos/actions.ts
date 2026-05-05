"use server";

import { revalidatePath } from "next/cache";

import {
  esCEO,
  esRolEn,
  obtenerVinculos,
  tieneAtributo,
} from "@/lib/auth/permisos";
import {
  asegurarSubCentroVendedor,
  calcularCostoLevantamiento,
} from "@/lib/levantamientos/calculo-costo";
import {
  ActualizarLevantamientoSchema,
  CambiarEstadoLevSchema,
  CompletarPasoSchema,
  CrearLevantamientoSchema,
  CrearTarifaSchema,
} from "@/lib/levantamientos/schemas";
import {
  initialLevantamientoState,
  initialSimpleLevState,
  type LevantamientoState,
  type SimpleLevState,
} from "@/lib/levantamientos/state";
import { createClient } from "@/lib/supabase/server";

function flatErrors(err: { issues: Array<{ path: (string | number)[]; message: string }> }) {
  const out: Record<string, string[]> = {};
  for (const issue of err.issues) {
    const k = issue.path.join(".");
    out[k] = [...(out[k] ?? []), issue.message];
  }
  return out;
}

async function gateLevantamiento(empresaId: string): Promise<boolean> {
  const v = await obtenerVinculos();
  return (
    esCEO(v) ||
    esRolEn(v, empresaId, ["director", "operativo"]) ||
    tieneAtributo(v, "vendedor", empresaId)
  );
}

// ============================================================================
// Crear levantamiento
// ============================================================================

export async function crearLevantamiento(
  _prev: LevantamientoState,
  formData: FormData,
): Promise<LevantamientoState> {
  const parsed = CrearLevantamientoSchema.safeParse({
    empresa_id: formData.get("empresa_id"),
    oportunidad_id: formData.get("oportunidad_id") ?? "",
    cliente_id: formData.get("cliente_id") ?? "",
    ingeniero_id: formData.get("ingeniero_id") ?? "",
    fecha_solicitud: formData.get("fecha_solicitud"),
    fecha_propuesta: formData.get("fecha_propuesta") ?? "",
    observaciones: formData.get("observaciones") ?? "",
  });
  if (!parsed.success) {
    return {
      ...initialLevantamientoState,
      error: "Revisa los campos.",
      fieldErrors: flatErrors(parsed.error),
    };
  }
  const d = parsed.data;
  if (!(await gateLevantamiento(d.empresa_id)))
    return { ...initialLevantamientoState, error: "Sin permiso." };

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return { ...initialLevantamientoState, error: "Sin sesión." };

  // Crear sub-centro vendedor si existe el CC padre "Ventas"
  const centroId = await asegurarSubCentroVendedor(
    d.empresa_id,
    user.id,
    user.email ?? user.id.slice(0, 8),
  );

  const { data, error } = await supabase
    .from("levantamientos")
    .insert({
      empresa_id: d.empresa_id,
      oportunidad_id: d.oportunidad_id,
      cliente_id: d.cliente_id,
      vendedor_id: user.id,
      ingeniero_id: d.ingeniero_id,
      fecha_solicitud: d.fecha_solicitud,
      fecha_propuesta: d.fecha_propuesta,
      observaciones: d.observaciones,
      centro_id: centroId,
      estado: "programado" as never,
    })
    .select("id")
    .single();
  if (error || !data)
    return {
      ...initialLevantamientoState,
      error: error?.message ?? "Error al crear",
    };

  revalidatePath("/comercial/levantamientos");
  return { ok: true, error: null, levantamientoId: data.id };
}

// ============================================================================
// Actualizar
// ============================================================================

export async function actualizarLevantamiento(
  _prev: SimpleLevState,
  formData: FormData,
): Promise<SimpleLevState> {
  const parsed = ActualizarLevantamientoSchema.safeParse({
    levantamiento_id: formData.get("levantamiento_id"),
    fecha_propuesta: formData.get("fecha_propuesta") ?? undefined,
    fecha_realizada: formData.get("fecha_realizada") ?? undefined,
    ingeniero_id: formData.get("ingeniero_id") ?? "",
    horas_ingeniero: formData.get("horas_ingeniero") || null,
    viaticos: formData.get("viaticos") || null,
    kilometraje: formData.get("kilometraje") || null,
    resultado_descripcion: formData.get("resultado_descripcion") ?? undefined,
    url_informe: formData.get("url_informe") ?? "",
    observaciones: formData.get("observaciones") ?? undefined,
  });
  if (!parsed.success)
    return { ...initialSimpleLevState, error: "Datos inválidos." };

  const supabase = createClient();
  const { data: lev } = await supabase
    .from("levantamientos")
    .select("id, empresa_id, vendedor_id, estado")
    .eq("id", parsed.data.levantamiento_id)
    .maybeSingle();
  if (!lev) return { ...initialSimpleLevState, error: "No encontrado." };

  const v = await obtenerVinculos();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const puede =
    esCEO(v) ||
    user?.id === lev.vendedor_id ||
    esRolEn(v, lev.empresa_id, ["director", "operativo"]);
  if (!puede) return { ...initialSimpleLevState, error: "Sin permiso." };

  const patch: Record<string, unknown> = {};
  for (const k of [
    "fecha_propuesta",
    "fecha_realizada",
    "ingeniero_id",
    "horas_ingeniero",
    "viaticos",
    "kilometraje",
    "resultado_descripcion",
    "url_informe",
    "observaciones",
  ] as const) {
    const v = parsed.data[k as keyof typeof parsed.data];
    if (v !== undefined) patch[k] = v;
  }

  if (Object.keys(patch).length === 0)
    return { ok: true, error: null };

  const { error } = await supabase
    .from("levantamientos")
    .update(patch as never)
    .eq("id", parsed.data.levantamiento_id);
  if (error) return { ...initialSimpleLevState, error: error.message };

  revalidatePath("/comercial/levantamientos");
  revalidatePath(`/comercial/levantamientos/${parsed.data.levantamiento_id}`);
  return { ok: true, error: null };
}

// ============================================================================
// Completar paso
// ============================================================================

export async function completarPaso(
  _prev: SimpleLevState,
  formData: FormData,
): Promise<SimpleLevState> {
  const parsed = CompletarPasoSchema.safeParse({
    levantamiento_id: formData.get("levantamiento_id"),
    paso_numero: formData.get("paso_numero"),
    observaciones: formData.get("observaciones") ?? "",
  });
  if (!parsed.success)
    return { ...initialSimpleLevState, error: "Datos inválidos." };

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ...initialSimpleLevState, error: "Sin sesión." };

  const { error } = await supabase
    .from("levantamiento_pasos")
    .update({
      estado: "completado" as never,
      fecha_completado: new Date().toISOString(),
      responsable_id: user.id,
      observaciones: parsed.data.observaciones,
    })
    .eq("levantamiento_id", parsed.data.levantamiento_id)
    .eq("numero", parsed.data.paso_numero);
  if (error) return { ...initialSimpleLevState, error: error.message };

  revalidatePath(`/comercial/levantamientos/${parsed.data.levantamiento_id}`);
  return { ok: true, error: null };
}

// ============================================================================
// Marcar completado (calcula costo + registra en centro)
// ============================================================================

export async function marcarCompletado(
  _prev: SimpleLevState,
  formData: FormData,
): Promise<SimpleLevState> {
  const id = formData.get("levantamiento_id");
  if (typeof id !== "string")
    return { ...initialSimpleLevState, error: "ID inválido." };

  const supabase = createClient();
  const { data: lev } = await supabase
    .from("levantamientos")
    .select(
      "id, empresa_id, centro_id, fecha_realizada, fecha_solicitud, vendedor_id",
    )
    .eq("id", id)
    .maybeSingle();
  if (!lev) return { ...initialSimpleLevState, error: "No encontrado." };

  const calc = await calcularCostoLevantamiento(id);
  if (!calc.ok) return { ...initialSimpleLevState, error: calc.error };

  const fechaCargo = (lev.fecha_realizada ?? lev.fecha_solicitud) as string;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ...initialSimpleLevState, error: "Sin sesión." };

  // Update levantamiento: costo + estado
  await supabase
    .from("levantamientos")
    .update({
      costo_calculado: calc.data.costo,
      estado: "completado" as never,
      fecha_realizada: fechaCargo,
    })
    .eq("id", id);

  // Registrar movimiento si tiene centro asignado
  if (lev.centro_id && calc.data.costo > 0) {
    await supabase.from("centros_movimientos").insert({
      centro_id: lev.centro_id,
      empresa_id: lev.empresa_id,
      fecha: fechaCargo,
      tipo: "gasto_directo" as never,
      concepto: `Levantamiento ${id.slice(0, 8)}`,
      monto: calc.data.costo,
      capturado_por: user.id,
      observaciones: `Costo calculado: ${calc.data.desglose.monto_horas} horas + ${calc.data.desglose.viaticos} viáticos + ${calc.data.desglose.monto_km} km`,
    });
  }

  revalidatePath(`/comercial/levantamientos/${id}`);
  return { ok: true, error: null };
}

// ============================================================================
// Cambiar estado (convertido / no_convertido / cancelado)
// ============================================================================

export async function cambiarEstadoLev(
  _prev: SimpleLevState,
  formData: FormData,
): Promise<SimpleLevState> {
  const parsed = CambiarEstadoLevSchema.safeParse({
    levantamiento_id: formData.get("levantamiento_id"),
    estado: formData.get("estado"),
    proyecto_destino_id: formData.get("proyecto_destino_id") ?? "",
  });
  if (!parsed.success)
    return { ...initialSimpleLevState, error: "Datos inválidos." };

  const { levantamiento_id, estado, proyecto_destino_id } = parsed.data;
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ...initialSimpleLevState, error: "Sin sesión." };

  if (estado === "convertido_a_venta" && !proyecto_destino_id) {
    return {
      ...initialSimpleLevState,
      error: "Para convertir, indica el proyecto destino.",
    };
  }

  const patch: Record<string, unknown> = {
    estado,
  };
  if (estado === "convertido_a_venta") {
    patch.proyecto_destino_id = proyecto_destino_id;
    patch.reasignado_at = new Date().toISOString();
    patch.reasignado_por = user.id;
  }

  const { error } = await supabase
    .from("levantamientos")
    .update(patch as never)
    .eq("id", levantamiento_id);
  if (error) return { ...initialSimpleLevState, error: error.message };

  // Si se convierte: re-asignar el movimiento del costo del centro vendedor al
  // proyecto destino (no movemos a otro centro por ahora, solo agregamos
  // proyecto_id al movimiento existente).
  if (estado === "convertido_a_venta" && proyecto_destino_id) {
    await supabase
      .from("centros_movimientos")
      .update({ proyecto_id: proyecto_destino_id })
      .eq("concepto", `Levantamiento ${levantamiento_id.slice(0, 8)}`);
  }

  revalidatePath("/comercial/levantamientos");
  revalidatePath(`/comercial/levantamientos/${levantamiento_id}`);
  return { ok: true, error: null };
}

// ============================================================================
// Tarifas internas
// ============================================================================

export async function crearTarifa(
  _prev: SimpleLevState,
  formData: FormData,
): Promise<SimpleLevState> {
  const parsed = CrearTarifaSchema.safeParse({
    empresa_id: formData.get("empresa_id"),
    concepto: formData.get("concepto"),
    unidad: formData.get("unidad"),
    costo_unitario: formData.get("costo_unitario"),
    vigente_desde: formData.get("vigente_desde"),
    vigente_hasta: formData.get("vigente_hasta") ?? "",
    observaciones: formData.get("observaciones") ?? "",
  });
  if (!parsed.success)
    return { ...initialSimpleLevState, error: "Datos inválidos." };

  const v = await obtenerVinculos();
  const puede =
    esCEO(v) ||
    tieneAtributo(v, "tesorero_corporativo") ||
    esRolEn(v, parsed.data.empresa_id, "director");
  if (!puede) return { ...initialSimpleLevState, error: "Sin permiso." };

  const supabase = createClient();
  const { error } = await supabase.from("tarifas_internas").insert({
    empresa_id: parsed.data.empresa_id,
    concepto: parsed.data.concepto,
    unidad: parsed.data.unidad,
    costo_unitario: parsed.data.costo_unitario,
    vigente_desde: parsed.data.vigente_desde,
    vigente_hasta: parsed.data.vigente_hasta,
    observaciones: parsed.data.observaciones,
    activa: true,
  });
  if (error) return { ...initialSimpleLevState, error: error.message };

  revalidatePath("/comercial/levantamientos/tarifas");
  return { ok: true, error: null };
}
