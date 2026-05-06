"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { registrarHorasIngenieria } from "@/app/(app)/proyectos/[id]/pnl/actions";

type Proyecto = {
  id: string;
  codigo: string;
  nombre: string;
  horasYaRegistradas: number;
};

export function HorasSemanaForm({
  semana,
  totalActual,
  proyectos,
}: {
  semana: string;
  totalActual: number;
  proyectos: Proyecto[];
}) {
  const [pending, startTransition] = useTransition();
  const [horas, setHoras] = useState<Record<string, number>>(
    Object.fromEntries(proyectos.map((p) => [p.id, p.horasYaRegistradas])),
  );
  const [msg, setMsg] = useState<string | null>(null);

  const total = Object.values(horas).reduce((acc, h) => acc + Number(h ?? 0), 0);

  function handleSubmit() {
    startTransition(async () => {
      let ok = 0;
      let fail: string[] = [];
      for (const p of proyectos) {
        const h = horas[p.id] ?? 0;
        if (h === p.horasYaRegistradas) continue; // sin cambio
        const fd = new FormData();
        fd.set("proyecto_id", p.id);
        fd.set("semana_inicio", semana);
        fd.set("horas", String(h));
        const r = await registrarHorasIngenieria(fd);
        if (r.ok) ok++;
        else fail.push(`${p.codigo}: ${r.error}`);
      }
      if (fail.length === 0) {
        setMsg(`✓ ${ok} proyecto(s) actualizados`);
      } else {
        setMsg(`Algunos errores: ${fail.join(" · ")}`);
      }
    });
  }

  return (
    <div className="space-y-3">
      <ul className="space-y-2">
        {proyectos.map((p) => (
          <li
            key={p.id}
            className="flex items-center gap-3 rounded-md border border-border bg-card p-3"
          >
            <div className="flex-1">
              <p className="text-[12px] font-medium leading-tight">
                <span className="font-mono text-[10.5px] text-ink-3">{p.codigo}</span>{" "}
                {p.nombre}
              </p>
            </div>
            <Input
              type="number"
              step="0.5"
              min="0"
              max="60"
              value={horas[p.id] ?? 0}
              onChange={(e) =>
                setHoras({ ...horas, [p.id]: Number(e.target.value) })
              }
              className="w-24"
              disabled={pending}
            />
            <span className="text-[11px] text-ink-3">h</span>
          </li>
        ))}
      </ul>

      <div className="flex items-center justify-between rounded-md bg-bg-2/50 px-4 py-2">
        <span className="text-sm font-medium">Total semana</span>
        <span
          className={`font-mono text-base font-semibold ${
            total > 55
              ? "text-red-700"
              : total < 35
                ? "text-amber-700"
                : "text-emerald-700"
          }`}
        >
          {total.toFixed(1)} h
        </span>
      </div>

      {total < 35 && total > 0 && (
        <p className="text-[11.5px] text-amber-700">
          ⚠ Tienes menos de 35 horas registradas para esta semana.
        </p>
      )}
      {total > 55 && (
        <p className="text-[11.5px] text-red-700">
          ⚠ Tienes más de 55 horas registradas. ¿Es correcto?
        </p>
      )}

      {msg && (
        <p
          className={`text-[12px] ${
            msg.startsWith("✓") ? "text-emerald-700" : "text-red-700"
          }`}
        >
          {msg}
        </p>
      )}

      <Button onClick={handleSubmit} disabled={pending}>
        {pending ? "Guardando…" : "Guardar"}
      </Button>
    </div>
  );
}
