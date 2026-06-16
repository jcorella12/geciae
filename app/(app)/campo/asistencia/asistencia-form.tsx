"use client";

import { Check, Users2, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

import { guardarAsistenciaCampo } from "./actions";

type EmpleadoFila = {
  id: string;
  nombre: string;
  puesto: string | null;
  presente: boolean;
  horas: number | null;
  yaRegistrado: boolean;
};

export function AsistenciaForm({
  proyecto,
  fecha,
  empleados,
  mostrandoTodos,
}: {
  proyecto: { id: string; codigo: string; nombre: string };
  fecha: string;
  empleados: EmpleadoFila[];
  mostrandoTodos: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [estado, setEstado] = useState<
    Record<string, { presente: boolean; horas: number | null }>
  >(
    Object.fromEntries(
      empleados.map((e) => [e.id, { presente: e.presente, horas: e.horas }]),
    ),
  );

  const presentes = Object.values(estado).filter((e) => e.presente).length;

  function togglePresente(id: string) {
    setEstado((prev) => {
      const actual = prev[id];
      const presente = !actual.presente;
      return {
        ...prev,
        [id]: { presente, horas: presente ? (actual.horas ?? 8) : null },
      };
    });
  }

  function setHoras(id: string, horas: number) {
    setEstado((prev) => ({ ...prev, [id]: { ...prev[id], horas } }));
  }

  function todosPresentes() {
    setEstado((prev) =>
      Object.fromEntries(
        Object.entries(prev).map(([id, v]) => [
          id,
          { presente: true, horas: v.horas ?? 8 },
        ]),
      ),
    );
  }

  function cambiarFecha(nueva: string) {
    router.push(`/campo/asistencia?proyecto=${proyecto.id}&fecha=${nueva}`);
  }

  function guardar() {
    setMsg(null);
    startTransition(async () => {
      const registros = empleados.map((e) => ({
        empleadoId: e.id,
        presente: estado[e.id].presente,
        horas: estado[e.id].horas,
      }));
      const r = await guardarAsistenciaCampo(proyecto.id, fecha, registros);
      if (r.ok) {
        setMsg(`✓ Asistencia guardada (${r.guardados} personas)`);
        router.refresh();
      } else {
        setMsg(`Error: ${r.error}`);
      }
    });
  }

  return (
    <div className="mx-auto w-full max-w-md px-4 py-6">
      <div className="mb-3">
        <Link
          href="/campo/asistencia"
          className="text-[12px] text-brand hover:underline"
        >
          ← Cambiar proyecto
        </Link>
        <div className="mt-1.5 flex items-center gap-2">
          <Users2 className="h-5 w-5 text-brand" />
          <h1 className="text-[19px] font-semibold leading-tight">Asistencia</h1>
        </div>
        <p className="mt-0.5 text-[12.5px] text-ink-3">
          <span className="font-mono text-[11px]">{proyecto.codigo}</span>{" "}
          {proyecto.nombre}
        </p>
      </div>

      {/* Fecha */}
      <div className="mb-4 flex items-center gap-2">
        <label className="text-[12.5px] font-medium">Día:</label>
        <Input
          type="date"
          value={fecha}
          onChange={(e) => cambiarFecha(e.target.value)}
          className="w-44"
        />
      </div>

      {mostrandoTodos && (
        <p className="mb-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-[11.5px] text-amber-900">
          No tienes una cuadrilla asignada (jefe directo). Se muestran todos los
          empleados activos de la empresa. Pide a RH que configure tu cuadrilla
          para verla filtrada.
        </p>
      )}

      {empleados.length === 0 ? (
        <p className="rounded-md border border-dashed border-border bg-card p-6 text-center text-[13px] text-ink-3">
          No hay empleados activos para mostrar.
        </p>
      ) : (
        <>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[12px] text-ink-3">
              {presentes} de {empleados.length} presentes
            </span>
            <button
              type="button"
              onClick={todosPresentes}
              disabled={pending}
              className="text-[12px] font-medium text-brand hover:underline"
            >
              Marcar todos
            </button>
          </div>

          <ul className="space-y-2">
            {empleados.map((e) => {
              const st = estado[e.id];
              return (
                <li
                  key={e.id}
                  className="flex items-center gap-3 rounded-md border border-border bg-card p-3"
                >
                  <button
                    type="button"
                    onClick={() => togglePresente(e.id)}
                    disabled={pending}
                    aria-label={st.presente ? "Marcar ausente" : "Marcar presente"}
                    className={cn(
                      "flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition",
                      st.presente
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-red-100 text-red-600",
                    )}
                  >
                    {st.presente ? (
                      <Check className="h-5 w-5" />
                    ) : (
                      <X className="h-5 w-5" />
                    )}
                  </button>
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-1 text-[13px] font-medium">
                      {e.nombre}
                    </p>
                    {e.puesto && (
                      <p className="text-[10.5px] text-ink-3">{e.puesto}</p>
                    )}
                  </div>
                  {st.presente && (
                    <div className="flex items-center gap-1">
                      <Input
                        type="number"
                        step="0.5"
                        min="0"
                        max="24"
                        value={st.horas ?? 0}
                        onChange={(ev) =>
                          setHoras(e.id, Number(ev.target.value))
                        }
                        disabled={pending}
                        className="w-16"
                      />
                      <span className="text-[11px] text-ink-3">h</span>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>

          {msg && (
            <p
              className={cn(
                "mt-3 text-[12.5px]",
                msg.startsWith("✓") ? "text-emerald-700" : "text-red-700",
              )}
            >
              {msg}
            </p>
          )}

          <Button
            onClick={guardar}
            disabled={pending}
            className="mt-4 w-full"
            size="lg"
          >
            {pending ? "Guardando…" : "Guardar asistencia"}
          </Button>
        </>
      )}
    </div>
  );
}
