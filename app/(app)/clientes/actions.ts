"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { obtenerVinculos, puedeGestionarClientes } from "@/lib/auth/permisos";
import { ClienteFormSchema } from "@/lib/clientes/schemas";
import type { ClienteState } from "@/lib/clientes/state";
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
    email_facturacion: formData.get("email_facturacion") || undefined,
    uso_cfdi_default: formData.get("uso_cfdi_default") || undefined,
    tipo: formData.get("tipo") || undefined,
    segmento: formData.get("segmento") || undefined,
    riesgo: formData.get("riesgo") || "bajo",
    observaciones: formData.get("observaciones") || undefined,
    empresaIds: formData.getAll("empresaIds") as string[],
  };
}

async function gateGestion(): Promise<{ ok: true } | { ok: false; error: string }> {
  const v = await obtenerVinculos();
  if (!puedeGestionarClientes(v)) {
    return {
      ok: false,
      error: "No tienes permiso para gestionar clientes (requiere rol CEO, Director u Operativo).",
    };
  }
  return { ok: true };
}

export async function createCliente(
  _prev: ClienteState,
  formData: FormData,
): Promise<ClienteState> {
  const gate = await gateGestion();
  if (!gate.ok) return { ok: false, error: gate.error };

  const parsed = ClienteFormSchema.safeParse(parseFormData(formData));
  if (!parsed.success) {
    return {
      ok: false,
      error: "Revisa los campos marcados.",
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }
  const d = parsed.data;

  const supabase = createClient();

  // Insertar cliente.
  const { data: nuevo, error: insertErr } = await supabase
    .from("clientes")
    .insert({
      razon_social: d.razon_social,
      nombre_comercial: d.nombre_comercial,
      rfc: d.rfc,
      curp: d.curp,
      regimen_fiscal: d.regimen_fiscal,
      cp_fiscal: d.cp_fiscal,
      direccion_fiscal: (d.direccion_fiscal ?? null) as never,
      email_facturacion: d.email_facturacion,
      uso_cfdi_default: d.uso_cfdi_default,
      tipo: d.tipo,
      segmento: d.segmento,
      riesgo: d.riesgo,
      observaciones: d.observaciones,
      activo: true,
    })
    .select("id")
    .single();

  if (insertErr || !nuevo) {
    return {
      ok: false,
      error: insertErr?.message?.includes("duplicate")
        ? `Ya existe un cliente con ese RFC.`
        : `Error al guardar: ${insertErr?.message ?? "desconocido"}`,
    };
  }

  // Insertar vínculos a empresas del grupo (si seleccionó alguna).
  if (d.empresaIds.length > 0) {
    const { error: vinErr } = await supabase.from("clientes_empresas").insert(
      d.empresaIds.map((empresa_id) => ({
        cliente_id: nuevo.id,
        empresa_id,
      })),
    );
    if (vinErr) {
      // No revertimos el cliente — el admin lo puede editar.
      return {
        ok: true,
        error: `Cliente creado pero error al vincular empresas: ${vinErr.message}`,
      };
    }
  }

  revalidatePath("/clientes");
  redirect(`/clientes/${nuevo.id}`);
}

export async function updateCliente(
  clienteId: string,
  _prev: ClienteState,
  formData: FormData,
): Promise<ClienteState> {
  const gate = await gateGestion();
  if (!gate.ok) return { ok: false, error: gate.error };

  const parsed = ClienteFormSchema.safeParse(parseFormData(formData));
  if (!parsed.success) {
    return {
      ok: false,
      error: "Revisa los campos marcados.",
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }
  const d = parsed.data;

  const supabase = createClient();

  const { error: updateErr } = await supabase
    .from("clientes")
    .update({
      razon_social: d.razon_social,
      nombre_comercial: d.nombre_comercial,
      rfc: d.rfc,
      curp: d.curp,
      regimen_fiscal: d.regimen_fiscal,
      cp_fiscal: d.cp_fiscal,
      direccion_fiscal: (d.direccion_fiscal ?? null) as never,
      email_facturacion: d.email_facturacion,
      uso_cfdi_default: d.uso_cfdi_default,
      tipo: d.tipo,
      segmento: d.segmento,
      riesgo: d.riesgo,
      observaciones: d.observaciones,
      updated_at: new Date().toISOString(),
    })
    .eq("id", clienteId);

  if (updateErr) {
    return {
      ok: false,
      error: updateErr.message?.includes("duplicate")
        ? "Ya existe otro cliente con ese RFC."
        : `Error al actualizar: ${updateErr.message}`,
    };
  }

  // Sincronizar vínculos con empresas: borrar los actuales, insertar los nuevos.
  await supabase.from("clientes_empresas").delete().eq("cliente_id", clienteId);
  if (d.empresaIds.length > 0) {
    await supabase.from("clientes_empresas").insert(
      d.empresaIds.map((empresa_id) => ({
        cliente_id: clienteId,
        empresa_id,
      })),
    );
  }

  revalidatePath(`/clientes/${clienteId}`);
  revalidatePath("/clientes");
  redirect(`/clientes/${clienteId}`);
}

/**
 * Creación rápida de cliente desde otros formularios (oportunidad, cotización, proyecto).
 * Solo requiere razón social y RFC. El admin puede completar el resto después.
 * Vincula automáticamente con la empresa indicada (clientes_empresas).
 */
export async function crearClienteRapido(input: {
  razon_social: string;
  rfc: string;
  nombre_comercial?: string | null;
  email?: string | null;
  empresa_id?: string | null;
}): Promise<{
  ok: boolean;
  error: string | null;
  cliente?: {
    id: string;
    razon_social: string;
    rfc: string;
    nombre_comercial: string | null;
  };
}> {
  const gate = await gateGestion();
  if (!gate.ok) return { ok: false, error: gate.error };

  const razonSocial = input.razon_social?.trim() ?? "";
  const rfc = input.rfc?.trim().toUpperCase() ?? "";

  if (razonSocial.length < 3)
    return { ok: false, error: "Razón social muy corta." };
  if (rfc.length < 12)
    return { ok: false, error: "RFC inválido (mínimo 12 caracteres)." };

  const supabase = createClient();

  // Si ya existe un cliente con ese RFC, devolverlo en vez de duplicar
  const { data: existente } = await supabase
    .from("clientes")
    .select("id, razon_social, rfc, nombre_comercial")
    .eq("rfc", rfc)
    .maybeSingle();

  if (existente) {
    // Si hay empresa especificada y aún no está vinculado, agregar vínculo
    if (input.empresa_id) {
      await supabase
        .from("clientes_empresas")
        .insert({
          cliente_id: existente.id,
          empresa_id: input.empresa_id,
          activo: true,
        })
        .select()
        .maybeSingle();
    }
    return {
      ok: true,
      error: null,
      cliente: existente,
    };
  }

  const { data: nuevo, error: insertErr } = await supabase
    .from("clientes")
    .insert({
      razon_social: razonSocial,
      nombre_comercial: input.nombre_comercial?.trim() || null,
      rfc,
      email_facturacion: input.email?.trim() || null,
      activo: true,
    })
    .select("id, razon_social, rfc, nombre_comercial")
    .single();

  if (insertErr || !nuevo) {
    return {
      ok: false,
      error: insertErr?.message ?? "Error al crear cliente",
    };
  }

  // Vincular con empresa si se especificó
  if (input.empresa_id) {
    await supabase.from("clientes_empresas").insert({
      cliente_id: nuevo.id,
      empresa_id: input.empresa_id,
      activo: true,
    });
  }

  revalidatePath("/clientes");
  return { ok: true, error: null, cliente: nuevo };
}

export async function toggleActivoCliente(
  clienteId: string,
  proximo: boolean,
): Promise<{ ok: boolean; error: string | null }> {
  const gate = await gateGestion();
  if (!gate.ok) return { ok: false, error: gate.error };

  const supabase = createClient();
  const { error } = await supabase
    .from("clientes")
    .update({ activo: proximo, updated_at: new Date().toISOString() })
    .eq("id", clienteId);

  if (error) return { ok: false, error: error.message };

  revalidatePath(`/clientes/${clienteId}`);
  revalidatePath("/clientes");
  return { ok: true, error: null };
}

// ============================================================================
// Sprint 1.5 — Archivado
// ============================================================================

/** Archivar un cliente con motivo opcional. */
export async function archivarCliente(
  clienteId: string,
  motivo?: string,
): Promise<{ ok: boolean; error: string | null }> {
  const gate = await gateGestion();
  if (!gate.ok) return { ok: false, error: gate.error };

  const supabase = createClient();
  const { data: usr } = await supabase.auth.getUser();
  // `estado` columna agregada en migración 20260519000000;
  // hasta que se regeneren los types, casteamos para evitar TS error.
  const { error } = await supabase
    .from("clientes")
    .update({
      estado: "archivado",
      estado_motivo: motivo ?? null,
      estado_modificado_at: new Date().toISOString(),
      estado_modificado_por: usr.user?.id ?? null,
      updated_at: new Date().toISOString(),
    } as never)
    .eq("id", clienteId);

  if (error) return { ok: false, error: error.message };
  revalidatePath(`/clientes/${clienteId}`);
  revalidatePath("/clientes");
  return { ok: true, error: null };
}

/** Reactivar un cliente archivado/inactivo (vuelve a estado='activo'). */
export async function desarchivarCliente(
  clienteId: string,
): Promise<{ ok: boolean; error: string | null }> {
  const gate = await gateGestion();
  if (!gate.ok) return { ok: false, error: gate.error };

  const supabase = createClient();
  const { data: usr } = await supabase.auth.getUser();
  const { error } = await supabase
    .from("clientes")
    .update({
      estado: "activo",
      estado_motivo: null,
      estado_modificado_at: new Date().toISOString(),
      estado_modificado_por: usr.user?.id ?? null,
      updated_at: new Date().toISOString(),
    } as never)
    .eq("id", clienteId);

  if (error) return { ok: false, error: error.message };
  revalidatePath(`/clientes/${clienteId}`);
  revalidatePath("/clientes");
  return { ok: true, error: null };
}

/** Archivar varios clientes a la vez. */
export async function archivarBulkClientes(
  ids: string[],
  motivo?: string,
): Promise<{ ok: boolean; error: string | null; count?: number }> {
  if (ids.length === 0) return { ok: false, error: "Sin selección" };
  const gate = await gateGestion();
  if (!gate.ok) return { ok: false, error: gate.error };

  const supabase = createClient();
  const { data: usr } = await supabase.auth.getUser();
  const { error, count } = await supabase
    .from("clientes")
    .update({
      estado: "archivado",
      estado_motivo: motivo ?? null,
      estado_modificado_at: new Date().toISOString(),
      estado_modificado_por: usr.user?.id ?? null,
      updated_at: new Date().toISOString(),
    } as never, { count: "exact" })
    .in("id", ids);

  if (error) return { ok: false, error: error.message };
  revalidatePath("/clientes");
  return { ok: true, error: null, count: count ?? ids.length };
}
