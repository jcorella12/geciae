"use client";

import { ClipboardList } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ETIQUETA_PRIORIDAD_TICKET,
  type PrioridadTicket,
} from "@/lib/tickets/state";
import { cn } from "@/lib/utils";

import { crearTicketCampo } from "./actions";

const PRIORIDADES: PrioridadTicket[] = ["baja", "media", "alta", "critica"];

export function TicketCampoForm({
  proyecto,
}: {
  proyecto: { id: string; codigo: string; nombre: string };
}) {
  const [pending, startTransition] = useTransition();
  const [asunto, setAsunto] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [prioridad, setPrioridad] = useState<PrioridadTicket>("media");
  const [creado, setCreado] = useState<{ id: string; numero: string } | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);

  function enviar() {
    setError(null);
    startTransition(async () => {
      const r = await crearTicketCampo(proyecto.id, asunto, descripcion, prioridad);
      if (r.ok) {
        setCreado({ id: r.id, numero: r.numero });
        setAsunto("");
        setDescripcion("");
        setPrioridad("media");
      } else {
        setError(r.error);
      }
    });
  }

  return (
    <div className="mx-auto w-full max-w-md px-4 py-6">
      <Link href="/campo/ticket" className="text-[12px] text-brand hover:underline">
        ← Cambiar proyecto
      </Link>
      <div className="mt-1.5 flex items-center gap-2">
        <ClipboardList className="h-5 w-5 text-brand" />
        <h1 className="text-[19px] font-semibold leading-tight">
          Reportar incidente
        </h1>
      </div>
      <p className="mt-0.5 mb-4 text-[12.5px] text-ink-3">
        <span className="font-mono text-[11px]">{proyecto.codigo}</span>{" "}
        {proyecto.nombre}
      </p>

      {creado && (
        <div className="mb-3 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-[12.5px] text-emerald-800">
          ✓ Ticket <span className="font-mono">{creado.numero}</span> creado.{" "}
          <Link
            href={`/soporte/tickets/${creado.id}`}
            className="font-medium underline"
          >
            Ver ticket
          </Link>
        </div>
      )}

      <div className="space-y-3">
        <div>
          <label className="mb-1 block text-[12px] font-medium">
            ¿Qué pasó?
          </label>
          <Input
            value={asunto}
            onChange={(e) => setAsunto(e.target.value)}
            placeholder="Ej. Falta material en sitio"
            disabled={pending}
          />
        </div>

        <div>
          <label className="mb-1 block text-[12px] font-medium">
            Detalle (opcional)
          </label>
          <textarea
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            rows={3}
            placeholder="Da más contexto si hace falta…"
            disabled={pending}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="mb-1 block text-[12px] font-medium">Urgencia</label>
          <div className="grid grid-cols-4 gap-1.5">
            {PRIORIDADES.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPrioridad(p)}
                disabled={pending}
                className={cn(
                  "rounded-md border px-1 py-2 text-[11.5px] font-medium transition",
                  prioridad === p
                    ? "border-brand bg-brand-soft/60 text-brand-deep"
                    : "border-border bg-card text-ink-2 hover:border-brand/50",
                )}
              >
                {ETIQUETA_PRIORIDAD_TICKET[p]}
              </button>
            ))}
          </div>
        </div>

        {error && <p className="text-[12px] text-destructive">{error}</p>}

        <Button
          onClick={enviar}
          disabled={pending || asunto.trim().length < 3}
          size="lg"
          className="w-full"
        >
          {pending ? "Enviando…" : "Enviar reporte"}
        </Button>
      </div>
    </div>
  );
}
