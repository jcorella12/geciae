import Link from "next/link";
import { notFound } from "next/navigation";

import {
  esCEO,
  esRolEn,
  obtenerVinculos,
} from "@/lib/auth/permisos";
import { createClient } from "@/lib/supabase/server";
import {
  COLOR_ESTADO_TICKET,
  COLOR_PRIORIDAD_TICKET,
  ETIQUETA_ESTADO_TICKET,
  ETIQUETA_PRIORIDAD_TICKET,
  type EstadoTicket,
  type PrioridadTicket,
} from "@/lib/tickets/state";

import { ComentarioForm } from "./comentario-form";
import { TicketControls } from "./ticket-controls";

export const dynamic = "force-dynamic";

const fmtFechaHora = (d: string | null) =>
  !d ? "—" :
  new Date(d).toLocaleString("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

export default async function TicketDetallePage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();
  const v = await obtenerVinculos();

  const { data: ticket } = await supabase
    .from("tickets_soporte")
    .select(
      "*, empresas(codigo, razon_social), clientes(razon_social, nombre_comercial), proyectos(codigo, nombre)",
    )
    .eq("id", params.id)
    .maybeSingle();

  if (!ticket) notFound();

  const puedeEditar =
    esCEO(v) ||
    esRolEn(v, ticket.empresa_id, ["director", "operativo"]);

  const { data: comentarios } = await supabase
    .from("tickets_comentarios")
    .select("id, contenido, es_publico, created_at, autor_id")
    .eq("ticket_id", params.id)
    .order("created_at", { ascending: true });

  // Resolver nombres de autor desde empleados
  const autorIds = Array.from(
    new Set(
      (comentarios ?? [])
        .map((c) => c.autor_id)
        .filter(Boolean) as string[],
    ),
  );
  const nombresPorUserId: Record<string, string> = {};
  if (autorIds.length > 0) {
    const { data: emps } = await supabase
      .from("empleados")
      .select("usuario_id, nombre_completo")
      .in("usuario_id", autorIds);
    for (const e of emps ?? []) {
      if (e.usuario_id)
        nombresPorUserId[e.usuario_id] = e.nombre_completo as string;
    }
  }

  // Empleados con cuenta para asignar
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supa = supabase as any;
  const { data: candidatosRaw } = await supa
    .from("empleados")
    .select("usuario_id, nombre_completo, puesto, empresa_id")
    .not("usuario_id", "is", null)
    .eq("activo", true)
    .eq("empresa_id", ticket.empresa_id)
    .order("nombre_completo");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const candidatos = (candidatosRaw ?? []) as any[];

  const empresa = ticket.empresas as
    | { codigo: string; razon_social: string }
    | null;
  const cliente = ticket.clientes as
    | { razon_social: string; nombre_comercial: string | null }
    | null;
  const proyecto = ticket.proyectos as
    | { codigo: string; nombre: string }
    | null;
  const estado = ticket.estado as EstadoTicket;
  const prio = ticket.prioridad as PrioridadTicket;

  const asignadoNombre = ticket.asignado_id
    ? nombresPorUserId[ticket.asignado_id]
    : null;

  return (
    <div className="mx-auto w-full max-w-4xl px-6 py-7">
      <div className="mb-6">
        <Link
          href="/soporte/tickets"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Tickets
        </Link>
        <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <code className="font-mono text-[12px] text-ink-3">
                {ticket.numero}
              </code>
              <span
                className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${COLOR_ESTADO_TICKET[estado]}`}
              >
                {ETIQUETA_ESTADO_TICKET[estado]}
              </span>
              <span
                className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${COLOR_PRIORIDAD_TICKET[prio]}`}
              >
                {ETIQUETA_PRIORIDAD_TICKET[prio]}
              </span>
            </div>
            <h1 className="mt-2 text-[22px] font-semibold leading-tight">
              {ticket.asunto}
            </h1>
            <p className="mt-1 text-[12.5px] text-ink-3">
              {empresa?.codigo} ·{" "}
              {cliente?.nombre_comercial ?? cliente?.razon_social}
              {proyecto && ` · ${proyecto.codigo}`}
            </p>
          </div>
        </div>
      </div>

      {/* Detalles */}
      <section className="mb-5 rounded-lg border border-border bg-card p-5 shadow-sm">
        <h2 className="text-[13.5px] font-semibold">Detalle</h2>
        {ticket.descripcion ? (
          <p className="mt-3 whitespace-pre-wrap text-[13px] leading-relaxed">
            {ticket.descripcion as string}
          </p>
        ) : (
          <p className="mt-2 text-[12.5px] text-ink-3">Sin descripción.</p>
        )}
        <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-divider pt-3 text-[12px] sm:grid-cols-4">
          <div>
            <dt className="text-[10.5px] uppercase tracking-wider text-ink-3">
              Origen
            </dt>
            <dd className="mt-0.5 capitalize">
              {ticket.origen ?? "—"}
            </dd>
          </div>
          <div>
            <dt className="text-[10.5px] uppercase tracking-wider text-ink-3">
              SLA
            </dt>
            <dd className="mt-0.5">{ticket.sla_horas ?? "—"} hrs</dd>
          </div>
          <div>
            <dt className="text-[10.5px] uppercase tracking-wider text-ink-3">
              Asignado
            </dt>
            <dd className="mt-0.5">{asignadoNombre ?? "Sin asignar"}</dd>
          </div>
          <div>
            <dt className="text-[10.5px] uppercase tracking-wider text-ink-3">
              Creado
            </dt>
            <dd className="mt-0.5">{fmtFechaHora(ticket.created_at)}</dd>
          </div>
        </dl>
      </section>

      {/* Controles (solo si puede editar) */}
      {puedeEditar && (
        <TicketControls
          ticketId={ticket.id}
          empresaId={ticket.empresa_id}
          estadoActual={estado}
          asignadoId={ticket.asignado_id as string | null}
          candidatos={candidatos}
        />
      )}

      {/* Timeline de comentarios */}
      <section className="rounded-lg border border-border bg-card shadow-sm">
        <header className="border-b border-divider px-5 py-3">
          <h2 className="text-[13.5px] font-semibold">
            Comentarios ({comentarios?.length ?? 0})
          </h2>
        </header>

        {(comentarios?.length ?? 0) === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-ink-3">
            Sin comentarios aún.
          </p>
        ) : (
          <ol className="space-y-3 p-5">
            {comentarios?.map((c) => {
              const autor = c.autor_id
                ? nombresPorUserId[c.autor_id]
                : null;
              return (
                <li
                  key={c.id}
                  className={`rounded-md border px-3 py-2 ${
                    c.es_publico
                      ? "border-border bg-card"
                      : "border-warn/30 bg-warn-soft/30"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[12px] font-medium">
                      {autor ?? "Usuario"}
                      {!c.es_publico && (
                        <span className="ml-2 rounded-full bg-warn px-1.5 py-px text-[9.5px] font-semibold uppercase text-white">
                          Interno
                        </span>
                      )}
                    </p>
                    <span className="text-[10.5px] text-ink-3">
                      {fmtFechaHora(c.created_at)}
                    </span>
                  </div>
                  <p className="mt-1 whitespace-pre-wrap text-[12.5px]">
                    {c.contenido}
                  </p>
                </li>
              );
            })}
          </ol>
        )}

        {puedeEditar && (
          <ComentarioForm ticketId={ticket.id} />
        )}
      </section>
    </div>
  );
}

