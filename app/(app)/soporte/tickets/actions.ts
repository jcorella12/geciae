"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  esCEO,
  esRolEn,
  obtenerVinculos,
} from "@/lib/auth/permisos";
import { crearNotificaciones } from "@/lib/notificaciones/emisor";
import { createClient } from "@/lib/supabase/server";
import {
  initialComentarioState,
  initialTicketState,
  SLA_HORAS_DEFAULT,
  type ComentarioState,
  type PrioridadTicket,
  type TicketState,
} from "@/lib/tickets/state";

async function gateEmpresa(
  empresaId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const v = await obtenerVinculos();
  const puede =
    esCEO(v) ||
    esRolEn(v, empresaId, ["director", "operativo"]);
  if (!puede)
    return {
      ok: false,
      error: "Sin permiso para gestionar tickets en esta empresa.",
    };
  return { ok: true };
}

async function siguienteNumeroTicket(empresaId: string): Promise<string> {
  const supabase = createClient();
  const yr = new Date().getFullYear();
  const { count } = await supabase
    .from("tickets_soporte")
    .select("id", { count: "exact", head: true })
    .eq("empresa_id", empresaId)
    .ilike("numero", `TKT-${yr}-%`);
  const next = (count ?? 0) + 1;
  return `TKT-${yr}-${String(next).padStart(4, "0")}`;
}

export async function crearTicket(
  _prev: TicketState,
  formData: FormData,
): Promise<TicketState> {
  const empresaId = formData.get("empresa_id") as string;
  const clienteId = formData.get("cliente_id") as string;
  const proyectoId = (formData.get("proyecto_id") as string) || null;
  const asunto = ((formData.get("asunto") as string) || "").trim();
  const descripcion = ((formData.get("descripcion") as string) || "").trim();
  const prioridad = ((formData.get("prioridad") as string) ||
    "media") as PrioridadTicket;
  const origen = (formData.get("origen") as string) || "portal";
  const asignadoId = (formData.get("asignado_id") as string) || null;

  if (!empresaId)
    return { ...initialTicketState, error: "Empresa requerida" };
  if (!clienteId)
    return { ...initialTicketState, error: "Cliente requerido" };
  if (asunto.length < 3)
    return { ...initialTicketState, error: "Asunto muy corto" };

  const g = await gateEmpresa(empresaId);
  if (!g.ok) return { ...initialTicketState, error: g.error };

  const numero = await siguienteNumeroTicket(empresaId);
  const supabase = createClient();
  const { data: nuevo, error } = await supabase
    .from("tickets_soporte")
    .insert({
      empresa_id: empresaId,
      cliente_id: clienteId,
      proyecto_id: proyectoId,
      numero,
      asunto,
      descripcion: descripcion || null,
      prioridad,
      estado: "abierto",
      origen,
      asignado_id: asignadoId,
      sla_horas: SLA_HORAS_DEFAULT[prioridad],
    })
    .select("id")
    .single();

  if (error || !nuevo) {
    return {
      ...initialTicketState,
      error: error?.message ?? "Error al crear ticket",
    };
  }

  // Notificar al asignado
  if (asignadoId) {
    void crearNotificaciones([
      {
        usuario_id: asignadoId,
        empresa_id: empresaId,
        tipo: "ticket_asignado",
        severidad:
          prioridad === "critica"
            ? "danger"
            : prioridad === "alta"
              ? "warning"
              : "info",
        titulo: `Ticket asignado: ${numero}`,
        mensaje: asunto,
        url: `/soporte/tickets/${nuevo.id}`,
        entidad_tipo: "ticket_soporte",
        entidad_id: nuevo.id,
      },
    ]);
  }

  revalidatePath("/soporte/tickets");
  redirect(`/soporte/tickets/${nuevo.id}`);
}

export async function actualizarEstadoTicket(
  ticketId: string,
  empresaId: string,
  nuevoEstado: string,
): Promise<ComentarioState> {
  const valid = [
    "abierto",
    "en_proceso",
    "esperando_cliente",
    "resuelto",
    "cerrado",
  ];
  if (!valid.includes(nuevoEstado))
    return { ...initialComentarioState, error: "Estado inválido" };

  const g = await gateEmpresa(empresaId);
  if (!g.ok) return { ...initialComentarioState, error: g.error };

  const supabase = createClient();
  const patch: Record<string, unknown> = {
    estado: nuevoEstado,
    updated_at: new Date().toISOString(),
  };
  if (nuevoEstado === "resuelto" || nuevoEstado === "cerrado") {
    patch.fecha_resolucion = new Date().toISOString();
  }
  const { error } = await supabase
    .from("tickets_soporte")
    // Patch dinámico; cast al tipo Update<tickets_soporte>.
    .update(patch as never)
    .eq("id", ticketId);

  if (error) return { ...initialComentarioState, error: error.message };

  revalidatePath(`/soporte/tickets/${ticketId}`);
  revalidatePath("/soporte/tickets");
  return { ok: true, error: null };
}

export async function asignarTicket(
  ticketId: string,
  empresaId: string,
  usuarioId: string | null,
): Promise<ComentarioState> {
  const g = await gateEmpresa(empresaId);
  if (!g.ok) return { ...initialComentarioState, error: g.error };

  const supabase = createClient();
  const { error, data: ticket } = await supabase
    .from("tickets_soporte")
    .update({ asignado_id: usuarioId, updated_at: new Date().toISOString() })
    .eq("id", ticketId)
    .select("numero, asunto, prioridad")
    .single();

  if (error) return { ...initialComentarioState, error: error.message };

  if (usuarioId && ticket) {
    void crearNotificaciones([
      {
        usuario_id: usuarioId,
        empresa_id: empresaId,
        tipo: "ticket_asignado",
        severidad: "info",
        titulo: `Ticket asignado: ${ticket.numero}`,
        mensaje: ticket.asunto,
        url: `/soporte/tickets/${ticketId}`,
        entidad_tipo: "ticket_soporte",
        entidad_id: ticketId,
      },
    ]);
  }

  revalidatePath(`/soporte/tickets/${ticketId}`);
  return { ok: true, error: null };
}

export async function agregarComentarioTicket(
  _prev: ComentarioState,
  formData: FormData,
): Promise<ComentarioState> {
  const ticketId = formData.get("ticket_id") as string;
  const contenido = ((formData.get("contenido") as string) || "").trim();
  const esPublico = formData.get("es_publico") === "on";

  if (!ticketId)
    return { ...initialComentarioState, error: "Falta ticket" };
  if (contenido.length < 1)
    return { ...initialComentarioState, error: "Contenido requerido" };

  const supabase = createClient();
  const { data: ticket } = await supabase
    .from("tickets_soporte")
    .select("empresa_id")
    .eq("id", ticketId)
    .maybeSingle();

  if (!ticket)
    return { ...initialComentarioState, error: "Ticket no encontrado" };

  const g = await gateEmpresa(ticket.empresa_id);
  if (!g.ok) return { ...initialComentarioState, error: g.error };

  const { data: usr } = await supabase.auth.getUser();
  const { error } = await supabase.from("tickets_comentarios").insert({
    ticket_id: ticketId,
    autor_id: usr.user?.id,
    contenido,
    es_publico: esPublico,
  });

  if (error) return { ...initialComentarioState, error: error.message };

  revalidatePath(`/soporte/tickets/${ticketId}`);
  return { ok: true, error: null };
}
