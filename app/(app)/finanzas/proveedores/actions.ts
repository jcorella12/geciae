"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { obtenerVinculos, puedeGestionarProveedores } from "@/lib/auth/permisos";
import { ProveedorFormSchema } from "@/lib/proveedores/schemas";
import type { ProveedorState } from "@/lib/proveedores/state";
import { createClient } from "@/lib/supabase/server";

function parseFormData(formData: FormData) {
  return {
    razon_social: formData.get("razon_social"),
    nombre_comercial: formData.get("nombre_comercial") || undefined,
    rfc: formData.get("rfc"),
    curp: formData.get("curp") || undefined,
    regimen_fiscal: formData.get("regimen_fiscal"),
    cp_fiscal: formData.get("cp_fiscal"),
    direccion_fiscal: {
      calle: formData.get("calle") || "",
      numero_exterior: formData.get("numero_exterior") || "",
      numero_interior: formData.get("numero_interior") || "",
      colonia: formData.get("colonia") || "",
      municipio: formData.get("municipio") || "",
      estado: formData.get("estado") || undefined,
      pais: formData.get("pais") || "México",
    },
    representante_legal: formData.get("representante_legal") || undefined,
    rfc_representante: formData.get("rfc_representante") || undefined,
    tipo_proveedor: formData.get("tipo_proveedor") || undefined,
    categoria_sat: formData.get("categoria_sat") || undefined,
    clasificacion_interna: formData.get("clasificacion_interna") || undefined,
    requiere_repse: formData.get("requiere_repse") === "on",
    cuenta_bancaria: {
      clabe: formData.get("clabe") || "",
      banco: formData.get("banco") || "",
      titular: formData.get("titular") || "",
    },
    semaforo: formData.get("semaforo") || "verde",
    esta_aprobado: formData.get("esta_aprobado") === "on",
    fecha_aprobacion: formData.get("fecha_aprobacion") || undefined,
    observaciones: formData.get("observaciones") || undefined,
    empresaIds: formData.getAll("empresaIds") as string[],
  };
}

async function gate(): Promise<{ ok: true } | { ok: false; error: string }> {
  const v = await obtenerVinculos();
  if (!puedeGestionarProveedores(v)) {
    return {
      ok: false,
      error:
        "No tienes permiso para gestionar proveedores (requiere rol CEO, Director u Operativo).",
    };
  }
  return { ok: true };
}

export async function createProveedor(
  _prev: ProveedorState,
  formData: FormData,
): Promise<ProveedorState> {
  const g = await gate();
  if (!g.ok) return { ok: false, error: g.error };

  const parsed = ProveedorFormSchema.safeParse(parseFormData(formData));
  if (!parsed.success) {
    return {
      ok: false,
      error: "Revisa los campos marcados.",
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }
  const d = parsed.data;

  const supabase = createClient();

  const cuenta = d.cuenta_bancaria;
  const cuentaJson =
    cuenta && (cuenta.clabe || cuenta.banco || cuenta.titular)
      ? cuenta
      : null;

  const { data: nuevo, error: insertErr } = await supabase
    .from("proveedores")
    .insert({
      razon_social: d.razon_social,
      nombre_comercial: d.nombre_comercial,
      rfc: d.rfc,
      curp: d.curp,
      regimen_fiscal: d.regimen_fiscal,
      cp_fiscal: d.cp_fiscal,
      direccion_fiscal: (d.direccion_fiscal ?? null) as never,
      representante_legal: d.representante_legal,
      rfc_representante: d.rfc_representante,
      tipo_proveedor: d.tipo_proveedor,
      categoria_sat: d.categoria_sat,
      clasificacion_interna: d.clasificacion_interna,
      requiere_repse: d.requiere_repse,
      cuenta_bancaria: cuentaJson as never,
      semaforo: d.semaforo,
      esta_aprobado: d.esta_aprobado,
      fecha_aprobacion: d.fecha_aprobacion,
      observaciones: d.observaciones,
      activo: true,
    })
    .select("id")
    .single();

  if (insertErr || !nuevo) {
    return {
      ok: false,
      error: insertErr?.message?.includes("duplicate")
        ? "Ya existe un proveedor con ese RFC."
        : `Error al guardar: ${insertErr?.message ?? "desconocido"}`,
    };
  }

  if (d.empresaIds.length > 0) {
    await supabase.from("proveedores_empresas").insert(
      d.empresaIds.map((empresa_id) => ({
        proveedor_id: nuevo.id,
        empresa_id,
      })),
    );
  }

  revalidatePath("/finanzas/proveedores");
  redirect(`/finanzas/proveedores/${nuevo.id}`);
}

export async function updateProveedor(
  proveedorId: string,
  _prev: ProveedorState,
  formData: FormData,
): Promise<ProveedorState> {
  const g = await gate();
  if (!g.ok) return { ok: false, error: g.error };

  const parsed = ProveedorFormSchema.safeParse(parseFormData(formData));
  if (!parsed.success) {
    return {
      ok: false,
      error: "Revisa los campos marcados.",
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }
  const d = parsed.data;
  const supabase = createClient();

  const cuenta = d.cuenta_bancaria;
  const cuentaJson =
    cuenta && (cuenta.clabe || cuenta.banco || cuenta.titular) ? cuenta : null;

  const { error: updateErr } = await supabase
    .from("proveedores")
    .update({
      razon_social: d.razon_social,
      nombre_comercial: d.nombre_comercial,
      rfc: d.rfc,
      curp: d.curp,
      regimen_fiscal: d.regimen_fiscal,
      cp_fiscal: d.cp_fiscal,
      direccion_fiscal: (d.direccion_fiscal ?? null) as never,
      representante_legal: d.representante_legal,
      rfc_representante: d.rfc_representante,
      tipo_proveedor: d.tipo_proveedor,
      categoria_sat: d.categoria_sat,
      clasificacion_interna: d.clasificacion_interna,
      requiere_repse: d.requiere_repse,
      cuenta_bancaria: cuentaJson as never,
      semaforo: d.semaforo,
      esta_aprobado: d.esta_aprobado,
      fecha_aprobacion: d.fecha_aprobacion,
      observaciones: d.observaciones,
      updated_at: new Date().toISOString(),
    })
    .eq("id", proveedorId);

  if (updateErr) {
    return {
      ok: false,
      error: updateErr.message?.includes("duplicate")
        ? "Ya existe otro proveedor con ese RFC."
        : `Error al actualizar: ${updateErr.message}`,
    };
  }

  // Sincronizar empresas vinculadas
  await supabase
    .from("proveedores_empresas")
    .delete()
    .eq("proveedor_id", proveedorId);
  if (d.empresaIds.length > 0) {
    await supabase.from("proveedores_empresas").insert(
      d.empresaIds.map((empresa_id) => ({
        proveedor_id: proveedorId,
        empresa_id,
      })),
    );
  }

  revalidatePath(`/finanzas/proveedores/${proveedorId}`);
  revalidatePath("/finanzas/proveedores");
  redirect(`/finanzas/proveedores/${proveedorId}`);
}

/**
 * Creación rápida de proveedor desde otros formularios (OC, CFDI, gastos).
 * Solo requiere razón social y RFC.
 */
export async function crearProveedorRapido(input: {
  razon_social: string;
  rfc: string;
  nombre_comercial?: string | null;
  email?: string | null;
  empresa_id?: string | null;
}): Promise<{
  ok: boolean;
  error: string | null;
  proveedor?: {
    id: string;
    razon_social: string;
    rfc: string;
    nombre_comercial: string | null;
  };
}> {
  const g = await gate();
  if (!g.ok) return { ok: false, error: g.error };

  const razonSocial = input.razon_social?.trim() ?? "";
  const rfc = input.rfc?.trim().toUpperCase() ?? "";

  if (razonSocial.length < 3)
    return { ok: false, error: "Razón social muy corta." };
  if (rfc.length < 12)
    return { ok: false, error: "RFC inválido (mínimo 12 caracteres)." };

  const supabase = createClient();

  // Si ya existe, devolverlo y vincular si aplica
  const { data: existente } = await supabase
    .from("proveedores")
    .select("id, razon_social, rfc, nombre_comercial")
    .eq("rfc", rfc)
    .maybeSingle();

  if (existente) {
    if (input.empresa_id) {
      await supabase
        .from("proveedores_empresas")
        .insert({
          proveedor_id: existente.id,
          empresa_id: input.empresa_id,
        })
        .select()
        .maybeSingle();
    }
    return { ok: true, error: null, proveedor: existente };
  }

  const { data: nuevo, error: insertErr } = await supabase
    .from("proveedores")
    .insert({
      razon_social: razonSocial,
      nombre_comercial: input.nombre_comercial?.trim() || null,
      rfc,
      semaforo: "verde",
      activo: true,
    })
    .select("id, razon_social, rfc, nombre_comercial")
    .single();

  if (insertErr || !nuevo) {
    return {
      ok: false,
      error: insertErr?.message ?? "Error al crear proveedor",
    };
  }

  if (input.empresa_id) {
    await supabase.from("proveedores_empresas").insert({
      proveedor_id: nuevo.id,
      empresa_id: input.empresa_id,
    });
  }

  revalidatePath("/finanzas/proveedores");
  return { ok: true, error: null, proveedor: nuevo };
}

export async function toggleActivoProveedor(
  proveedorId: string,
  proximo: boolean,
): Promise<{ ok: boolean; error: string | null }> {
  const g = await gate();
  if (!g.ok) return { ok: false, error: g.error };

  const supabase = createClient();
  const { error } = await supabase
    .from("proveedores")
    .update({ activo: proximo, updated_at: new Date().toISOString() })
    .eq("id", proveedorId);

  if (error) return { ok: false, error: error.message };

  revalidatePath(`/finanzas/proveedores/${proveedorId}`);
  revalidatePath("/finanzas/proveedores");
  return { ok: true, error: null };
}

// ============================================================================
// Sprint 1.5 — Archivado
// ============================================================================

/** Archivar un proveedor con motivo opcional. */
export async function archivarProveedor(
  proveedorId: string,
  motivo?: string,
): Promise<{ ok: boolean; error: string | null }> {
  const g = await gate();
  if (!g.ok) return { ok: false, error: g.error };

  const supabase = createClient();
  const { data: usr } = await supabase.auth.getUser();
  // `estado` columna agregada en migración 20260519000000;
  // hasta que se regeneren los types, casteamos para evitar TS error.
  const { error } = await supabase
    .from("proveedores")
    .update({
      estado: "archivado",
      estado_motivo: motivo ?? null,
      estado_modificado_at: new Date().toISOString(),
      estado_modificado_por: usr.user?.id ?? null,
      updated_at: new Date().toISOString(),
    } as never)
    .eq("id", proveedorId);

  if (error) return { ok: false, error: error.message };
  revalidatePath(`/finanzas/proveedores/${proveedorId}`);
  revalidatePath("/finanzas/proveedores");
  return { ok: true, error: null };
}

/** Reactivar un proveedor archivado/inactivo (vuelve a estado='activo'). */
export async function desarchivarProveedor(
  proveedorId: string,
): Promise<{ ok: boolean; error: string | null }> {
  const g = await gate();
  if (!g.ok) return { ok: false, error: g.error };

  const supabase = createClient();
  const { data: usr } = await supabase.auth.getUser();
  const { error } = await supabase
    .from("proveedores")
    .update({
      estado: "activo",
      estado_motivo: null,
      estado_modificado_at: new Date().toISOString(),
      estado_modificado_por: usr.user?.id ?? null,
      updated_at: new Date().toISOString(),
    } as never)
    .eq("id", proveedorId);

  if (error) return { ok: false, error: error.message };
  revalidatePath(`/finanzas/proveedores/${proveedorId}`);
  revalidatePath("/finanzas/proveedores");
  return { ok: true, error: null };
}

/** Archivar varios proveedores a la vez. */
export async function archivarBulkProveedores(
  ids: string[],
  motivo?: string,
): Promise<{ ok: boolean; error: string | null; count?: number }> {
  if (ids.length === 0) return { ok: false, error: "Sin selección" };
  const g = await gate();
  if (!g.ok) return { ok: false, error: g.error };

  const supabase = createClient();
  const { data: usr } = await supabase.auth.getUser();
  const { error, count } = await supabase
    .from("proveedores")
    .update({
      estado: "archivado",
      estado_motivo: motivo ?? null,
      estado_modificado_at: new Date().toISOString(),
      estado_modificado_por: usr.user?.id ?? null,
      updated_at: new Date().toISOString(),
    } as never, { count: "exact" })
    .in("id", ids);

  if (error) return { ok: false, error: error.message };
  revalidatePath("/finanzas/proveedores");
  return { ok: true, error: null, count: count ?? ids.length };
}
