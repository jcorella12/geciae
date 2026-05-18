"use client";

import {
  CheckCircle2,
  ExternalLink,
  GraduationCap,
  Plus,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { confirm } from "@/components/ui/confirm";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { notify } from "@/components/ui/notify";

import {
  asignarCapacitacion,
  completarAsignacion,
  eliminarAsignacion,
} from "../capacitaciones/actions";
import { ESTADOS_FINALIZACION } from "../capacitaciones/state";

type Curso = {
  id: string;
  codigo: string;
  nombre: string;
  vigencia_constancia_meses: number | null;
};

type Asignacion = {
  id: string;
  fecha_programada: string | null;
  fecha_inicio: string | null;
  fecha_fin: string | null;
  estado: string | null;
  calificacion_post: number | null;
  fecha_vencimiento: string | null;
  url_constancia?: string | null;
  capacitaciones: { codigo: string; nombre: string } | null;
};

function fmtFecha(s: string | null) {
  if (!s) return "—";
  const [y, m, d] = s.split("-");
  return `${d}/${m}/${y.slice(2)}`;
}

function badgeEstado(estado: string | null) {
  switch (estado) {
    case "completado":
      return "bg-emerald-100 text-emerald-800";
    case "en_proceso":
      return "bg-amber-100 text-amber-800";
    case "inscrito":
      return "bg-sky-100 text-sky-800";
    case "reprobado":
    case "no_asistio":
      return "bg-red-100 text-red-800";
    default:
      return "bg-secondary text-foreground";
  }
}

const LABEL_ESTADO: Record<string, string> = {
  inscrito: "Inscrito",
  en_proceso: "En proceso",
  completado: "Completado",
  reprobado: "Reprobado",
  no_asistio: "No asistió",
};

export function CapacitacionesSection({
  empleadoId,
  asignaciones,
  cursosCatalogo,
  puedeGestionar,
}: {
  empleadoId: string;
  asignaciones: Asignacion[];
  cursosCatalogo: Curso[];
  puedeGestionar: boolean;
}) {
  const router = useRouter();
  const [showAssign, setShowAssign] = useState(false);
  const [completarId, setCompletarId] = useState<string | null>(null);

  return (
    <section>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-[13.5px] font-semibold">
          <GraduationCap className="h-4 w-4" />
          Capacitaciones
        </h2>
        {puedeGestionar && (
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href="/personas/capacitaciones">Catálogo de cursos</Link>
            </Button>
            <Button size="sm" onClick={() => setShowAssign(true)}>
              <Plus className="mr-1 h-3.5 w-3.5" />
              Asignar capacitación
            </Button>
          </div>
        )}
      </div>

      {asignaciones.length === 0 ? (
        <div className="rounded-md border border-dashed border-border bg-card p-12 text-center text-sm text-ink-3">
          Sin capacitaciones registradas.
          {puedeGestionar && cursosCatalogo.length === 0 && (
            <p className="mt-3 text-[12px]">
              Aún no hay cursos en el catálogo.{" "}
              <Link
                href="/personas/capacitaciones"
                className="text-brand hover:underline"
              >
                Crea el primero →
              </Link>
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {asignaciones.map((a) => (
            <div
              key={a.id}
              className="flex flex-wrap items-center gap-3 rounded-md border border-border bg-card p-3 text-[13px] shadow-xs"
            >
              <div className="min-w-0 flex-1">
                <p className="font-medium">{a.capacitaciones?.nombre ?? "—"}</p>
                <p className="font-mono text-[11px] text-ink-3">
                  {a.capacitaciones?.codigo}
                  {a.fecha_programada && ` · prog: ${fmtFecha(a.fecha_programada)}`}
                  {a.fecha_inicio && ` · ini: ${fmtFecha(a.fecha_inicio)}`}
                  {a.fecha_fin && ` · fin: ${fmtFecha(a.fecha_fin)}`}
                  {a.fecha_vencimiento && ` · vence: ${fmtFecha(a.fecha_vencimiento)}`}
                </p>
              </div>
              <span
                className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${badgeEstado(a.estado)}`}
              >
                {LABEL_ESTADO[a.estado ?? ""] ?? a.estado ?? "—"}
              </span>
              {a.calificacion_post != null && (
                <span className="font-mono text-[12px]">
                  {Number(a.calificacion_post).toFixed(1)}
                </span>
              )}
              {a.url_constancia && (
                <a
                  href={a.url_constancia}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-[11.5px] text-brand hover:underline"
                >
                  <ExternalLink className="h-3 w-3" />
                  constancia
                </a>
              )}
              {puedeGestionar && (
                <div className="flex gap-1">
                  {(a.estado === "inscrito" || a.estado === "en_proceso") && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setCompletarId(a.id)}
                    >
                      <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
                      Cerrar
                    </Button>
                  )}
                  <EliminarBtn
                    asignacionId={a.id}
                    onDone={() => router.refresh()}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showAssign && (
        <AsignarDialog
          empleadoId={empleadoId}
          cursos={cursosCatalogo}
          onClose={() => setShowAssign(false)}
          onDone={() => {
            setShowAssign(false);
            router.refresh();
          }}
        />
      )}

      {completarId && (
        <CompletarDialog
          asignacionId={completarId}
          onClose={() => setCompletarId(null)}
          onDone={() => {
            setCompletarId(null);
            router.refresh();
          }}
        />
      )}
    </section>
  );
}

function EliminarBtn({
  asignacionId,
  onDone,
}: {
  asignacionId: string;
  onDone: () => void;
}) {
  const [pending, startTransition] = useTransition();
  async function go() {
    if (
      !(await confirm({
        message: "¿Eliminar esta asignación?",
        danger: true,
        confirmLabel: "Eliminar",
      }))
    )
      return;
    startTransition(async () => {
      const r = await eliminarAsignacion(asignacionId);
      if (!r.ok) {
        notify({ message: r.error ?? "Error", variant: "error" });
        return;
      }
      onDone();
    });
  }
  return (
    <Button
      type="button"
      size="sm"
      variant="ghost"
      onClick={go}
      disabled={pending}
      className="text-destructive hover:text-destructive"
    >
      <Trash2 className="h-3.5 w-3.5" />
    </Button>
  );
}

function AsignarDialog({
  empleadoId,
  cursos,
  onClose,
  onDone,
}: {
  empleadoId: string;
  cursos: Curso[];
  onClose: () => void;
  onDone: () => void;
}) {
  const [capacitacionId, setCapacitacionId] = useState("");
  const [fechaProgramada, setFechaProgramada] = useState("");
  const [fechaInicio, setFechaInicio] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!capacitacionId) {
      setError("Elige un curso.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const r = await asignarCapacitacion({
        empleadoId,
        capacitacionId,
        fechaProgramada: fechaProgramada || null,
        fechaInicio: fechaInicio || null,
      });
      if (!r.ok) {
        setError(r.error ?? "Error");
        return;
      }
      onDone();
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <form
        onSubmit={submit}
        className="w-full max-w-md rounded-md border border-border bg-card shadow-lg"
      >
        <div className="border-b border-border px-5 py-3">
          <h3 className="text-[15px] font-semibold">Asignar capacitación</h3>
          <p className="mt-0.5 text-[12px] text-ink-3">
            Elige un curso del catálogo y la fecha en que se impartirá.
          </p>
        </div>

        <div className="space-y-4 p-5">
          <div className="space-y-2">
            <Label htmlFor="curso">Curso</Label>
            {cursos.length === 0 ? (
              <p className="rounded-md border border-warning/30 bg-warning/10 px-3 py-2 text-[12.5px]">
                El catálogo está vacío.{" "}
                <Link
                  href="/personas/capacitaciones"
                  className="text-brand hover:underline"
                >
                  Crea el primer curso →
                </Link>
              </p>
            ) : (
              <select
                id="curso"
                required
                value={capacitacionId}
                onChange={(e) => setCapacitacionId(e.target.value)}
                className="flex h-10 w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="">— Elige un curso —</option>
                {cursos.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.codigo} — {c.nombre}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="fp">Fecha programada</Label>
              <Input
                id="fp"
                type="date"
                value={fechaProgramada}
                onChange={(e) => setFechaProgramada(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fi">Fecha de inicio</Label>
              <Input
                id="fi"
                type="date"
                value={fechaInicio}
                onChange={(e) => setFechaInicio(e.target.value)}
              />
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Si pones fecha de inicio, queda como &quot;en proceso&quot;. Si solo
            pones programada, queda como &quot;inscrito&quot;.
          </p>

          {error && (
            <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-3">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={pending || cursos.length === 0}>
            {pending ? "Asignando…" : "Asignar"}
          </Button>
        </div>
      </form>
    </div>
  );
}

function CompletarDialog({
  asignacionId,
  onClose,
  onDone,
}: {
  asignacionId: string;
  onClose: () => void;
  onDone: () => void;
}) {
  const [estado, setEstado] =
    useState<"completado" | "reprobado" | "no_asistio">("completado");
  const [fechaFin, setFechaFin] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [calificacion, setCalificacion] = useState("");
  const [urlConstancia, setUrlConstancia] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const r = await completarAsignacion({
        asignacionId,
        fechaFin,
        estado,
        calificacionPost: calificacion || null,
        urlConstancia: urlConstancia || null,
      });
      if (!r.ok) {
        setError(r.error ?? "Error");
        return;
      }
      onDone();
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <form
        onSubmit={submit}
        className="w-full max-w-md rounded-md border border-border bg-card shadow-lg"
      >
        <div className="border-b border-border px-5 py-3">
          <h3 className="text-[15px] font-semibold">Cerrar capacitación</h3>
          <p className="mt-0.5 text-[12px] text-ink-3">
            Registra el resultado. Si el curso tiene vigencia configurada, se
            calcula automáticamente la fecha de vencimiento.
          </p>
        </div>

        <div className="space-y-4 p-5">
          <div className="space-y-2">
            <Label htmlFor="estado">Resultado</Label>
            <select
              id="estado"
              required
              value={estado}
              onChange={(e) =>
                setEstado(
                  e.target.value as "completado" | "reprobado" | "no_asistio",
                )
              }
              className="flex h-10 w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {ESTADOS_FINALIZACION.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="ff">Fecha fin</Label>
              <Input
                id="ff"
                type="date"
                required
                value={fechaFin}
                onChange={(e) => setFechaFin(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cal">Calificación</Label>
              <Input
                id="cal"
                type="number"
                step="0.1"
                min="0"
                max="100"
                placeholder="0-100"
                value={calificacion}
                onChange={(e) => setCalificacion(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="url">URL de constancia (opcional)</Label>
            <Input
              id="url"
              type="url"
              placeholder="https://… (drive, sharepoint, etc.)"
              value={urlConstancia}
              onChange={(e) => setUrlConstancia(e.target.value)}
            />
          </div>

          {error && (
            <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-3">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={pending}>
            {pending ? "Guardando…" : "Guardar"}
          </Button>
        </div>
      </form>
    </div>
  );
}

