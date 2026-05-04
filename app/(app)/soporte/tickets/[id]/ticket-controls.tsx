"use client";

import { useTransition } from "react";

import {
  COLOR_ESTADO_TICKET,
  ETIQUETA_ESTADO_TICKET,
  type EstadoTicket,
} from "@/lib/tickets/state";

import { actualizarEstadoTicket, asignarTicket } from "../actions";

type Candidato = {
  usuario_id: string;
  nombre_completo: string;
  puesto: string | null;
};

const ESTADOS: EstadoTicket[] = [
  "abierto",
  "en_proceso",
  "esperando_cliente",
  "resuelto",
  "cerrado",
];

export function TicketControls({
  ticketId,
  empresaId,
  estadoActual,
  asignadoId,
  candidatos,
}: {
  ticketId: string;
  empresaId: string;
  estadoActual: EstadoTicket;
  asignadoId: string | null;
  candidatos: Candidato[];
}) {
  const [, startTransition] = useTransition();

  const onCambiar = (nuevo: string) => {
    startTransition(() => {
      actualizarEstadoTicket(ticketId, empresaId, nuevo);
    });
  };

  const onAsignar = (uid: string) => {
    startTransition(() => {
      asignarTicket(ticketId, empresaId, uid || null);
    });
  };

  return (
    <section className="mb-5 flex flex-wrap items-center gap-3 rounded-lg border border-border bg-card p-4 shadow-sm">
      <div className="flex items-center gap-2">
        <span className="text-[11.5px] font-medium text-ink-3">Estado:</span>
        <select
          value={estadoActual}
          onChange={(e) => onCambiar(e.target.value)}
          className={`rounded-full border-0 px-2.5 py-0.5 text-[11.5px] font-medium ${COLOR_ESTADO_TICKET[estadoActual]}`}
        >
          {ESTADOS.map((s) => (
            <option key={s} value={s}>
              {ETIQUETA_ESTADO_TICKET[s]}
            </option>
          ))}
        </select>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-[11.5px] font-medium text-ink-3">Asignar a:</span>
        <select
          value={asignadoId ?? ""}
          onChange={(e) => onAsignar(e.target.value)}
          className="h-7 rounded-md border border-input bg-background px-2 text-[11.5px]"
        >
          <option value="">— Sin asignar —</option>
          {candidatos.map((c) => (
            <option key={c.usuario_id} value={c.usuario_id}>
              {c.nombre_completo}
              {c.puesto ? ` · ${c.puesto}` : ""}
            </option>
          ))}
        </select>
      </div>
    </section>
  );
}
