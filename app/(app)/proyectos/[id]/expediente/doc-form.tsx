"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { actualizarDocExpediente } from "./actions";

type Doc = {
  id: string;
  codigo_documento: string;
  nombre: string;
  obligatorio: boolean;
  requerido_para_estado: string | null;
  estado: string;
  url_archivo: string | null;
  fecha_recibido: string | null;
  observaciones: string | null;
};

const ESTADOS = [
  { value: "pendiente", label: "Pendiente", color: "bg-zinc-100 text-zinc-700" },
  { value: "en_revision", label: "En revisión", color: "bg-amber-100 text-amber-700" },
  { value: "aprobado", label: "Aprobado", color: "bg-emerald-100 text-emerald-700" },
  { value: "no_aplica", label: "N/A", color: "bg-slate-100 text-slate-600" },
] as const;

export function DocExpedienteRow({
  doc,
  puedeEditar,
}: {
  doc: Doc;
  puedeEditar: boolean;
}) {
  const [editando, setEditando] = useState(false);
  const [state, formAction] = useFormState(actualizarDocExpediente, {
    ok: false,
    error: null,
  });

  const estado = ESTADOS.find((e) => e.value === doc.estado) ?? ESTADOS[0];

  if (!editando) {
    return (
      <tr className="hover:bg-secondary/30">
        <td className="px-4 py-2 font-mono text-xs">{doc.codigo_documento}</td>
        <td className="px-4 py-2">
          {doc.nombre}
          {doc.obligatorio && (
            <span className="ml-2 text-[10px] text-rose-700">obligatorio</span>
          )}
        </td>
        <td className="px-4 py-2 text-xs">
          {doc.requerido_para_estado ?? "—"}
        </td>
        <td className="px-4 py-2">
          <span
            className={`inline-flex rounded-full px-2 py-0.5 text-xs ${estado.color}`}
          >
            {estado.label}
          </span>
        </td>
        <td className="px-4 py-2 text-xs">
          {doc.url_archivo ? (
            <a
              href={doc.url_archivo}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              ver archivo
            </a>
          ) : (
            <span className="text-muted-foreground">—</span>
          )}
        </td>
        <td className="px-4 py-2 text-xs">{doc.fecha_recibido ?? "—"}</td>
        <td className="px-4 py-2 text-right">
          {puedeEditar && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setEditando(true)}
            >
              Editar
            </Button>
          )}
        </td>
      </tr>
    );
  }

  return (
    <tr className="border-l-4 border-primary bg-primary/5">
      <td colSpan={7} className="px-4 py-4">
        <form action={formAction} className="space-y-3">
          <input type="hidden" name="expediente_id" value={doc.id} />
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1">
              <Label htmlFor={`estado-${doc.id}`} className="text-xs">
                Estado
              </Label>
              <select
                id={`estado-${doc.id}`}
                name="estado"
                defaultValue={doc.estado}
                className="flex h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
              >
                {ESTADOS.map((e) => (
                  <option key={e.value} value={e.value}>
                    {e.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label htmlFor={`fecha-${doc.id}`} className="text-xs">
                Fecha recibido
              </Label>
              <Input
                id={`fecha-${doc.id}`}
                name="fecha_recibido"
                type="date"
                defaultValue={doc.fecha_recibido ?? ""}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor={`url-${doc.id}`} className="text-xs">
                URL archivo
              </Label>
              <Input
                id={`url-${doc.id}`}
                name="url_archivo"
                type="url"
                placeholder="https://drive.google.com/..."
                defaultValue={doc.url_archivo ?? ""}
              />
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor={`obs-${doc.id}`} className="text-xs">
              Observaciones
            </Label>
            <textarea
              id={`obs-${doc.id}`}
              name="observaciones"
              rows={2}
              maxLength={1000}
              defaultValue={doc.observaciones ?? ""}
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </div>
          {state.error && (
            <p className="text-xs text-destructive">{state.error}</p>
          )}
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setEditando(false)}
            >
              Cancelar
            </Button>
            <SubmitBtn />
          </div>
        </form>
      </td>
    </tr>
  );
}

function SubmitBtn() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" disabled={pending}>
      {pending ? "Guardando…" : "Guardar"}
    </Button>
  );
}
