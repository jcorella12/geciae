"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import {
  esCEO,
  esRolEn,
  obtenerVinculos,
} from "@/lib/auth/permisos";
import { createClient } from "@/lib/supabase/server";

import type { AlmacenState } from "./state";

const TIPOS = ["principal", "obra", "virtual_cuadrilla", "otro"] as const;

const AlmacenSchema = z
  .object({
    empresa_id: z
      .string()
      .uuid()
      .optional()
      .or(z.literal(""))
      .transform((v) => (v ? v : null)),
    compartido: z.coerce.boolean().default(false),
    codigo: z
      .string()
      .trim()
      .min(2, "Código mínimo 2 caracteres")
      .max(20)
      .transform((v) => v.toUpperCase()),
    nombre: z.string().trim().min(2).max(150),
    tipo: z.enum(TIPOS).default("principal"),
    responsable_id: z
      .string()
      .uuid()
      .optional()
      .or(z.literal(""))
      .transform((v) => (v ? v : null)),
    direccion_calle: z
      .string()
      .max(200)
      .optional()
      .or(z.literal(""))
      .transform((v) => (v ? v : null)),
    direccion_ciudad: z
      .string()
      .max(100)
      .optional()
      .or(z.literal(""))
      .transform((v) => (v ? v : null)),
    direccion_estado: z
      .string()
      .max(100)
      .optional()
      .or(z.literal(""))
      .transform((v) => (v ? v : null)),
    direccion_cp: z
      .string()
      .max(10)
      .optional()
      .or(z.literal(""))
      .transform((v) => (v ? v : null)),
    activo: z.coerce.boolean().default(true),
  })
  .superRefine((d, ctx) => {
    if (d.compartido && d.empresa_id) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Si es compartido no debe tener empresa.",
        path: ["empresa_id"],
      });
    }
    if (!d.compartido && !d.empresa_id) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Selecciona empresa o marca 'Compartido entre empresas'.",
        path: ["empresa_id"],
      });
    }
  });

async function gateAlmacen(
  empresaId: string | null,
  compartido: boolean,
): Promise<boolean> {
  const v = await obtenerVinculos();
  // Compartidos: solo CEO
  if (compartido) return esCEO(v);
  // Propios: CEO o director/operativo de la empresa dueña
  if (!empresaId) return false;
  return esCEO(v) || esRolEn(v, empresaId, ["director", "operativo"]);
}

function buildDireccion(
  d: z.infer<typeof AlmacenSchema>,
): Record<string, string> | null {
  const dir: Record<string, string> = {};
  if (d.direccion_calle) dir.calle = d.direccion_calle;
  if (d.direccion_ciudad) dir.ciudad = d.direccion_ciudad;
  if (d.direccion_estado) dir.estado = d.direccion_estado;
  if (d.direccion_cp) dir.cp = d.direccion_cp;
  return Object.keys(dir).length > 0 ? dir : null;
}

export async function crearAlmacen(
  _prev: AlmacenState,
  formData: FormData,
): Promise<AlmacenState> {
  const parsed = AlmacenSchema.safeParse({
    empresa_id: formData.get("empresa_id") || undefined,
    compartido: formData.get("compartido") === "on",
    codigo: formData.get("codigo"),
    nombre: formData.get("nombre"),
    tipo: formData.get("tipo") || "principal",
    responsable_id: formData.get("responsable_id") || undefined,
    direccion_calle: formData.get("direccion_calle") || undefined,
    direccion_ciudad: formData.get("direccion_ciudad") || undefined,
    direccion_estado: formData.get("direccion_estado") || undefined,
    direccion_cp: formData.get("direccion_cp") || undefined,
    activo: formData.get("activo") === "on",
  });
  if (!parsed.success) {
    return {
      ok: false,
      id: null,
      error: parsed.error.issues.map((i) => i.message).join("; "),
    };
  }
  const d = parsed.data;
  if (!(await gateAlmacen(d.empresa_id, d.compartido))) {
    return {
      ok: false,
      id: null,
      error: d.compartido
        ? "Solo el CEO puede crear almacenes compartidos."
        : "Sin permiso.",
    };
  }
  const supabase = createClient();
  const { data, error } = await supabase
    .from("almacenes")
    .insert({
      empresa_id: d.empresa_id,
      compartido: d.compartido,
      codigo: d.codigo,
      nombre: d.nombre,
      tipo: d.tipo,
      responsable_id: d.responsable_id,
      direccion: buildDireccion(d),
      activo: d.activo,
    } as never)
    .select("id")
    .single();
  if (error) return { ok: false, id: null, error: error.message };
  revalidatePath("/inventario/almacenes");
  return { ok: true, id: data.id, error: null };
}

export async function actualizarAlmacen(
  almacenId: string,
  _prev: AlmacenState,
  formData: FormData,
): Promise<AlmacenState> {
  const parsed = AlmacenSchema.safeParse({
    empresa_id: formData.get("empresa_id") || undefined,
    compartido: formData.get("compartido") === "on",
    codigo: formData.get("codigo"),
    nombre: formData.get("nombre"),
    tipo: formData.get("tipo") || "principal",
    responsable_id: formData.get("responsable_id") || undefined,
    direccion_calle: formData.get("direccion_calle") || undefined,
    direccion_ciudad: formData.get("direccion_ciudad") || undefined,
    direccion_estado: formData.get("direccion_estado") || undefined,
    direccion_cp: formData.get("direccion_cp") || undefined,
    activo: formData.get("activo") === "on",
  });
  if (!parsed.success) {
    return {
      ok: false,
      id: almacenId,
      error: parsed.error.issues.map((i) => i.message).join("; "),
    };
  }
  const d = parsed.data;
  if (!(await gateAlmacen(d.empresa_id, d.compartido))) {
    return {
      ok: false,
      id: almacenId,
      error: d.compartido
        ? "Solo el CEO puede modificar almacenes compartidos."
        : "Sin permiso.",
    };
  }
  const supabase = createClient();
  const { error } = await supabase
    .from("almacenes")
    .update({
      empresa_id: d.empresa_id,
      compartido: d.compartido,
      codigo: d.codigo,
      nombre: d.nombre,
      tipo: d.tipo,
      responsable_id: d.responsable_id,
      direccion: buildDireccion(d),
      activo: d.activo,
    } as never)
    .eq("id", almacenId);
  if (error) return { ok: false, id: almacenId, error: error.message };
  revalidatePath("/inventario/almacenes");
  revalidatePath(`/inventario/almacenes/${almacenId}`);
  return { ok: true, id: almacenId, error: null };
}

export async function toggleAlmacenActivo(
  almacenId: string,
): Promise<{ ok: boolean; error: string | null }> {
  const supabase = createClient();
  const { data: alm } = (await supabase
    .from("almacenes")
    .select("empresa_id, activo, compartido" as never)
    .eq("id", almacenId)
    .maybeSingle()) as unknown as {
    data: { empresa_id: string | null; activo: boolean; compartido: boolean } | null;
  };
  if (!alm) return { ok: false, error: "Almacén no encontrado" };
  if (!(await gateAlmacen(alm.empresa_id, alm.compartido))) {
    return { ok: false, error: "Sin permiso" };
  }
  const { error } = await supabase
    .from("almacenes")
    .update({ activo: !alm.activo })
    .eq("id", almacenId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/inventario/almacenes");
  revalidatePath(`/inventario/almacenes/${almacenId}`);
  return { ok: true, error: null };
}

// Conveniencia: redirige al detalle después de crear (usar desde Server
// Component si se desea ese flow).
export async function crearAlmacenYRedirigir(
  _prev: AlmacenState,
  formData: FormData,
): Promise<AlmacenState> {
  const res = await crearAlmacen(_prev, formData);
  if (res.ok && res.id) {
    redirect(`/inventario/almacenes/${res.id}`);
  }
  return res;
}

// initialAlmacenState ahora se exporta desde ./state — no se puede re-exportar
// desde un archivo "use server" porque es un objeto, no una función async.
