"use client";

import { Pencil } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { actualizarSerie } from "../actions";
import { ESTADOS_SERIE, type EstadoSerie } from "../state";

type Defaults = {
  almacenId: string | null;
  proyectoId: string | null;
  clienteId: string | null;
  ubicacionActual: string | null;
  fechaInstalacion: string | null;
};

export function SerieEditPanel({
  serieId,
  estadoActual,
  almacenes,
  proyectos,
  clientes,
  defaults,
}: {
  serieId: string;
  estadoActual: EstadoSerie;
  almacenes: { id: string; codigo: string; nombre: string }[];
  proyectos: { id: string; codigo: string; nombre: string }[];
  clientes: { id: string; razon_social: string; rfc: string | null }[];
  defaults: Defaults;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [estado, setEstado] = useState<EstadoSerie>(estadoActual);
  const [almacenId, setAlmacenId] = useState(defaults.almacenId ?? "");
  const [proyectoId, setProyectoId] = useState(defaults.proyectoId ?? "");
  const [clienteId, setClienteId] = useState(defaults.clienteId ?? "");
  const [ubicacion, setUbicacion] = useState(defaults.ubicacionActual ?? "");
  const [fechaInstalacion, setFechaInstalacion] = useState(
    defaults.fechaInstalacion ?? "",
  );
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function guardar() {
    setError(null);
    startTransition(async () => {
      const r = await actualizarSerie({
        serieId,
        estado,
        almacenId: almacenId || null,
        proyectoId: proyectoId || null,
        clienteId: clienteId || null,
        ubicacionActual: ubicacion.trim() || null,
        fechaInstalacion: fechaInstalacion || null,
      });
      if (!r.ok) {
        setError(r.error ?? "Error al actualizar");
        return;
      }
      setEditing(false);
      router.refresh();
    });
  }

  if (!editing) {
    return (
      <section className="rounded-md border border-border bg-card p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-[14px] font-semibold">Editar serie</h2>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setEditing(true)}
          >
            <Pencil className="mr-1 h-3.5 w-3.5" />
            Editar estado / asignación
          </Button>
        </div>
        <p className="mt-2 text-[12px] text-muted-foreground">
          Cambia el estado de la serie (en almacén → asignada a proyecto →
          instalada → en garantía). Asigna a proyecto, cliente, almacén y
          ubicación específica.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-md border border-amber-300 bg-amber-50/40 p-5">
      <h2 className="text-[14px] font-semibold">Editar serie</h2>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="estado">Estado</Label>
          <select
            id="estado"
            value={estado}
            onChange={(e) => setEstado(e.target.value as EstadoSerie)}
            className="flex h-10 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
          >
            {ESTADOS_SERIE.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="almacen">Almacén</Label>
          <select
            id="almacen"
            value={almacenId}
            onChange={(e) => setAlmacenId(e.target.value)}
            className="flex h-10 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
          >
            <option value="">— Sin asignar —</option>
            {almacenes.map((a) => (
              <option key={a.id} value={a.id}>
                {a.codigo} — {a.nombre}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="proyecto">Proyecto</Label>
          <select
            id="proyecto"
            value={proyectoId}
            onChange={(e) => setProyectoId(e.target.value)}
            className="flex h-10 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
          >
            <option value="">— Sin asignar —</option>
            {proyectos.map((p) => (
              <option key={p.id} value={p.id}>
                {p.codigo} — {p.nombre}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="cliente">Cliente</Label>
          <select
            id="cliente"
            value={clienteId}
            onChange={(e) => setClienteId(e.target.value)}
            className="flex h-10 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
          >
            <option value="">— Sin asignar —</option>
            {clientes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.razon_social}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="fi">Fecha instalación</Label>
          <Input
            id="fi"
            type="date"
            value={fechaInstalacion}
            onChange={(e) => setFechaInstalacion(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="ub">Ubicación actual</Label>
          <Input
            id="ub"
            type="text"
            maxLength={200}
            value={ubicacion}
            onChange={(e) => setUbicacion(e.target.value)}
            placeholder="Bodega A, anaquel 3 / Azotea cliente / etc."
          />
        </div>
      </div>

      {error && (
        <p className="mt-3 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="mt-4 flex justify-end gap-2">
        <Button variant="ghost" onClick={() => setEditing(false)}>
          Cancelar
        </Button>
        <Button onClick={guardar} disabled={pending}>
          {pending ? "Guardando…" : "Guardar cambios"}
        </Button>
      </div>
    </section>
  );
}
