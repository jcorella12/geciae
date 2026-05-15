"use client";

import { CheckCircle2, Search, Users2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { asignarCapacitacionMasiva } from "./actions";

const codigoColor: Record<string, string> = {
  PSE: "bg-pse",
  CIAE: "bg-ciae",
  IED: "bg-ied",
  LIMSON: "bg-limson",
};

export type EmpleadoLite = {
  id: string;
  nombre_completo: string;
  numero_empleado: string;
  puesto: string;
  empresa_id: string;
  empresa_codigo: string;
  categoria: string;
};

type Props = {
  curso: { id: string; codigo: string; nombre: string };
  empleados: EmpleadoLite[];
  onClose: () => void;
};

export function AsignarMasivoDialog({ curso, empleados, onClose }: Props) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [empresaFiltro, setEmpresaFiltro] = useState<string>("");
  const [seleccion, setSeleccion] = useState<Set<string>>(new Set());
  const [fechaProgramada, setFechaProgramada] = useState("");
  const [fechaInicio, setFechaInicio] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<{
    insertados: number;
    saltados: number;
    sinPermiso: number;
  } | null>(null);

  const empresasDisponibles = useMemo(
    () =>
      Array.from(new Set(empleados.map((e) => e.empresa_codigo))).sort(),
    [empleados],
  );

  const empleadosFiltrados = useMemo(() => {
    const qNorm = q.trim().toLowerCase();
    return empleados.filter((e) => {
      if (empresaFiltro && e.empresa_codigo !== empresaFiltro) return false;
      if (!qNorm) return true;
      return (
        e.nombre_completo.toLowerCase().includes(qNorm) ||
        e.numero_empleado.toLowerCase().includes(qNorm) ||
        e.puesto.toLowerCase().includes(qNorm)
      );
    });
  }, [empleados, q, empresaFiltro]);

  function toggleUno(id: string) {
    setSeleccion((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleVisibles() {
    const ids = empleadosFiltrados.map((e) => e.id);
    const todosSeleccionados = ids.every((id) => seleccion.has(id));
    setSeleccion((prev) => {
      const next = new Set(prev);
      if (todosSeleccionados) {
        ids.forEach((id) => next.delete(id));
      } else {
        ids.forEach((id) => next.add(id));
      }
      return next;
    });
  }

  function limpiar() {
    setSeleccion(new Set());
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (seleccion.size === 0) {
      setError("Selecciona al menos un empleado.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const r = await asignarCapacitacionMasiva({
        capacitacionId: curso.id,
        empleadoIds: Array.from(seleccion),
        fechaProgramada: fechaProgramada || null,
        fechaInicio: fechaInicio || null,
      });
      if (!r.ok && r.insertados === 0) {
        setError(r.error ?? "Error desconocido");
        return;
      }
      setOk({
        insertados: r.insertados,
        saltados: r.saltados,
        sinPermiso: r.sinPermiso,
      });
      router.refresh();
    });
  }

  const visiblesIds = empleadosFiltrados.map((e) => e.id);
  const todosVisiblesSeleccionados =
    visiblesIds.length > 0 && visiblesIds.every((id) => seleccion.has(id));

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="flex max-h-[90vh] w-full max-w-3xl flex-col rounded-md border border-border bg-card shadow-lg">
        <div className="border-b border-border px-5 py-3">
          <h3 className="flex items-center gap-2 text-[15px] font-semibold">
            <Users2 className="h-4 w-4" />
            Asignar a varios empleados
          </h3>
          <p className="mt-0.5 text-[12px] text-ink-3">
            Curso:{" "}
            <span className="font-mono">{curso.codigo}</span> —{" "}
            <span className="font-medium">{curso.nombre}</span>
          </p>
        </div>

        {ok ? (
          <div className="flex-1 overflow-y-auto p-5">
            <div className="rounded-md border border-emerald-300 bg-emerald-50 p-4">
              <p className="flex items-center gap-2 text-[14px] font-medium text-emerald-900">
                <CheckCircle2 className="h-5 w-5" />
                Asignaciones creadas
              </p>
              <ul className="mt-3 space-y-1 text-[13px] text-emerald-900">
                <li>
                  <span className="font-semibold">{ok.insertados}</span>{" "}
                  empleado(s) inscritos al curso.
                </li>
                {ok.saltados > 0 && (
                  <li>
                    <span className="font-semibold">{ok.saltados}</span> ya
                    estaban inscritos o en proceso — se saltaron para no
                    duplicar.
                  </li>
                )}
                {ok.sinPermiso > 0 && (
                  <li className="text-amber-800">
                    <span className="font-semibold">{ok.sinPermiso}</span> no
                    tienes permiso para asignarles capacitaciones.
                  </li>
                )}
              </ul>
            </div>
          </div>
        ) : (
          <form onSubmit={submit} className="flex flex-1 flex-col overflow-hidden">
            {/* Filtros + fechas */}
            <div className="grid grid-cols-1 gap-3 border-b border-border px-5 py-3 sm:grid-cols-4">
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="q" className="text-[11px]">
                  Buscar (nombre, número, puesto)
                </Label>
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="q"
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    className="pl-7"
                    placeholder="..."
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="emp" className="text-[11px]">
                  Empresa
                </Label>
                <select
                  id="emp"
                  value={empresaFiltro}
                  onChange={(e) => setEmpresaFiltro(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="">Todas</option>
                  {empresasDisponibles.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:col-span-1 sm:grid-cols-1">
                <div className="space-y-1.5">
                  <Label htmlFor="fp" className="text-[11px]">
                    Fecha programada
                  </Label>
                  <Input
                    id="fp"
                    type="date"
                    value={fechaProgramada}
                    onChange={(e) => setFechaProgramada(e.target.value)}
                  />
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 border-b border-border px-5 pb-3">
              <div className="space-y-1.5">
                <Label htmlFor="fi" className="text-[11px]">
                  Fecha inicio (opcional)
                </Label>
                <Input
                  id="fi"
                  type="date"
                  value={fechaInicio}
                  onChange={(e) => setFechaInicio(e.target.value)}
                />
              </div>
              <p className="self-end pb-2 text-[10.5px] leading-tight text-muted-foreground">
                Si pones inicio, queda &quot;en proceso&quot;. Si solo
                programada, &quot;inscrito&quot;.
              </p>
            </div>

            {/* Bulk actions */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-secondary/30 px-5 py-2 text-[12px]">
              <div>
                <button
                  type="button"
                  onClick={toggleVisibles}
                  className="text-brand hover:underline"
                >
                  {todosVisiblesSeleccionados
                    ? "Quitar selección de visibles"
                    : `Seleccionar todos visibles (${empleadosFiltrados.length})`}
                </button>
                {seleccion.size > 0 && (
                  <>
                    {" · "}
                    <button
                      type="button"
                      onClick={limpiar}
                      className="text-brand hover:underline"
                    >
                      Limpiar selección
                    </button>
                  </>
                )}
              </div>
              <p>
                <span className="font-semibold">{seleccion.size}</span>{" "}
                seleccionado(s)
              </p>
            </div>

            {/* Lista de empleados */}
            <div className="flex-1 overflow-y-auto p-2">
              {empleadosFiltrados.length === 0 ? (
                <p className="p-6 text-center text-sm text-muted-foreground">
                  Sin empleados que coincidan con el filtro.
                </p>
              ) : (
                <ul className="space-y-0.5">
                  {empleadosFiltrados.map((e) => {
                    const checked = seleccion.has(e.id);
                    return (
                      <li key={e.id}>
                        <label
                          className={`flex cursor-pointer items-center gap-3 rounded-md border px-3 py-2 text-[13px] transition ${
                            checked
                              ? "border-brand/50 bg-brand/5"
                              : "border-transparent hover:bg-secondary/40"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleUno(e.id)}
                            className="h-4 w-4 rounded border-border"
                          />
                          <span
                            className={`inline-block h-2 w-2 shrink-0 rounded-full ${
                              codigoColor[e.empresa_codigo] ??
                              "bg-muted-foreground"
                            }`}
                          />
                          <span className="min-w-0 flex-1">
                            <span className="font-medium">
                              {e.nombre_completo}
                            </span>
                            <span className="ml-2 font-mono text-[11px] text-muted-foreground">
                              {e.numero_empleado}
                            </span>
                            <span className="block text-[11px] text-muted-foreground">
                              {e.empresa_codigo} · {e.puesto}
                            </span>
                          </span>
                        </label>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            {error && (
              <div className="border-t border-border px-5 py-2">
                <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {error}
                </p>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-3">
              <Button type="button" variant="ghost" onClick={onClose}>
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={pending || seleccion.size === 0}
              >
                {pending
                  ? "Asignando…"
                  : `Inscribir ${seleccion.size} empleado(s)`}
              </Button>
            </div>
          </form>
        )}

        {ok && (
          <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-3">
            <Button onClick={onClose}>Cerrar</Button>
          </div>
        )}
      </div>
    </div>
  );
}
