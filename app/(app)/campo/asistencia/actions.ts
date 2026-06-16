"use server";

/* eslint-disable @typescript-eslint/no-explicit-any */
import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

type RegistroAsistencia = {
  empleadoId: string;
  presente: boolean;
  horas: number | null;
};

type Resultado = { ok: true; guardados: number } | { ok: false; error: string };

/**
 * Guarda (upsert) la asistencia de campo de un proyecto en una fecha.
 * Una fila por (proyecto, fecha, empleado). El RLS exige que quien llama
 * pueda capturar (supervisor de cuadrilla / PM / director / CEO).
 */
export async function guardarAsistenciaCampo(
  proyectoId: string,
  fecha: string,
  registros: RegistroAsistencia[],
): Promise<Resultado> {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: "No autenticado" };

    if (!proyectoId || !fecha) {
      return { ok: false, error: "Falta proyecto o fecha" };
    }

    // Empresa del proyecto (también valida que exista y sea visible por RLS).
    const { data: proyecto } = await (supabase as any)
      .from("proyectos")
      .select("id, empresa_id")
      .eq("id", proyectoId)
      .maybeSingle();
    if (!proyecto) {
      return { ok: false, error: "Proyecto no encontrado o sin acceso" };
    }

    const filas = registros
      .filter((r) => r.empleadoId)
      .map((r) => ({
        empresa_id: proyecto.empresa_id,
        proyecto_id: proyectoId,
        empleado_id: r.empleadoId,
        fecha,
        presente: r.presente,
        horas: r.presente ? (r.horas ?? null) : null,
        registrado_por: user.id,
      }));

    if (filas.length === 0) {
      return { ok: false, error: "Sin registros para guardar" };
    }

    const { error } = await (supabase as any)
      .from("asistencia_campo")
      .upsert(filas, { onConflict: "proyecto_id,fecha,empleado_id" });

    if (error) return { ok: false, error: error.message };

    revalidatePath("/campo/asistencia");
    return { ok: true, guardados: filas.length };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error" };
  }
}
