"use server";

/* eslint-disable @typescript-eslint/no-explicit-any */
import { revalidatePath } from "next/cache";

import { esCEO, esRolEn, obtenerVinculos } from "@/lib/auth/permisos";
import { createClient } from "@/lib/supabase/server";
import { SLA_HORAS_DEFAULT, type PrioridadTicket } from "@/lib/tickets/state";

type Resultado =
  | { ok: true; id: string; numero: string }
  | { ok: false; error: string };

/**
 * Crea un ticket de soporte desde campo, ligado a un proyecto. El cliente se
 * deriva del proyecto (puede quedar nulo: un incidente de obra no siempre es
 * de un cliente). Gate igual que el alta de oficina: CEO o director/operativo
 * de la empresa del proyecto (cubre al supervisor de cuadrilla, que es
 * operativo).
 */
export async function crearTicketCampo(
  proyectoId: string,
  asunto: string,
  descripcion: string,
  prioridad: PrioridadTicket,
): Promise<Resultado> {
  try {
    if (!proyectoId) return { ok: false, error: "Falta proyecto" };
    const asuntoT = (asunto || "").trim();
    if (asuntoT.length < 3) return { ok: false, error: "Describe el problema (mín. 3 caracteres)" };

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: "No autenticado" };

    const { data: proyecto } = await (supabase as any)
      .from("proyectos")
      .select("id, empresa_id, cliente_id")
      .eq("id", proyectoId)
      .maybeSingle();
    if (!proyecto) return { ok: false, error: "Proyecto no encontrado o sin acceso" };

    const v = await obtenerVinculos();
    const puede =
      esCEO(v) || esRolEn(v, proyecto.empresa_id, ["director", "operativo"]);
    if (!puede) {
      return { ok: false, error: "Sin permiso para crear tickets en esta empresa." };
    }

    const yr = new Date().getFullYear();
    const { count } = await (supabase as any)
      .from("tickets_soporte")
      .select("id", { count: "exact", head: true })
      .eq("empresa_id", proyecto.empresa_id)
      .ilike("numero", `TKT-${yr}-%`);
    const numero = `TKT-${yr}-${String((count ?? 0) + 1).padStart(4, "0")}`;

    const { data: nuevo, error } = await (supabase as any)
      .from("tickets_soporte")
      .insert({
        empresa_id: proyecto.empresa_id,
        cliente_id: proyecto.cliente_id ?? null,
        proyecto_id: proyectoId,
        numero,
        asunto: asuntoT,
        descripcion: (descripcion || "").trim() || null,
        prioridad,
        estado: "abierto",
        origen: "campo",
        sla_horas: SLA_HORAS_DEFAULT[prioridad],
      })
      .select("id")
      .single();

    if (error || !nuevo) {
      return { ok: false, error: error?.message ?? "Error al crear ticket" };
    }

    revalidatePath("/soporte/tickets");
    return { ok: true, id: nuevo.id, numero };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error" };
  }
}
