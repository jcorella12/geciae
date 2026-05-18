"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  obtenerVinculos,
  puedeGestionarEmpleadosEn,
} from "@/lib/auth/permisos";
import { EmpleadoFormSchema } from "@/lib/empleados/schemas";
import type { EmpleadoState } from "@/lib/empleados/state";
import { createClient } from "@/lib/supabase/server";

function parseFormData(formData: FormData) {
  return {
    empresa_id: formData.get("empresa_id"),
    nombre_completo: formData.get("nombre_completo"),
    curp: formData.get("curp"),
    rfc: formData.get("rfc") || undefined,
    nss: formData.get("nss") || undefined,
    fecha_nacimiento: formData.get("fecha_nacimiento") || undefined,
    genero: formData.get("genero") || undefined,
    estado_civil: formData.get("estado_civil") || undefined,
    email_personal: formData.get("email_personal") || undefined,
    telefono: formData.get("telefono") || undefined,
    whatsapp: formData.get("whatsapp") || undefined,
    domicilio: {
      calle: formData.get("dom_calle") || "",
      numero_exterior: formData.get("dom_numero_exterior") || "",
      numero_interior: formData.get("dom_numero_interior") || "",
      colonia: formData.get("dom_colonia") || "",
      municipio: formData.get("dom_municipio") || "",
      estado: formData.get("dom_estado") || undefined,
      cp: formData.get("dom_cp") || "",
    },
    contacto_emergencia: {
      nombre: formData.get("emerg_nombre") || "",
      relacion: formData.get("emerg_relacion") || "",
      telefono: formData.get("emerg_telefono") || "",
    },
    numero_empleado: formData.get("numero_empleado"),
    categoria: formData.get("categoria"),
    puesto: formData.get("puesto"),
    area: formData.get("area") || undefined,
    jefe_directo_id: formData.get("jefe_directo_id") || undefined,
    fecha_ingreso: formData.get("fecha_ingreso"),
    cuenta_bancaria: {
      clabe: formData.get("clabe") || "",
      banco: formData.get("banco") || "",
    },
    salario_base: formData.get("salario_base") || undefined,
    observaciones: formData.get("observaciones") || undefined,
  };
}

async function gate(
  empresaId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const v = await obtenerVinculos();
  if (!puedeGestionarEmpleadosEn(v, empresaId)) {
    return {
      ok: false,
      error:
        "No tienes permiso para gestionar empleados de esta empresa (requiere rol CEO o Director).",
    };
  }
  return { ok: true };
}

export async function createEmpleado(
  _prev: EmpleadoState,
  formData: FormData,
): Promise<EmpleadoState> {
  const parsed = EmpleadoFormSchema.safeParse(parseFormData(formData));
  if (!parsed.success) {
    return {
      ok: false,
      error: "Revisa los campos marcados.",
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }
  const d = parsed.data;

  const g = await gate(d.empresa_id);
  if (!g.ok) return { ok: false, error: g.error };

  const supabase = createClient();

  const cuenta = d.cuenta_bancaria;
  const cuentaJson = cuenta && (cuenta.clabe || cuenta.banco) ? cuenta : null;

  const { data: nuevo, error: insertErr } = await supabase
    .from("empleados")
    .insert({
      empresa_id: d.empresa_id,
      nombre_completo: d.nombre_completo,
      curp: d.curp,
      rfc: d.rfc,
      nss: d.nss,
      fecha_nacimiento: d.fecha_nacimiento,
      genero: d.genero,
      estado_civil: d.estado_civil,
      email_personal: d.email_personal,
      telefono: d.telefono,
      whatsapp: d.whatsapp,
      domicilio: (d.domicilio ?? null) as never,
      contacto_emergencia: (d.contacto_emergencia ?? null) as never,
      numero_empleado: d.numero_empleado,
      categoria: d.categoria,
      puesto: d.puesto,
      area: d.area,
      jefe_directo_id: d.jefe_directo_id,
      fecha_ingreso: d.fecha_ingreso,
      cuenta_bancaria: cuentaJson as never,
      salario_base: d.salario_base,
      observaciones: d.observaciones,
      activo: true,
    })
    .select("id")
    .single();

  if (insertErr || !nuevo) {
    const msg = insertErr?.message ?? "desconocido";
    return {
      ok: false,
      error: msg.includes("duplicate")
        ? "Ya existe un empleado con esa CURP o número de empleado."
        : `Error al guardar: ${msg}`,
    };
  }

  revalidatePath("/personas");
  redirect(`/personas/${nuevo.id}`);
}

export async function updateEmpleado(
  empleadoId: string,
  _prev: EmpleadoState,
  formData: FormData,
): Promise<EmpleadoState> {
  const parsed = EmpleadoFormSchema.safeParse(parseFormData(formData));
  if (!parsed.success) {
    return {
      ok: false,
      error: "Revisa los campos marcados.",
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }
  const d = parsed.data;
  const g = await gate(d.empresa_id);
  if (!g.ok) return { ok: false, error: g.error };

  const supabase = createClient();

  const cuenta = d.cuenta_bancaria;
  const cuentaJson = cuenta && (cuenta.clabe || cuenta.banco) ? cuenta : null;

  const { error } = await supabase
    .from("empleados")
    .update({
      empresa_id: d.empresa_id,
      nombre_completo: d.nombre_completo,
      curp: d.curp,
      rfc: d.rfc,
      nss: d.nss,
      fecha_nacimiento: d.fecha_nacimiento,
      genero: d.genero,
      estado_civil: d.estado_civil,
      email_personal: d.email_personal,
      telefono: d.telefono,
      whatsapp: d.whatsapp,
      domicilio: (d.domicilio ?? null) as never,
      contacto_emergencia: (d.contacto_emergencia ?? null) as never,
      numero_empleado: d.numero_empleado,
      categoria: d.categoria,
      puesto: d.puesto,
      area: d.area,
      jefe_directo_id: d.jefe_directo_id,
      fecha_ingreso: d.fecha_ingreso,
      cuenta_bancaria: cuentaJson as never,
      salario_base: d.salario_base,
      observaciones: d.observaciones,
      updated_at: new Date().toISOString(),
    })
    .eq("id", empleadoId);

  if (error) {
    return {
      ok: false,
      error: error.message?.includes("duplicate")
        ? "Conflicto: CURP o número de empleado ya existen."
        : `Error al actualizar: ${error.message}`,
    };
  }

  revalidatePath(`/personas/${empleadoId}`);
  revalidatePath("/personas");
  redirect(`/personas/${empleadoId}`);
}

export async function toggleActivoEmpleado(
  empleadoId: string,
  empresaId: string,
  proximo: boolean,
): Promise<{ ok: boolean; error: string | null }> {
  const g = await gate(empresaId);
  if (!g.ok) return { ok: false, error: g.error };

  const supabase = createClient();
  const { error } = await supabase
    .from("empleados")
    .update({
      activo: proximo,
      updated_at: new Date().toISOString(),
      fecha_baja: proximo ? null : new Date().toISOString().slice(0, 10),
    })
    .eq("id", empleadoId);

  if (error) return { ok: false, error: error.message };

  revalidatePath(`/personas/${empleadoId}`);
  revalidatePath("/personas");
  return { ok: true, error: null };
}

/**
 * S3-T3 — Creación rápida de empleado desde formularios externos
 * (asignación de vehículo, captura de viático, etc.).
 *
 * Solo requiere nombre + puesto + empresa + fecha_ingreso (default = hoy).
 * Se autogenera numero_empleado (siguiente disponible en la empresa).
 * CURP se marca con placeholder `PEND-{uuid}` que el usuario completa
 * después en la ficha del empleado.
 */
export async function crearEmpleadoRapido(input: {
  nombre_completo: string;
  puesto: string;
  empresa_id: string;
  fecha_ingreso?: string | null;
  categoria?: "planta" | "por_obra" | "repse";
  email_personal?: string | null;
}): Promise<{
  ok: boolean;
  error: string | null;
  empleado?: {
    id: string;
    nombre_completo: string;
    numero_empleado: string;
    puesto: string;
    empresa_id: string;
  };
}> {
  const nombre = input.nombre_completo?.trim() ?? "";
  const puesto = input.puesto?.trim() ?? "";
  if (nombre.length < 3) {
    return { ok: false, error: "Nombre demasiado corto." };
  }
  if (puesto.length < 2) {
    return { ok: false, error: "Falta el puesto." };
  }

  const v = await obtenerVinculos();
  if (!puedeGestionarEmpleadosEn(v, input.empresa_id)) {
    return {
      ok: false,
      error: "Sin permiso para crear empleados en esta empresa.",
    };
  }

  const supabase = createClient();

  // Generar siguiente numero_empleado: MAX(numero_empleado::int)+1 para la
  // empresa. Si no son numéricos (ej. "EMP-001"), arrancar de 1.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: ultimos } = await (supabase as any)
    .from("empleados")
    .select("numero_empleado")
    .eq("empresa_id", input.empresa_id)
    .order("created_at", { ascending: false })
    .limit(50);

  let proximoNum = 1;
  for (const u of (ultimos ?? []) as Array<{ numero_empleado: string }>) {
    const match = String(u.numero_empleado).match(/(\d+)\s*$/);
    if (match) {
      const n = parseInt(match[1], 10);
      if (n >= proximoNum) proximoNum = n + 1;
    }
  }
  const numeroEmpleado = String(proximoNum).padStart(4, "0");

  const fechaIngreso =
    input.fecha_ingreso ?? new Date().toISOString().slice(0, 10);

  // CURP placeholder único. El usuario debe completarlo después.
  const curpPlaceholder = `PEND-${crypto.randomUUID().slice(0, 14).toUpperCase()}`;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: nuevo, error } = await (supabase as any)
    .from("empleados")
    .insert({
      empresa_id: input.empresa_id,
      numero_empleado: numeroEmpleado,
      nombre_completo: nombre,
      puesto,
      categoria: input.categoria ?? "planta",
      fecha_ingreso: fechaIngreso,
      curp: curpPlaceholder,
      email_personal: input.email_personal?.trim() || null,
      activo: true,
      observaciones:
        "Creado vía quick-create. Completar CURP, RFC, NSS y demás datos en su ficha.",
    })
    .select("id, nombre_completo, numero_empleado, puesto, empresa_id")
    .single();

  if (error || !nuevo) {
    return {
      ok: false,
      error: error?.message ?? "Error al crear empleado.",
    };
  }

  revalidatePath("/personas");
  return { ok: true, error: null, empleado: nuevo };
}
