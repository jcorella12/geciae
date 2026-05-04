"use client";

import { UserMinus, UserPlus } from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";
import { useFormState, useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  COLOR_ROL_PROYECTO,
  ETIQUETA_ROL_PROYECTO,
  initialSimpleFormState,
  type RolProyecto,
} from "@/lib/proyecto-extras/state";

import { agregarMiembro, removerMiembro } from "./actions";

type Miembro = {
  id: string;
  usuario_id: string;
  usuario_nombre: string | null;
  rol: RolProyecto;
  fecha_alta: string | null;
  fecha_baja: string | null;
  observaciones: string | null;
};

type UsuarioCandidato = {
  usuario_id: string;
  nombre_completo: string;
  email: string | null;
  puesto: string | null;
};

const fmtFecha = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" }) : "—";

const ROLES = Object.keys(ETIQUETA_ROL_PROYECTO) as RolProyecto[];

export function EquipoPanel({
  proyectoId,
  miembros,
  candidatos,
  puedeEditar,
  pmId,
  vendedorId,
}: {
  proyectoId: string;
  miembros: Miembro[];
  candidatos: UsuarioCandidato[];
  puedeEditar: boolean;
  pmId: string | null;
  vendedorId: string | null;
}) {
  const [showForm, setShowForm] = useState(false);
  const [, startTransition] = useTransition();

  const activos = miembros.filter((m) => !m.fecha_baja);
  const inactivos = miembros.filter((m) => m.fecha_baja);

  const onRemover = (id: string) => {
    if (!confirm("¿Dar de baja a este miembro del proyecto?")) return;
    startTransition(() => {
      removerMiembro(id, proyectoId);
    });
  };

  // Filtrar candidatos: excluir los que ya están activos
  const idsActivos = new Set(activos.map((m) => m.usuario_id));
  const candidatosDisponibles = candidatos.filter(
    (c) => !idsActivos.has(c.usuario_id),
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-[13.5px] font-semibold">
            Equipo del proyecto ({activos.length})
          </h3>
          <p className="mt-0.5 text-[11.5px] text-ink-3">
            PM, vendedor y equipo asignado a este proyecto.
          </p>
        </div>
        {puedeEditar && (
          <button
            onClick={() => setShowForm((s) => !s)}
            className="flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-[12.5px] font-medium hover:bg-bg-2"
          >
            <UserPlus className="h-3.5 w-3.5" />
            {showForm ? "Cancelar" : "Agregar miembro"}
          </button>
        )}
      </div>

      {showForm && (
        <AgregarForm
          proyectoId={proyectoId}
          candidatos={candidatosDisponibles}
          onAdded={() => setShowForm(false)}
        />
      )}

      {activos.length === 0 ? (
        <p className="rounded-md border border-dashed border-border bg-card p-12 text-center text-sm text-ink-3">
          Sin miembros asignados aún. El PM y vendedor se asignan en los datos
          del proyecto; aquí puedes agregar más roles operativos.
        </p>
      ) : (
        <div className="grid gap-2.5 sm:grid-cols-2">
          {activos.map((m) => {
            const esPM = m.usuario_id === pmId;
            const esVendedor = m.usuario_id === vendedorId;
            return (
              <article
                key={m.id}
                className="flex items-start gap-3 rounded-md border border-border bg-card p-3.5 shadow-xs"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-soft text-[12px] font-semibold text-brand-deep">
                  {(m.usuario_nombre ?? "?")
                    .split(" ")
                    .map((p) => p[0])
                    .filter(Boolean)
                    .slice(0, 2)
                    .join("")
                    .toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <p className="text-[13px] font-medium leading-tight">
                      {m.usuario_nombre ?? "(Sin nombre)"}
                    </p>
                    {esPM && (
                      <span className="rounded-full bg-violet-100 px-1.5 py-px text-[9.5px] font-semibold uppercase text-violet-700">
                        PM
                      </span>
                    )}
                    {esVendedor && (
                      <span className="rounded-full bg-amber-100 px-1.5 py-px text-[9.5px] font-semibold uppercase text-amber-700">
                        Vendedor
                      </span>
                    )}
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5">
                    <span
                      className={`rounded-full px-1.5 py-px text-[10.5px] font-medium ${COLOR_ROL_PROYECTO[m.rol]}`}
                    >
                      {ETIQUETA_ROL_PROYECTO[m.rol]}
                    </span>
                    <span className="text-[10.5px] text-ink-3">
                      Desde {fmtFecha(m.fecha_alta)}
                    </span>
                  </div>
                  {m.observaciones && (
                    <p className="mt-1 text-[11px] text-ink-3">
                      {m.observaciones}
                    </p>
                  )}
                </div>
                {puedeEditar && !esPM && !esVendedor && (
                  <button
                    onClick={() => onRemover(m.id)}
                    className="text-ink-4 hover:text-destructive"
                    aria-label="Dar de baja"
                    title="Dar de baja"
                  >
                    <UserMinus className="h-3.5 w-3.5" />
                  </button>
                )}
              </article>
            );
          })}
        </div>
      )}

      {inactivos.length > 0 && (
        <details className="rounded-md border border-divider bg-bg-2/40 p-3">
          <summary className="cursor-pointer text-[12px] text-ink-3 hover:text-ink-1">
            Histórico ({inactivos.length} con baja)
          </summary>
          <ul className="mt-2 space-y-1.5">
            {inactivos.map((m) => (
              <li key={m.id} className="text-[11.5px] text-ink-3">
                {m.usuario_nombre} · {ETIQUETA_ROL_PROYECTO[m.rol]} ·{" "}
                {fmtFecha(m.fecha_alta)} → {fmtFecha(m.fecha_baja)}
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}

function AgregarForm({
  proyectoId,
  candidatos,
  onAdded,
}: {
  proyectoId: string;
  candidatos: UsuarioCandidato[];
  onAdded: () => void;
}) {
  const [state, formAction] = useFormState(agregarMiembro, initialSimpleFormState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) {
      formRef.current?.reset();
      onAdded();
    }
  }, [state.ok, onAdded]);

  return (
    <form
      ref={formRef}
      action={formAction}
      className="rounded-md border border-border bg-card p-4 shadow-sm"
    >
      <input type="hidden" name="proyecto_id" value={proyectoId} />

      <div className="grid grid-cols-12 gap-2">
        <div className="col-span-12 md:col-span-6">
          <Label htmlFor="usuario_id" className="text-[11px]">
            Persona *
          </Label>
          <select
            id="usuario_id"
            name="usuario_id"
            required
            defaultValue=""
            className="mt-0.5 h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
          >
            <option value="">— Selecciona persona —</option>
            {candidatos.map((c) => (
              <option key={c.usuario_id} value={c.usuario_id}>
                {c.nombre_completo}
                {c.puesto ? ` · ${c.puesto}` : ""}
              </option>
            ))}
          </select>
          {candidatos.length === 0 && (
            <p className="mt-1 text-[10.5px] text-ink-3">
              Solo aparecen personas con cuenta de usuario activa.
            </p>
          )}
        </div>
        <div className="col-span-12 md:col-span-6">
          <Label htmlFor="rol" className="text-[11px]">
            Rol en el proyecto *
          </Label>
          <select
            id="rol"
            name="rol"
            required
            defaultValue="observador"
            className="mt-0.5 h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
          >
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {ETIQUETA_ROL_PROYECTO[r]}
              </option>
            ))}
          </select>
        </div>
        <div className="col-span-12">
          <Label htmlFor="observaciones" className="text-[11px]">
            Observaciones (opcional)
          </Label>
          <Input
            id="observaciones"
            name="observaciones"
            placeholder="Responsable de cuadrilla, suplente, etc."
            className="mt-0.5 text-sm"
          />
        </div>
      </div>

      {state.error && (
        <p className="mt-2 text-[11px] text-destructive">{state.error}</p>
      )}

      <div className="mt-3 flex justify-end">
        <SubmitBtn />
      </div>
    </form>
  );
}

function SubmitBtn() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" disabled={pending}>
      {pending ? "Guardando…" : "Agregar al equipo"}
    </Button>
  );
}
