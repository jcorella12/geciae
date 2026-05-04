"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";

import { ClientePicker } from "@/components/shared/cliente-picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ETIQUETA_PRIORIDAD_TICKET,
  initialTicketState,
  ORIGENES_TICKET,
  type PrioridadTicket,
} from "@/lib/tickets/state";

import { crearTicket } from "../actions";

type Empresa = {
  id: string;
  codigo: string;
  razon_social: string;
  nombre_comercial: string | null;
};

type Cliente = {
  id: string;
  razon_social: string;
  rfc: string | null;
  nombre_comercial: string | null;
};

type Proyecto = {
  id: string;
  codigo: string;
  nombre: string;
  empresa_id: string;
};

type Candidato = {
  usuario_id: string;
  nombre_completo: string;
  puesto: string | null;
  empresa_id: string;
};

const PRIORIDADES = Object.keys(
  ETIQUETA_PRIORIDAD_TICKET,
) as PrioridadTicket[];

export function TicketForm({
  empresas,
  clientes,
  proyectos,
  candidatos,
}: {
  empresas: Empresa[];
  clientes: Cliente[];
  proyectos: Proyecto[];
  candidatos: Candidato[];
}) {
  const [state, formAction] = useFormState(crearTicket, initialTicketState);
  const [empresaId, setEmpresaId] = useState("");
  const [clienteId, setClienteId] = useState("");

  const proyectosFiltrados = proyectos.filter((p) => p.empresa_id === empresaId);
  const candidatosFiltrados = candidatos.filter(
    (c) => c.empresa_id === empresaId,
  );

  return (
    <form action={formAction} className="space-y-5">
      <section className="rounded-lg border border-border bg-card p-5 shadow-sm">
        <h2 className="text-base font-semibold">Identificación</h2>
        <div className="mt-4 grid grid-cols-12 gap-3">
          <div className="col-span-12 md:col-span-6">
            <Label htmlFor="empresa_id" className="text-sm">
              Empresa *
            </Label>
            <select
              id="empresa_id"
              name="empresa_id"
              required
              value={empresaId}
              onChange={(e) => setEmpresaId(e.target.value)}
              className="mt-1 h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">— Selecciona —</option>
              {empresas.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.codigo} · {e.nombre_comercial ?? e.razon_social}
                </option>
              ))}
            </select>
          </div>
          <div className="col-span-12 md:col-span-6">
            <Label htmlFor="origen" className="text-sm">
              Origen
            </Label>
            <select
              id="origen"
              name="origen"
              defaultValue="portal"
              className="mt-1 h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              {ORIGENES_TICKET.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div className="col-span-12">
            <Label className="text-sm">Cliente *</Label>
            <ClientePicker
              clientes={clientes}
              value={clienteId}
              onChange={setClienteId}
              empresaId={empresaId}
            />
          </div>
          {proyectosFiltrados.length > 0 && (
            <div className="col-span-12">
              <Label htmlFor="proyecto_id" className="text-sm">
                Proyecto relacionado (opcional)
              </Label>
              <select
                id="proyecto_id"
                name="proyecto_id"
                defaultValue=""
                className="mt-1 h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">— Sin vincular —</option>
                {proyectosFiltrados.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.codigo} · {p.nombre}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </section>

      <section className="rounded-lg border border-border bg-card p-5 shadow-sm">
        <h2 className="text-base font-semibold">Detalle</h2>
        <div className="mt-4 grid grid-cols-12 gap-3">
          <div className="col-span-12">
            <Label htmlFor="asunto" className="text-sm">
              Asunto *
            </Label>
            <Input
              id="asunto"
              name="asunto"
              required
              placeholder="Resumen del problema o solicitud"
              className="mt-1"
            />
          </div>
          <div className="col-span-12">
            <Label htmlFor="descripcion" className="text-sm">
              Descripción
            </Label>
            <textarea
              id="descripcion"
              name="descripcion"
              rows={5}
              placeholder="Detalle del incidente, pasos para reproducirlo, impacto, contexto…"
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </div>
          <div className="col-span-6">
            <Label htmlFor="prioridad" className="text-sm">
              Prioridad
            </Label>
            <select
              id="prioridad"
              name="prioridad"
              defaultValue="media"
              className="mt-1 h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              {PRIORIDADES.map((p) => (
                <option key={p} value={p}>
                  {ETIQUETA_PRIORIDAD_TICKET[p]}
                </option>
              ))}
            </select>
          </div>
          <div className="col-span-6">
            <Label htmlFor="asignado_id" className="text-sm">
              Asignar a
            </Label>
            <select
              id="asignado_id"
              name="asignado_id"
              defaultValue=""
              className="mt-1 h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">— Sin asignar —</option>
              {candidatosFiltrados.map((c) => (
                <option key={c.usuario_id} value={c.usuario_id}>
                  {c.nombre_completo}
                  {c.puesto ? ` · ${c.puesto}` : ""}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {state.error && (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.error}
        </p>
      )}

      <div className="flex justify-end gap-2">
        <SubmitBtn />
      </div>
    </form>
  );
}

function SubmitBtn() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Creando…" : "Crear ticket"}
    </Button>
  );
}
