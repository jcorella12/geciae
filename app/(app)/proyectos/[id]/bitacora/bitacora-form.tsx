"use client";

import { CloudOff } from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";
import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { notify } from "@/components/ui/notify";
import { useOnline } from "@/lib/hooks/use-online";
import { enqueue } from "@/lib/offline/queue";
import {
  ETIQUETA_TIPO_BITACORA,
  type TipoEventoBitacora,
} from "@/lib/proyecto-extras/state";

import { registrarEventoBitacora } from "./actions";

const TIPOS = Object.keys(ETIQUETA_TIPO_BITACORA) as TipoEventoBitacora[];

export function BitacoraForm({ proyectoId }: { proyectoId: string }) {
  const online = useOnline();
  const formRef = useRef<HTMLFormElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const ahora = new Date().toISOString().slice(0, 16);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = e.currentTarget;
    const fd = new FormData(form);

    if (!online) {
      // Serializar a payload plano (FormData no es serializable en IndexedDB).
      const payload = {
        proyecto_id: proyectoId,
        tipo: (fd.get("tipo") as string) || "nota",
        titulo: (fd.get("titulo") as string) || "",
        descripcion: (fd.get("descripcion") as string) || "",
        fecha: (fd.get("fecha") as string) || new Date().toISOString(),
        tarea_id: (fd.get("tarea_id") as string) || "",
        es_critica: fd.get("es_critica") === "on",
        visible_cliente: fd.get("visible_cliente") === "on",
      };
      if (!payload.descripcion.trim()) {
        setError("Descripción requerida");
        return;
      }
      const tituloChip =
        payload.titulo.trim() ||
        payload.descripcion.slice(0, 40).trim() + "…";
      try {
        await enqueue(
          "bitacora.create",
          payload,
          `Bitácora · ${tituloChip}`,
        );
        notify({
          message: "Guardado offline. Se sincronizará al volver la red.",
          variant: "success",
        });
        form.reset();
      } catch (err) {
        setError(
          `No se pudo guardar offline: ${(err as Error).message}. Intenta cuando regrese la red.`,
        );
      }
      return;
    }

    // Online → server action normal.
    startTransition(async () => {
      const r = await registrarEventoBitacora({ ok: false, error: null }, fd);
      if (!r.ok) {
        setError(r.error ?? "Error");
        return;
      }
      form.reset();
    });
  }

  // Reset el error si el usuario empieza a tipear de nuevo.
  useEffect(() => {
    const f = formRef.current;
    if (!f) return;
    const onInput = () => setError(null);
    f.addEventListener("input", onInput);
    return () => f.removeEventListener("input", onInput);
  }, []);

  return (
    <form
      ref={formRef}
      onSubmit={onSubmit}
      className="rounded-md border border-border bg-card p-4 shadow-sm"
    >
      <input type="hidden" name="proyecto_id" value={proyectoId} />

      <div className="grid grid-cols-12 gap-2">
        <div className="col-span-12 md:col-span-3">
          <Label htmlFor="tipo" className="text-[11px]">
            Tipo
          </Label>
          <select
            id="tipo"
            name="tipo"
            defaultValue="nota"
            className="mt-0.5 h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
          >
            {TIPOS.map((t) => (
              <option key={t} value={t}>
                {ETIQUETA_TIPO_BITACORA[t]}
              </option>
            ))}
          </select>
        </div>
        <div className="col-span-12 md:col-span-4">
          <Label htmlFor="fecha" className="text-[11px]">
            Fecha y hora
          </Label>
          <Input
            id="fecha"
            name="fecha"
            type="datetime-local"
            defaultValue={ahora}
            className="mt-0.5 text-sm"
          />
        </div>
        <div className="col-span-12 md:col-span-5">
          <Label htmlFor="titulo" className="text-[11px]">
            Título (opcional)
          </Label>
          <Input
            id="titulo"
            name="titulo"
            placeholder="Resumen breve"
            className="mt-0.5 text-sm"
          />
        </div>

        <div className="col-span-12">
          <Label htmlFor="descripcion" className="text-[11px]">
            Descripción *
          </Label>
          <textarea
            id="descripcion"
            name="descripcion"
            rows={3}
            required
            placeholder="Detalla el evento, decisión, problema o avance…"
            className="mt-0.5 w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm"
          />
        </div>

        <div className="col-span-12 flex flex-wrap items-center gap-4">
          <label className="flex items-center gap-1.5 text-[12px]">
            <input type="checkbox" name="es_critica" className="h-4 w-4" />
            Marcar como crítica
          </label>
          <label className="flex items-center gap-1.5 text-[12px]">
            <input
              type="checkbox"
              name="visible_cliente"
              className="h-4 w-4"
            />
            Visible para cliente
          </label>
          <div className="ml-auto flex items-center gap-2">
            {!online && (
              <span
                className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10.5px] font-medium text-amber-900 dark:bg-amber-900/30 dark:text-amber-200"
                title="Sin conexión — se guardará localmente y se enviará al volver la red"
              >
                <CloudOff className="h-3 w-3" />
                Modo offline
              </span>
            )}
            <SubmitBtn pending={pending} offline={!online} />
          </div>
        </div>
      </div>

      {error && <p className="mt-2 text-[11px] text-destructive">{error}</p>}
    </form>
  );
}

function SubmitBtn({
  pending,
  offline,
}: {
  pending: boolean;
  offline: boolean;
}) {
  const { pending: formPending } = useFormStatus();
  const isPending = pending || formPending;
  return (
    <Button type="submit" size="sm" disabled={isPending}>
      {isPending
        ? "Guardando…"
        : offline
          ? "Guardar offline"
          : "Registrar evento"}
    </Button>
  );
}
