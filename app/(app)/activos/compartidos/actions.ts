"use server";

import { revalidatePath } from "next/cache";

import {
  esCEO,
  esRolEn,
  obtenerVinculos,
  tieneAtributo,
} from "@/lib/auth/permisos";
import {
  AgregarCostoAnualSchema,
  AgregarDocumentoSchema,
  CrearActivoSchema,
  RegistrarCalibracionSchema,
  RegistrarMantenimientoSchema,
} from "@/lib/activos-compartidos/schemas";
import {
  initialActivoState,
  type ActivoState,
} from "@/lib/activos-compartidos/state";
import { createClient } from "@/lib/supabase/server";

async function gateActivoEmpresa(empresaId: string): Promise<boolean> {
  const v = await obtenerVinculos();
  if (esCEO(v)) return true;
  if (esRolEn(v, empresaId, ["director"])) return true;
  // Atributo contralor en la empresa propietaria
  return v.some(
    (vi) =>
      vi.empresa_id === empresaId &&
      
      (vi.atributos ?? []).includes("contralor"),
  );
}

function addMonths(dateStr: string | null, months: number | null): string | null {
  if (!dateStr || !months) return null;
  const d = new Date(dateStr);
  d.setMonth(d.getMonth() + months);
  return d.toISOString().slice(0, 10);
}

export async function crearActivo(
  _prev: ActivoState,
  formData: FormData,
): Promise<ActivoState> {
  const obj: Record<string, unknown> = {};
  formData.forEach((v, k) => {
    obj[k] = typeof v === "string" ? v : v;
  });

  // Boolean checkboxes
  obj.requiere_calibracion = formData.get("requiere_calibracion") === "on";
  obj.requiere_mantenimiento_preventivo =
    formData.get("requiere_mantenimiento_preventivo") === "on";

  const parsed = CrearActivoSchema.safeParse(obj);
  if (!parsed.success) {
    return {
      ok: false,
      id: null,
      error: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "),
    };
  }
  const d = parsed.data;

  if (!(await gateActivoEmpresa(d.empresa_propietaria_id))) {
    return { ok: false, id: null, error: "Sin permiso (requiere CEO, director o contralor de la empresa propietaria)." };
  }

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ...initialActivoState, error: "Sin sesión." };

  const insertPayload: Record<string, unknown> = {
    codigo: d.codigo,
    nombre: d.nombre,
    descripcion: d.descripcion,
    tipo: d.tipo,
    marca: d.marca,
    modelo: d.modelo,
    numero_serie: d.numero_serie,
    anio_fabricacion: d.anio_fabricacion ?? null,
    capacidad: d.capacidad,
    empresa_propietaria_id: d.empresa_propietaria_id,
    fecha_adquisicion: d.fecha_adquisicion,
    costo_adquisicion: d.costo_adquisicion,
    proveedor_id: d.proveedor_id,
    vida_util_anios: d.vida_util_anios,
    valor_residual_pct: d.valor_residual_pct,
    unidad_uso: d.unidad_uso,
    uso_estimado_anual: d.uso_estimado_anual,
    margen_administracion_pct: d.margen_administracion_pct,
    tarifa_manual: d.tarifa_manual ?? null,
    estado: d.estado,
    ubicacion_actual_empresa_id: d.ubicacion_actual_empresa_id,
    ubicacion_actual_descripcion: d.ubicacion_actual_descripcion,
    requiere_calibracion: d.requiere_calibracion,
    frecuencia_calibracion_meses: d.frecuencia_calibracion_meses ?? null,
    fecha_ultima_calibracion: d.fecha_ultima_calibracion,
    fecha_proxima_calibracion: addMonths(d.fecha_ultima_calibracion, d.frecuencia_calibracion_meses ?? null),
    laboratorio_calibracion: d.laboratorio_calibracion,
    requiere_mantenimiento_preventivo: d.requiere_mantenimiento_preventivo,
    frecuencia_mantenimiento_meses: d.frecuencia_mantenimiento_meses,
    fecha_ultimo_mantenimiento: d.fecha_ultimo_mantenimiento,
    fecha_proximo_mantenimiento: addMonths(d.fecha_ultimo_mantenimiento, d.frecuencia_mantenimiento_meses),
    numero_poliza_seguro: d.numero_poliza_seguro,
    vigencia_seguro_hasta: d.vigencia_seguro_hasta,
    costo_anual_seguro: d.costo_anual_seguro ?? null,
    observaciones: d.observaciones,
  };

  const { data, error } = await supabase
    .from("activos_grupo" as never)
    .insert(insertPayload as never)
    .select("id")
    .single();
  if (error) return { ok: false, id: null, error: error.message };

  // Crear costo del año actual con depreciación
  const anioActual = new Date().getFullYear();
  const depreciacion =
    (d.costo_adquisicion * (1 - d.valor_residual_pct / 100)) / d.vida_util_anios;
  await supabase.from("activos_grupo_costos_anuales" as never).insert({
    activo_id: (data as { id: string }).id,
    anio: anioActual,
    depreciacion,
    seguro: d.costo_anual_seguro ?? 0,
  } as never);

  revalidatePath("/activos/compartidos");
  return { ok: true, id: (data as { id: string }).id, error: null };
}

export async function actualizarActivo(
  activoId: string,
  formData: FormData,
): Promise<{ ok: boolean; error: string | null }> {
  const supabase = createClient();
  const { data: existing } = (await supabase
    .from("activos_grupo" as never)
    .select("empresa_propietaria_id, costo_adquisicion" as never)
    .eq("id", activoId)
    .maybeSingle()) as unknown as {
    data: { empresa_propietaria_id: string; costo_adquisicion: number } | null;
  };
  if (!existing) return { ok: false, error: "Activo no encontrado." };
  if (!(await gateActivoEmpresa(existing.empresa_propietaria_id))) {
    return { ok: false, error: "Sin permiso." };
  }
  const v = await obtenerVinculos();

  const obj: Record<string, unknown> = {};
  formData.forEach((val, k) => {
    obj[k] = val;
  });
  obj.requiere_calibracion = formData.get("requiere_calibracion") === "on";
  obj.requiere_mantenimiento_preventivo =
    formData.get("requiere_mantenimiento_preventivo") === "on";

  const parsed = CrearActivoSchema.safeParse(obj);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues.map((i) => i.message).join("; ") };
  }
  const d = parsed.data;

  // Costo de adquisición solo lo cambia el CEO
  if (
    Number(d.costo_adquisicion) !== Number(existing.costo_adquisicion) &&
    !esCEO(v)
  ) {
    return { ok: false, error: "Solo el CEO puede modificar el costo de adquisición." };
  }

  const { error } = await supabase
    .from("activos_grupo" as never)
    .update({
      codigo: d.codigo,
      nombre: d.nombre,
      descripcion: d.descripcion,
      tipo: d.tipo,
      marca: d.marca,
      modelo: d.modelo,
      numero_serie: d.numero_serie,
      anio_fabricacion: d.anio_fabricacion ?? null,
      capacidad: d.capacidad,
      empresa_propietaria_id: d.empresa_propietaria_id,
      fecha_adquisicion: d.fecha_adquisicion,
      costo_adquisicion: d.costo_adquisicion,
      proveedor_id: d.proveedor_id,
      vida_util_anios: d.vida_util_anios,
      valor_residual_pct: d.valor_residual_pct,
      unidad_uso: d.unidad_uso,
      uso_estimado_anual: d.uso_estimado_anual,
      margen_administracion_pct: d.margen_administracion_pct,
      tarifa_manual: d.tarifa_manual ?? null,
      estado: d.estado,
      ubicacion_actual_empresa_id: d.ubicacion_actual_empresa_id,
      ubicacion_actual_descripcion: d.ubicacion_actual_descripcion,
      requiere_calibracion: d.requiere_calibracion,
      frecuencia_calibracion_meses: d.frecuencia_calibracion_meses ?? null,
      fecha_ultima_calibracion: d.fecha_ultima_calibracion,
      fecha_proxima_calibracion: addMonths(
        d.fecha_ultima_calibracion,
        d.frecuencia_calibracion_meses ?? null,
      ),
      laboratorio_calibracion: d.laboratorio_calibracion,
      requiere_mantenimiento_preventivo: d.requiere_mantenimiento_preventivo,
      frecuencia_mantenimiento_meses: d.frecuencia_mantenimiento_meses,
      fecha_ultimo_mantenimiento: d.fecha_ultimo_mantenimiento,
      fecha_proximo_mantenimiento: addMonths(
        d.fecha_ultimo_mantenimiento,
        d.frecuencia_mantenimiento_meses,
      ),
      numero_poliza_seguro: d.numero_poliza_seguro,
      vigencia_seguro_hasta: d.vigencia_seguro_hasta,
      costo_anual_seguro: d.costo_anual_seguro ?? null,
      observaciones: d.observaciones,
    } as never)
    .eq("id", activoId);

  if (error) return { ok: false, error: error.message };
  revalidatePath("/activos/compartidos");
  revalidatePath(`/activos/compartidos/${activoId}`);
  return { ok: true, error: null };
}

export async function registrarMantenimiento(formData: FormData) {
  const parsed = RegistrarMantenimientoSchema.safeParse({
    activo_id: formData.get("activo_id"),
    fecha: formData.get("fecha"),
    monto: formData.get("monto") || undefined,
    observaciones: formData.get("observaciones") || undefined,
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues.map((i) => i.message).join("; ") };
  }
  const d = parsed.data;

  const supabase = createClient();
  const { data: act } = (await supabase
    .from("activos_grupo" as never)
    .select("empresa_propietaria_id, frecuencia_mantenimiento_meses" as never)
    .eq("id", d.activo_id)
    .maybeSingle()) as unknown as {
    data: { empresa_propietaria_id: string; frecuencia_mantenimiento_meses: number | null } | null;
  };
  if (!act) return { ok: false, error: "Activo no encontrado." };
  if (!(await gateActivoEmpresa(act.empresa_propietaria_id))) {
    return { ok: false, error: "Sin permiso." };
  }

  const proxima = addMonths(d.fecha, act.frecuencia_mantenimiento_meses);
  await supabase
    .from("activos_grupo" as never)
    .update({
      fecha_ultimo_mantenimiento: d.fecha,
      fecha_proximo_mantenimiento: proxima,
    } as never)
    .eq("id", d.activo_id);

  // Sumar al costo anual
  if (d.monto && d.monto > 0) {
    const anio = parseInt(d.fecha.slice(0, 4), 10);
    const { data: existing } = (await supabase
      .from("activos_grupo_costos_anuales" as never)
      .select("id, mantenimiento" as never)
      .eq("activo_id", d.activo_id)
      .eq("anio", anio)
      .maybeSingle()) as unknown as {
      data: { id: string; mantenimiento: number | null } | null;
    };
    if (existing) {
      await supabase
        .from("activos_grupo_costos_anuales" as never)
        .update({ mantenimiento: Number(existing.mantenimiento ?? 0) + d.monto } as never)
        .eq("id", existing.id);
    } else {
      await supabase
        .from("activos_grupo_costos_anuales" as never)
        .insert({ activo_id: d.activo_id, anio, mantenimiento: d.monto } as never);
    }
  }

  revalidatePath(`/activos/compartidos/${d.activo_id}`);
  return { ok: true, error: null };
}

export async function registrarCalibracion(formData: FormData) {
  const parsed = RegistrarCalibracionSchema.safeParse({
    activo_id: formData.get("activo_id"),
    fecha: formData.get("fecha"),
    monto: formData.get("monto") || undefined,
    laboratorio: formData.get("laboratorio") || undefined,
    observaciones: formData.get("observaciones") || undefined,
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues.map((i) => i.message).join("; ") };
  }
  const d = parsed.data;

  const supabase = createClient();
  const { data: act } = (await supabase
    .from("activos_grupo" as never)
    .select("empresa_propietaria_id, frecuencia_calibracion_meses" as never)
    .eq("id", d.activo_id)
    .maybeSingle()) as unknown as {
    data: { empresa_propietaria_id: string; frecuencia_calibracion_meses: number | null } | null;
  };
  if (!act) return { ok: false, error: "Activo no encontrado." };
  if (!(await gateActivoEmpresa(act.empresa_propietaria_id))) {
    return { ok: false, error: "Sin permiso." };
  }

  const proxima = addMonths(d.fecha, act.frecuencia_calibracion_meses);
  await supabase
    .from("activos_grupo" as never)
    .update({
      fecha_ultima_calibracion: d.fecha,
      fecha_proxima_calibracion: proxima,
      laboratorio_calibracion: d.laboratorio,
    } as never)
    .eq("id", d.activo_id);

  if (d.monto && d.monto > 0) {
    const anio = parseInt(d.fecha.slice(0, 4), 10);
    const { data: existing } = (await supabase
      .from("activos_grupo_costos_anuales" as never)
      .select("id, calibraciones" as never)
      .eq("activo_id", d.activo_id)
      .eq("anio", anio)
      .maybeSingle()) as unknown as {
      data: { id: string; calibraciones: number | null } | null;
    };
    if (existing) {
      await supabase
        .from("activos_grupo_costos_anuales" as never)
        .update({ calibraciones: Number(existing.calibraciones ?? 0) + d.monto } as never)
        .eq("id", existing.id);
    } else {
      await supabase
        .from("activos_grupo_costos_anuales" as never)
        .insert({ activo_id: d.activo_id, anio, calibraciones: d.monto } as never);
    }
  }

  revalidatePath(`/activos/compartidos/${d.activo_id}`);
  return { ok: true, error: null };
}

export async function agregarCostoAnual(formData: FormData) {
  const parsed = AgregarCostoAnualSchema.safeParse({
    activo_id: formData.get("activo_id"),
    anio: formData.get("anio"),
    depreciacion: formData.get("depreciacion") || undefined,
    mantenimiento: formData.get("mantenimiento") || 0,
    calibraciones: formData.get("calibraciones") || 0,
    seguro: formData.get("seguro") || 0,
    refacciones: formData.get("refacciones") || 0,
    otros: formData.get("otros") || 0,
    observaciones: formData.get("observaciones") || undefined,
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues.map((i) => i.message).join("; ") };
  }
  const d = parsed.data;

  const supabase = createClient();
  const { data: act } = (await supabase
    .from("activos_grupo" as never)
    .select("empresa_propietaria_id, costo_adquisicion, vida_util_anios, valor_residual_pct" as never)
    .eq("id", d.activo_id)
    .maybeSingle()) as unknown as {
    data: { empresa_propietaria_id: string; costo_adquisicion: number; vida_util_anios: number; valor_residual_pct: number } | null;
  };
  if (!act) return { ok: false, error: "Activo no encontrado." };
  if (!(await gateActivoEmpresa(act.empresa_propietaria_id))) {
    return { ok: false, error: "Sin permiso." };
  }

  const dep =
    d.depreciacion ??
    (act.costo_adquisicion * (1 - act.valor_residual_pct / 100)) / act.vida_util_anios;

  const { error } = await supabase
    .from("activos_grupo_costos_anuales" as never)
    .upsert(
      {
        activo_id: d.activo_id,
        anio: d.anio,
        depreciacion: dep,
        mantenimiento: d.mantenimiento,
        calibraciones: d.calibraciones,
        seguro: d.seguro,
        refacciones: d.refacciones,
        otros: d.otros,
        observaciones: d.observaciones,
      } as never,
      { onConflict: "activo_id,anio" },
    );
  if (error) return { ok: false, error: error.message };

  revalidatePath(`/activos/compartidos/${d.activo_id}`);
  return { ok: true, error: null };
}

export async function darDeBajaActivo(activoId: string, motivo: string) {
  if (!motivo || motivo.trim().length < 5) {
    return { ok: false, error: "Motivo requerido (mínimo 5 caracteres)." };
  }
  const supabase = createClient();
  const { data: act } = (await supabase
    .from("activos_grupo" as never)
    .select("empresa_propietaria_id" as never)
    .eq("id", activoId)
    .maybeSingle()) as unknown as {
    data: { empresa_propietaria_id: string } | null;
  };
  if (!act) return { ok: false, error: "No encontrado." };
  if (!(await gateActivoEmpresa(act.empresa_propietaria_id))) {
    return { ok: false, error: "Sin permiso." };
  }
  const { error } = await supabase
    .from("activos_grupo" as never)
    .update({ activo: false, estado: "baja", observaciones: `BAJA: ${motivo}` } as never)
    .eq("id", activoId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/activos/compartidos");
  return { ok: true, error: null };
}

export async function agregarDocumento(formData: FormData) {
  const parsed = AgregarDocumentoSchema.safeParse({
    activo_id: formData.get("activo_id"),
    tipo_documento: formData.get("tipo_documento"),
    nombre: formData.get("nombre"),
    url: formData.get("url"),
    fecha_documento: formData.get("fecha_documento") || undefined,
    vencimiento: formData.get("vencimiento") || undefined,
    observaciones: formData.get("observaciones") || undefined,
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues.map((i) => i.message).join("; ") };
  }
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sin sesión." };

  const { error } = await supabase
    .from("activos_grupo_documentos" as never)
    .insert({
      activo_id: parsed.data.activo_id,
      tipo_documento: parsed.data.tipo_documento,
      nombre: parsed.data.nombre,
      url: parsed.data.url,
      fecha_documento: parsed.data.fecha_documento,
      vencimiento: parsed.data.vencimiento,
      observaciones: parsed.data.observaciones,
      subido_por: user.id,
    } as never);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/activos/compartidos/${parsed.data.activo_id}`);
  return { ok: true, error: null };
}
