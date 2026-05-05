"use server";

import { revalidatePath } from "next/cache";

import {
  esCEO,
  esRolEn,
  obtenerVinculos,
  tieneAtributo,
} from "@/lib/auth/permisos";
import { CotizacionFormSchema } from "@/lib/cotizaciones/schemas";
import type { CotizacionState } from "@/lib/cotizaciones/state";
import { createClient } from "@/lib/supabase/server";

function gateCotizar(
  v: Awaited<ReturnType<typeof obtenerVinculos>>,
  empresaId: string,
): boolean {
  return (
    esCEO(v) ||
    tieneAtributo(v, "vendedor") ||
    esRolEn(v, empresaId, ["director", "operativo"])
  );
}

/**
 * Parser auxiliar: el form viene con conceptos[N][campo] como FormData.
 * Reconstruye un array a partir de eso.
 */
function parseConceptosFromForm(formData: FormData) {
  const conceptos: Array<Record<string, unknown>> = [];
  const indices = new Set<number>();
  const keys = Array.from(formData.keys());
  for (const key of keys) {
    const m = key.match(/^conceptos\[(\d+)]/);
    if (m) indices.add(parseInt(m[1], 10));
  }
  const sorted = Array.from(indices).sort((a, b) => a - b);
  for (const i of sorted) {
    conceptos.push({
      orden: i + 1,
      clave_sat: formData.get(`conceptos[${i}][clave_sat]`) || undefined,
      descripcion: formData.get(`conceptos[${i}][descripcion]`),
      cantidad: formData.get(`conceptos[${i}][cantidad]`),
      unidad_sat: formData.get(`conceptos[${i}][unidad_sat]`) || undefined,
      precio_unitario: formData.get(`conceptos[${i}][precio_unitario]`),
      descuento: formData.get(`conceptos[${i}][descuento]`) ?? 0,
      iva_tasa: formData.get(`conceptos[${i}][iva_tasa]`) ?? 0.16,
      observaciones: formData.get(`conceptos[${i}][observaciones]`) || undefined,
    });
  }
  return conceptos;
}

export async function crearCotizacion(
  _prev: CotizacionState,
  formData: FormData,
): Promise<CotizacionState> {
  const conceptos = parseConceptosFromForm(formData);
  const parsed = CotizacionFormSchema.safeParse({
    empresa_id: formData.get("empresa_id"),
    cliente_id: formData.get("cliente_id"),
    oportunidad_id: formData.get("oportunidad_id") || undefined,
    fecha_emision: formData.get("fecha_emision"),
    vigencia_dias: formData.get("vigencia_dias") ?? 30,
    descuento_global: formData.get("descuento_global") ?? 0,
    retenciones: formData.get("retenciones") ?? 0,
    condiciones_pago: formData.get("condiciones_pago") || undefined,
    notas: formData.get("notas") || undefined,
    conceptos,
  });
  if (!parsed.success) {
    return {
      ok: false,
      cotizacionId: null,
      error: parsed.error.issues.map((i) => i.message).join("; "),
    };
  }
  const d = parsed.data;
  const v = await obtenerVinculos();
  if (!gateCotizar(v, d.empresa_id)) {
    return {
      ok: false,
      cotizacionId: null,
      error: "Sin permiso para crear cotizaciones en esta empresa.",
    };
  }
  const supabase = createClient();

  // Generar número (RPC nuevo, no está en types regenerados todavía)
  const { data: numeroData } = await (
    supabase.rpc as unknown as (
      fn: string,
      args?: Record<string, unknown>,
    ) => Promise<{ data: string | null; error: unknown }>
  )("generar_numero_cotizacion", { p_empresa_id: d.empresa_id });
  const numero = numeroData ?? `CO-${Date.now()}`;

  const { data: nueva, error } = await supabase
    .from("cotizaciones")
    .insert({
      empresa_id: d.empresa_id,
      cliente_id: d.cliente_id,
      oportunidad_id: d.oportunidad_id,
      numero,
      version: 1,
      fecha_emision: d.fecha_emision,
      vigencia_dias: d.vigencia_dias,
      descuento: d.descuento_global,
      retenciones: d.retenciones,
      condiciones_pago: d.condiciones_pago,
      notas: d.notas,
      origen: "sistema",
      estado: "borrador",
    })
    .select("id")
    .single();
  if (error || !nueva) {
    return {
      ok: false,
      cotizacionId: null,
      error: error?.message ?? "Error al crear cotización.",
    };
  }

  // Insertar conceptos (el trigger recalcula los totales)
  const conceptosPayload = d.conceptos.map((c) => ({
    cotizacion_id: nueva.id,
    orden: c.orden,
    clave_sat: c.clave_sat,
    descripcion: c.descripcion,
    cantidad: c.cantidad,
    unidad_sat: c.unidad_sat,
    precio_unitario: c.precio_unitario,
    descuento: c.descuento,
    importe: c.cantidad * c.precio_unitario,
    iva_tasa: c.iva_tasa,
    observaciones: c.observaciones,
  }));
  const { error: errC } = await supabase
    .from("cotizaciones_conceptos")
    .insert(conceptosPayload);
  if (errC) {
    // Rollback de la cotización
    await supabase.from("cotizaciones").delete().eq("id", nueva.id);
    return {
      ok: false,
      cotizacionId: null,
      error: `Error en conceptos: ${errC.message}`,
    };
  }

  revalidatePath("/comercial/cotizaciones");
  return { ok: true, cotizacionId: nueva.id, error: null };
}

export async function actualizarCotizacion(
  cotizacionId: string,
  _prev: CotizacionState,
  formData: FormData,
): Promise<CotizacionState> {
  const conceptos = parseConceptosFromForm(formData);
  const parsed = CotizacionFormSchema.safeParse({
    empresa_id: formData.get("empresa_id"),
    cliente_id: formData.get("cliente_id"),
    oportunidad_id: formData.get("oportunidad_id") || undefined,
    fecha_emision: formData.get("fecha_emision"),
    vigencia_dias: formData.get("vigencia_dias") ?? 30,
    descuento_global: formData.get("descuento_global") ?? 0,
    retenciones: formData.get("retenciones") ?? 0,
    condiciones_pago: formData.get("condiciones_pago") || undefined,
    notas: formData.get("notas") || undefined,
    conceptos,
  });
  if (!parsed.success) {
    return {
      ok: false,
      cotizacionId,
      error: parsed.error.issues.map((i) => i.message).join("; "),
    };
  }
  const d = parsed.data;
  const supabase = createClient();
  const { data: actual } = await supabase
    .from("cotizaciones")
    .select("empresa_id, estado")
    .eq("id", cotizacionId)
    .maybeSingle();
  if (!actual) {
    return { ok: false, cotizacionId, error: "Cotización no encontrada." };
  }
  if (!["borrador", "vencida"].includes(actual.estado as string)) {
    return {
      ok: false,
      cotizacionId,
      error: "Solo se editan en borrador o vencidas.",
    };
  }
  const v = await obtenerVinculos();
  if (!gateCotizar(v, actual.empresa_id)) {
    return { ok: false, cotizacionId, error: "Sin permiso." };
  }

  const { error } = await supabase
    .from("cotizaciones")
    .update({
      cliente_id: d.cliente_id,
      oportunidad_id: d.oportunidad_id,
      fecha_emision: d.fecha_emision,
      vigencia_dias: d.vigencia_dias,
      fecha_vencimiento: null, // trigger recalcula
      descuento: d.descuento_global,
      retenciones: d.retenciones,
      condiciones_pago: d.condiciones_pago,
      notas: d.notas,
    })
    .eq("id", cotizacionId);
  if (error) return { ok: false, cotizacionId, error: error.message };

  // Reemplazar conceptos
  await supabase
    .from("cotizaciones_conceptos")
    .delete()
    .eq("cotizacion_id", cotizacionId);

  const { error: errC } = await supabase.from("cotizaciones_conceptos").insert(
    d.conceptos.map((c) => ({
      cotizacion_id: cotizacionId,
      orden: c.orden,
      clave_sat: c.clave_sat,
      descripcion: c.descripcion,
      cantidad: c.cantidad,
      unidad_sat: c.unidad_sat,
      precio_unitario: c.precio_unitario,
      descuento: c.descuento,
      importe: c.cantidad * c.precio_unitario,
      iva_tasa: c.iva_tasa,
      observaciones: c.observaciones,
    })),
  );
  if (errC) return { ok: false, cotizacionId, error: errC.message };

  revalidatePath("/comercial/cotizaciones");
  revalidatePath(`/comercial/cotizaciones/${cotizacionId}`);
  return { ok: true, cotizacionId, error: null };
}

export async function aprobarInternamente(
  cotizacionId: string,
): Promise<{ ok: boolean; error: string | null }> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sin sesión." };
  const { data: c } = await supabase
    .from("cotizaciones")
    .select("empresa_id, estado")
    .eq("id", cotizacionId)
    .maybeSingle();
  if (!c) return { ok: false, error: "No encontrada." };
  if (c.estado !== "borrador") {
    return { ok: false, error: "Solo borradores se aprueban internamente." };
  }
  const v = await obtenerVinculos();
  if (!esCEO(v) && !esRolEn(v, c.empresa_id, "director")) {
    return { ok: false, error: "Solo CEO o director aprueban." };
  }
  const { error } = await supabase
    .from("cotizaciones")
    .update({ aprobada_internamente: true, aprobada_por: user.id })
    .eq("id", cotizacionId);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/comercial/cotizaciones/${cotizacionId}`);
  return { ok: true, error: null };
}

export async function enviarACliente(
  cotizacionId: string,
): Promise<{ ok: boolean; error: string | null }> {
  const supabase = createClient();
  const { data: c } = await supabase
    .from("cotizaciones")
    .select("empresa_id, estado, aprobada_internamente")
    .eq("id", cotizacionId)
    .maybeSingle();
  if (!c) return { ok: false, error: "No encontrada." };
  if (c.estado !== "borrador") {
    return { ok: false, error: "Solo borradores se envían." };
  }
  const v = await obtenerVinculos();
  if (!gateCotizar(v, c.empresa_id)) {
    return { ok: false, error: "Sin permiso." };
  }
  const { error } = await supabase
    .from("cotizaciones")
    .update({
      estado: "enviada",
      enviada_a_cliente: true,
      fecha_envio: new Date().toISOString(),
    })
    .eq("id", cotizacionId);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/comercial/cotizaciones/${cotizacionId}`);
  revalidatePath("/comercial/cotizaciones");
  return { ok: true, error: null };
}

export async function marcarAceptada(
  cotizacionId: string,
  fechaAceptacion?: string,
): Promise<{ ok: boolean; error: string | null }> {
  const supabase = createClient();
  const { data: c } = await supabase
    .from("cotizaciones")
    .select("empresa_id, estado")
    .eq("id", cotizacionId)
    .maybeSingle();
  if (!c) return { ok: false, error: "No encontrada." };
  if (!["enviada", "borrador"].includes(c.estado as string)) {
    return { ok: false, error: "Estado no permite aceptación." };
  }
  const v = await obtenerVinculos();
  if (!gateCotizar(v, c.empresa_id)) {
    return { ok: false, error: "Sin permiso." };
  }
  const { error } = await supabase
    .from("cotizaciones")
    .update({
      estado: "aceptada",
      fecha_aceptacion: fechaAceptacion ?? new Date().toISOString().slice(0, 10),
    })
    .eq("id", cotizacionId);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/comercial/cotizaciones/${cotizacionId}`);
  revalidatePath("/comercial/cotizaciones");
  return { ok: true, error: null };
}

export async function marcarRechazada(
  cotizacionId: string,
  motivo: string,
): Promise<{ ok: boolean; error: string | null }> {
  const supabase = createClient();
  const { data: c } = await supabase
    .from("cotizaciones")
    .select("empresa_id, estado")
    .eq("id", cotizacionId)
    .maybeSingle();
  if (!c) return { ok: false, error: "No encontrada." };
  if (!["enviada", "borrador"].includes(c.estado as string)) {
    return { ok: false, error: "Estado no permite rechazo." };
  }
  const v = await obtenerVinculos();
  if (!gateCotizar(v, c.empresa_id)) {
    return { ok: false, error: "Sin permiso." };
  }
  const { error } = await supabase
    .from("cotizaciones")
    .update({
      estado: "rechazada",
      notas: motivo
        ? `Motivo rechazo: ${motivo}`
        : null,
    })
    .eq("id", cotizacionId);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/comercial/cotizaciones/${cotizacionId}`);
  return { ok: true, error: null };
}

/**
 * Convierte una cotización aceptada en proyecto.
 * Devuelve el id del proyecto creado para que la UI redirija.
 */
export async function convertirAProyecto(
  cotizacionId: string,
  formData: FormData,
): Promise<{ ok: boolean; error: string | null; proyectoId: string | null }> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return { ok: false, error: "Sin sesión.", proyectoId: null };

  const { data: c } = await supabase
    .from("cotizaciones")
    .select(
      "id, empresa_id, cliente_id, numero, total, notas, fecha_emision, estado",
    )
    .eq("id", cotizacionId)
    .maybeSingle();
  if (!c) return { ok: false, error: "No encontrada.", proyectoId: null };
  if (c.estado !== "aceptada") {
    return {
      ok: false,
      error: "Solo cotizaciones aceptadas se convierten.",
      proyectoId: null,
    };
  }
  const v = await obtenerVinculos();
  if (!gateCotizar(v, c.empresa_id)) {
    return { ok: false, error: "Sin permiso.", proyectoId: null };
  }

  const codigo = (formData.get("codigo") as string)?.trim();
  const nombre = (formData.get("nombre") as string)?.trim();
  const tipo = (formData.get("tipo") as string)?.trim();
  const fechaInicio = (formData.get("fecha_inicio_planeado") as string) || null;
  const fechaFin = (formData.get("fecha_fin_planeado") as string) || null;
  const presupuestoCosto = formData.get("presupuesto_costo");

  if (!codigo || !nombre) {
    return {
      ok: false,
      error: "Falta código o nombre del proyecto.",
      proyectoId: null,
    };
  }

  const { data: nuevo, error } = await supabase
    .from("proyectos")
    .insert({
      empresa_id: c.empresa_id,
      cliente_id: c.cliente_id,
      codigo,
      nombre,
      descripcion: c.notas,
      tipo: (tipo || "otro") as never,
      estado: "contrato_firmado",
      fecha_contrato: new Date().toISOString().slice(0, 10),
      fecha_inicio_planeado: fechaInicio,
      fecha_fin_planeado: fechaFin,
      monto_contratado: c.total,
      presupuesto_costo: presupuestoCosto
        ? parseFloat(presupuestoCosto as string)
        : null,
      // Marca visible default = empresa que opera
      marca_visible_id: c.empresa_id,
      semaforo: "verde",
      activo: true,
    })
    .select("id")
    .single();
  if (error || !nuevo) {
    return {
      ok: false,
      error: error?.message ?? "Error al crear proyecto.",
      proyectoId: null,
    };
  }

  // Marcar cotización como convertida
  await supabase
    .from("cotizaciones")
    .update({ estado: "convertida" })
    .eq("id", cotizacionId);

  revalidatePath(`/comercial/cotizaciones/${cotizacionId}`);
  revalidatePath("/proyectos");
  return { ok: true, error: null, proyectoId: nuevo.id };
}

export async function eliminarBorrador(
  cotizacionId: string,
): Promise<{ ok: boolean; error: string | null }> {
  const supabase = createClient();
  const { data: c } = await supabase
    .from("cotizaciones")
    .select("empresa_id, estado")
    .eq("id", cotizacionId)
    .maybeSingle();
  if (!c) return { ok: false, error: "No encontrada." };
  if (c.estado !== "borrador") {
    return { ok: false, error: "Solo borradores se eliminan." };
  }
  const v = await obtenerVinculos();
  if (!gateCotizar(v, c.empresa_id)) {
    return { ok: false, error: "Sin permiso." };
  }
  const { error } = await supabase
    .from("cotizaciones")
    .delete()
    .eq("id", cotizacionId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/comercial/cotizaciones");
  return { ok: true, error: null };
}

export async function nuevaVersion(
  cotizacionId: string,
): Promise<{
  ok: boolean;
  error: string | null;
  nuevaCotizacionId: string | null;
}> {
  const supabase = createClient();
  const { data: c } = await supabase
    .from("cotizaciones")
    .select("*")
    .eq("id", cotizacionId)
    .maybeSingle();
  if (!c)
    return { ok: false, error: "No encontrada.", nuevaCotizacionId: null };
  const v = await obtenerVinculos();
  if (!gateCotizar(v, c.empresa_id)) {
    return { ok: false, error: "Sin permiso.", nuevaCotizacionId: null };
  }
  const { data: conceptos } = await supabase
    .from("cotizaciones_conceptos")
    .select("*")
    .eq("cotizacion_id", cotizacionId)
    .order("orden");

  const { data: nueva, error } = await supabase
    .from("cotizaciones")
    .insert({
      empresa_id: c.empresa_id,
      cliente_id: c.cliente_id,
      oportunidad_id: c.oportunidad_id,
      numero: c.numero,
      version: (c.version ?? 1) + 1,
      fecha_emision: new Date().toISOString().slice(0, 10),
      vigencia_dias: c.vigencia_dias,
      descuento: c.descuento,
      retenciones: c.retenciones,
      condiciones_pago: c.condiciones_pago,
      notas: c.notas,
      origen: c.origen,
      estado: "borrador",
    })
    .select("id")
    .single();
  if (error || !nueva) {
    return {
      ok: false,
      error: error?.message ?? "Error.",
      nuevaCotizacionId: null,
    };
  }

  if (conceptos && conceptos.length > 0) {
    await supabase.from("cotizaciones_conceptos").insert(
      conceptos.map((cc) => ({
        cotizacion_id: nueva.id,
        orden: cc.orden,
        clave_sat: cc.clave_sat,
        descripcion: cc.descripcion,
        cantidad: cc.cantidad,
        unidad_sat: cc.unidad_sat,
        precio_unitario: cc.precio_unitario,
        descuento: cc.descuento,
        importe: cc.importe,
        iva_tasa: cc.iva_tasa,
        observaciones: cc.observaciones,
      })),
    );
  }

  revalidatePath("/comercial/cotizaciones");
  return { ok: true, error: null, nuevaCotizacionId: nueva.id };
}
