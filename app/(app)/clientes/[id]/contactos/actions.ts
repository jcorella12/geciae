"use server";

import { revalidatePath } from "next/cache";

import { obtenerVinculos, puedeGestionarClientes } from "@/lib/auth/permisos";
import { createClient } from "@/lib/supabase/server";

async function gate(): Promise<{ ok: true } | { ok: false; error: string }> {
  const v = await obtenerVinculos();
  if (!puedeGestionarClientes(v)) {
    return {
      ok: false,
      error: "Sin permiso (requiere CEO, Director u Operativo).",
    };
  }
  return { ok: true };
}

type ContactoInput = {
  nombre: string;
  puesto?: string | null;
  email?: string | null;
  telefono?: string | null;
  whatsapp?: string | null;
  tipo?: string | null;
  es_principal?: boolean;
};

function normalize(input: ContactoInput) {
  const nombre = input.nombre?.trim() ?? "";
  return {
    nombre,
    puesto: input.puesto?.trim() || null,
    email: input.email?.trim()?.toLowerCase() || null,
    telefono: input.telefono?.trim() || null,
    whatsapp: input.whatsapp?.trim() || null,
    tipo: input.tipo || null,
    es_principal: !!input.es_principal,
  };
}

export async function crearContacto(
  clienteId: string,
  input: ContactoInput,
): Promise<{ ok: boolean; error: string | null }> {
  const g = await gate();
  if (!g.ok) return { ok: false, error: g.error };

  const d = normalize(input);
  if (d.nombre.length < 3) {
    return { ok: false, error: "Nombre demasiado corto (mínimo 3)." };
  }
  if (!d.email && !d.telefono && !d.whatsapp) {
    return {
      ok: false,
      error: "Captura al menos un canal de contacto (email, teléfono o WhatsApp).",
    };
  }

  const supabase = createClient();

  // Si se marca principal, desmarcar el resto.
  if (d.es_principal) {
    await supabase
      .from("contactos_cliente")
      .update({ es_principal: false })
      .eq("cliente_id", clienteId)
      .eq("es_principal", true);
  }

  const { error } = await supabase.from("contactos_cliente").insert({
    cliente_id: clienteId,
    nombre: d.nombre,
    puesto: d.puesto,
    email: d.email,
    telefono: d.telefono,
    whatsapp: d.whatsapp,
    tipo: d.tipo,
    es_principal: d.es_principal,
    activo: true,
  });

  if (error) return { ok: false, error: error.message };

  revalidatePath(`/clientes/${clienteId}/contactos`);
  revalidatePath(`/clientes/${clienteId}`);
  return { ok: true, error: null };
}

export async function actualizarContacto(
  contactoId: string,
  clienteId: string,
  input: ContactoInput,
): Promise<{ ok: boolean; error: string | null }> {
  const g = await gate();
  if (!g.ok) return { ok: false, error: g.error };

  const d = normalize(input);
  if (d.nombre.length < 3) {
    return { ok: false, error: "Nombre demasiado corto (mínimo 3)." };
  }

  const supabase = createClient();

  if (d.es_principal) {
    await supabase
      .from("contactos_cliente")
      .update({ es_principal: false })
      .eq("cliente_id", clienteId)
      .eq("es_principal", true)
      .neq("id", contactoId);
  }

  const { error } = await supabase
    .from("contactos_cliente")
    .update({
      nombre: d.nombre,
      puesto: d.puesto,
      email: d.email,
      telefono: d.telefono,
      whatsapp: d.whatsapp,
      tipo: d.tipo,
      es_principal: d.es_principal,
    })
    .eq("id", contactoId);

  if (error) return { ok: false, error: error.message };

  revalidatePath(`/clientes/${clienteId}/contactos`);
  return { ok: true, error: null };
}

/** Soft-delete: activo=false. */
export async function desactivarContacto(
  contactoId: string,
  clienteId: string,
): Promise<{ ok: boolean; error: string | null }> {
  const g = await gate();
  if (!g.ok) return { ok: false, error: g.error };

  const supabase = createClient();
  const { error } = await supabase
    .from("contactos_cliente")
    .update({ activo: false, es_principal: false })
    .eq("id", contactoId);

  if (error) return { ok: false, error: error.message };

  revalidatePath(`/clientes/${clienteId}/contactos`);
  revalidatePath(`/clientes/${clienteId}`);
  return { ok: true, error: null };
}

export async function marcarPrincipal(
  contactoId: string,
  clienteId: string,
): Promise<{ ok: boolean; error: string | null }> {
  const g = await gate();
  if (!g.ok) return { ok: false, error: g.error };

  const supabase = createClient();

  // Desmarcar todos los demás.
  await supabase
    .from("contactos_cliente")
    .update({ es_principal: false })
    .eq("cliente_id", clienteId)
    .eq("es_principal", true);

  const { error } = await supabase
    .from("contactos_cliente")
    .update({ es_principal: true })
    .eq("id", contactoId);

  if (error) return { ok: false, error: error.message };

  revalidatePath(`/clientes/${clienteId}/contactos`);
  return { ok: true, error: null };
}
