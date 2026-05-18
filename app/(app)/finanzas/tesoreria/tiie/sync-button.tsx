"use client";

import { useTransition } from "react";

import { Button } from "@/components/ui/button";
import { notify } from "@/components/ui/notify";

export function TiieSyncButton({ habilitado }: { habilitado: boolean }) {
  const [pending, start] = useTransition();

  function sync() {
    start(async () => {
      try {
        const res = await fetch("/api/tiie/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        });
        const json = await res.json();
        if (!res.ok || !json.ok) {
          notify({
            message: json.error ?? "Error desconocido",
            variant: "error",
          });
          return;
        }
        notify({
          message: `TIIE actualizada: ${json.fecha} → ${(Number(json.tasa) * 100).toFixed(4)}%`,
          variant: "success",
        });
        window.location.reload();
      } catch (e) {
        notify({ message: (e as Error).message, variant: "error" });
      }
    });
  }

  if (!habilitado) return null;
  return (
    <Button onClick={sync} disabled={pending} variant="outline">
      {pending ? "Sincronizando…" : "Sincronizar con Banxico"}
    </Button>
  );
}

export function TiieRangeForm({ habilitado }: { habilitado: boolean }) {
  const [pending, start] = useTransition();

  function syncRango(formData: FormData) {
    const desde = formData.get("desde") as string;
    const hasta = formData.get("hasta") as string;
    if (!desde || !hasta) return;
    start(async () => {
      try {
        const res = await fetch("/api/tiie/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ desde, hasta }),
        });
        const json = await res.json();
        if (!res.ok || !json.ok) {
          notify({
            message: json.error ?? "Error desconocido",
            variant: "error",
          });
          return;
        }
        notify({
          message: `Sincronizadas ${json.insertados} fechas.`,
          variant: "success",
        });
        window.location.reload();
      } catch (e) {
        notify({ message: (e as Error).message, variant: "error" });
      }
    });
  }

  if (!habilitado) return null;
  return (
    <form action={syncRango} className="flex flex-wrap items-end gap-2">
      <div>
        <label className="block text-xs text-muted-foreground">Desde</label>
        <input
          type="date"
          name="desde"
          required
          className="h-9 rounded-md border border-input bg-background px-2 text-sm"
        />
      </div>
      <div>
        <label className="block text-xs text-muted-foreground">Hasta</label>
        <input
          type="date"
          name="hasta"
          required
          className="h-9 rounded-md border border-input bg-background px-2 text-sm"
        />
      </div>
      <Button type="submit" variant="outline" disabled={pending}>
        {pending ? "Cargando…" : "Importar rango"}
      </Button>
    </form>
  );
}
