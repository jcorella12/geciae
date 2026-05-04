"use client";

import { Send } from "lucide-react";
import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { useFormState, useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  ETIQUETA_TIPO_SOLICITUD,
  initialComentarioState,
  initialSimpleSolicitudState,
} from "@/lib/solicitudes/state";

import {
  agregarComentario,
  aprobarSolicitud,
  asignarSolicitud,
  cerrarSolicitud,
  marcarEjecutada,
  pasarAEnRevision,
  rechazarSolicitud,
} from "./actions";
import type { Persona, SolicitudListItem } from "./solicitudes-panel";

const fmtMxn = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
});

const fmtFechaHora = (d: string | null) =>
  !d
    ? "—"
    : new Date(d).toLocaleString("es-MX", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });

type Comentario = {
  id: string;
  autor_id: string;
  autor_nombre: string | null;
  texto: string;
  created_at: string;
  menciones: string[];
};

/**
 * Detalle inline de una solicitud (se expande dentro de la lista).
 *
 * Carga comentarios del servidor (vía fetch a una mini ruta interna del
 * panel padre — implementado server-side), y permite acciones según
 * estado y permiso.
 */
export function SolicitudDetalle({
  solicitud,
  proyectoId,
  candidatosAsignacion,
  puedeAprobar,
  esCEOoDirector,
  yo,
}: {
  solicitud: SolicitudListItem;
  proyectoId: string;
  candidatosAsignacion: Persona[];
  puedeAprobar: boolean;
  esCEOoDirector: boolean;
  yo: string | null;
}) {
  const [comentarios, setComentarios] = useState<Comentario[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Cargar comentarios via fetch al endpoint interno
  useEffect(() => {
    setIsLoading(true);
    fetch(`/proyectos/${proyectoId}/solicitudes/${solicitud.id}/comentarios`, {
      cache: "no-store",
    })
      .then((r) => (r.ok ? r.json() : { comentarios: [] }))
      .then((j) => {
        setComentarios(j.comentarios ?? []);
        setIsLoading(false);
      })
      .catch(() => setIsLoading(false));
  }, [proyectoId, solicitud.id]);

  const esSolicitante = yo === solicitud.solicitante_id;
  const esAsignado = yo === solicitud.asignado_a_id;

  return (
    <div className="border-t border-border bg-bg-2/30 p-4 text-[12.5px]">
      {/* Datos */}
      <div className="grid gap-2 sm:grid-cols-2">
        {solicitud.descripcion && (
          <div className="sm:col-span-2">
            <p className="text-[10.5px] uppercase tracking-wider text-ink-3">
              Descripción
            </p>
            <p className="mt-0.5 whitespace-pre-wrap">
              {solicitud.descripcion}
            </p>
          </div>
        )}
        <Field label="Tipo" value={ETIQUETA_TIPO_SOLICITUD[solicitud.tipo]} />
        <Field
          label="Monto estimado"
          value={
            solicitud.monto_estimado != null
              ? fmtMxn.format(Number(solicitud.monto_estimado))
              : "—"
          }
          mono
        />
        <Field
          label="Solicitante"
          value={
            candidatosAsignacion.find((c) => c.user_id === solicitud.solicitante_id)
              ?.nombre ?? solicitud.solicitante_id.slice(0, 8)
          }
        />
        <Field
          label="Asignado a"
          value={
            solicitud.asignado_a_id
              ? candidatosAsignacion.find(
                  (c) => c.user_id === solicitud.asignado_a_id,
                )?.nombre ?? solicitud.asignado_a_id.slice(0, 8)
              : "Sin asignar"
          }
        />
        <Field label="Creada" value={fmtFechaHora(solicitud.created_at)} />
        {solicitud.resuelta_at && (
          <Field
            label="Resuelta"
            value={fmtFechaHora(solicitud.resuelta_at)}
          />
        )}
        {solicitud.razon_rechazo && (
          <div className="sm:col-span-2 rounded-md border border-red-300 bg-red-50 p-2">
            <p className="text-[10.5px] font-semibold uppercase tracking-wider text-red-800">
              Motivo de rechazo
            </p>
            <p className="text-[12px] text-red-900">
              {solicitud.razon_rechazo}
            </p>
          </div>
        )}

        {/* Entidades vinculadas (sprint 4.3 link inverso) */}
        {Object.keys(solicitud.entidades_relacionadas).length > 0 && (
          <div className="sm:col-span-2 rounded-md border border-border bg-card p-2">
            <p className="text-[10.5px] font-semibold uppercase tracking-wider text-ink-3">
              Entidades vinculadas
            </p>
            <ul className="mt-1 space-y-0.5 text-[11.5px]">
              {Object.entries(solicitud.entidades_relacionadas).map(
                ([k, v]) => (
                  <li key={k}>
                    {k}: <code className="font-mono">{v}</code>
                  </li>
                ),
              )}
            </ul>
          </div>
        )}
      </div>

      {/* Acciones por estado */}
      <ActionsBlock
        solicitud={solicitud}
        candidatosAsignacion={candidatosAsignacion}
        puedeAprobar={puedeAprobar}
        esCEOoDirector={esCEOoDirector}
        esSolicitante={esSolicitante}
        esAsignado={esAsignado}
      />

      {/* Comentarios */}
      <section className="mt-4">
        <h4 className="mb-2 text-[12px] font-semibold uppercase tracking-wider text-ink-3">
          Comentarios ({comentarios.length})
        </h4>
        {isLoading ? (
          <p className="text-[11.5px] text-ink-3">Cargando…</p>
        ) : comentarios.length === 0 ? (
          <p className="text-[11.5px] text-ink-3">Sin comentarios.</p>
        ) : (
          <ol className="space-y-2">
            {comentarios.map((c) => (
              <li
                key={c.id}
                className="rounded-md border border-border bg-card p-2"
              >
                <div className="flex items-center justify-between gap-2 text-[10.5px] text-ink-3">
                  <span className="font-medium text-ink-1">
                    {c.autor_nombre ?? c.autor_id.slice(0, 8)}
                  </span>
                  <span>{fmtFechaHora(c.created_at)}</span>
                </div>
                <p className="mt-0.5 whitespace-pre-wrap text-[12px]">
                  {c.texto}
                </p>
              </li>
            ))}
          </ol>
        )}

        {/* Form comentario */}
        <ComentarioForm
          solicitudId={solicitud.id}
          candidatosMencion={candidatosAsignacion}
          onAdded={(nuevo) => setComentarios((p) => [...p, nuevo])}
        />
      </section>
    </div>
  );
}

function Field({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div>
      <p className="text-[10.5px] uppercase tracking-wider text-ink-3">
        {label}
      </p>
      <p className={`mt-0.5 ${mono ? "font-mono" : ""}`}>{value}</p>
    </div>
  );
}

function ActionsBlock({
  solicitud,
  candidatosAsignacion,
  puedeAprobar,
  esCEOoDirector,
  esSolicitante,
  esAsignado,
}: {
  solicitud: SolicitudListItem;
  candidatosAsignacion: Persona[];
  puedeAprobar: boolean;
  esCEOoDirector: boolean;
  esSolicitante: boolean;
  esAsignado: boolean;
}) {
  const { estado } = solicitud;
  const [open, setOpen] = useState<
    "rechazar" | "asignar" | "aprobar" | "ejecutar" | null
  >(null);

  const showAprobarRechazar =
    puedeAprobar && (estado === "solicitada" || estado === "en_revision");
  const showEjecutar = esSolicitante && estado === "aprobada";
  const showCerrar =
    esCEOoDirector && ["ejecutada", "aprobada", "rechazada"].includes(estado);
  const showAsignar = esCEOoDirector;
  const showRevisar =
    (puedeAprobar || esAsignado) && estado === "solicitada";

  const acciones =
    showAprobarRechazar ||
    showEjecutar ||
    showCerrar ||
    showAsignar ||
    showRevisar;
  if (!acciones) return null;

  return (
    <div className="mt-4 rounded-md border border-border bg-card p-2">
      <div className="flex flex-wrap items-center gap-1.5">
        {showRevisar && estado === "solicitada" && (
          <RevisarBtn solicitudId={solicitud.id} />
        )}
        {showAprobarRechazar && (
          <>
            <Button
              type="button"
              size="sm"
              variant={open === "aprobar" ? "outline" : "default"}
              onClick={() => setOpen(open === "aprobar" ? null : "aprobar")}
            >
              Aprobar
            </Button>
            <Button
              type="button"
              size="sm"
              variant={open === "rechazar" ? "outline" : "destructive"}
              onClick={() =>
                setOpen(open === "rechazar" ? null : "rechazar")
              }
            >
              Rechazar
            </Button>
          </>
        )}
        {showEjecutar && (
          <Button
            type="button"
            size="sm"
            variant={open === "ejecutar" ? "outline" : "default"}
            onClick={() => setOpen(open === "ejecutar" ? null : "ejecutar")}
          >
            Marcar ejecutada
          </Button>
        )}
        {showCerrar && <CerrarBtn solicitudId={solicitud.id} />}
        {showAsignar && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setOpen(open === "asignar" ? null : "asignar")}
          >
            {solicitud.asignado_a_id ? "Reasignar" : "Asignar"}
          </Button>
        )}
      </div>

      {open === "aprobar" && (
        <SimpleForm
          actionFn={aprobarSolicitud}
          solicitudId={solicitud.id}
          fieldName="comentario"
          fieldLabel="Comentario opcional"
          submitLabel="Aprobar"
          onDone={() => setOpen(null)}
        />
      )}
      {open === "rechazar" && (
        <SimpleForm
          actionFn={rechazarSolicitud}
          solicitudId={solicitud.id}
          fieldName="razon"
          fieldLabel="Motivo del rechazo *"
          submitLabel="Rechazar"
          required
          minLength={5}
          onDone={() => setOpen(null)}
        />
      )}
      {open === "ejecutar" && (
        <SimpleForm
          actionFn={marcarEjecutada}
          solicitudId={solicitud.id}
          fieldName="comentario"
          fieldLabel="Notas de ejecución (opcional)"
          submitLabel="Marcar ejecutada"
          onDone={() => setOpen(null)}
        />
      )}
      {open === "asignar" && (
        <AsignarForm
          solicitudId={solicitud.id}
          candidatos={candidatosAsignacion}
          actualId={solicitud.asignado_a_id}
          onDone={() => setOpen(null)}
        />
      )}
    </div>
  );
}

function SimpleForm({
  actionFn,
  solicitudId,
  fieldName,
  fieldLabel,
  submitLabel,
  required,
  minLength,
  onDone,
}: {
  actionFn: typeof aprobarSolicitud;
  solicitudId: string;
  fieldName: string;
  fieldLabel: string;
  submitLabel: string;
  required?: boolean;
  minLength?: number;
  onDone: () => void;
}) {
  const [state, formAction] = useFormState(
    actionFn,
    initialSimpleSolicitudState,
  );
  useEffect(() => {
    if (state.ok) onDone();
  }, [state.ok, onDone]);
  return (
    <form action={formAction} className="mt-2 space-y-2">
      <input type="hidden" name="solicitud_id" value={solicitudId} />
      <textarea
        name={fieldName}
        rows={2}
        required={required}
        minLength={minLength}
        maxLength={2000}
        placeholder={fieldLabel}
        className="w-full rounded-md border border-input bg-background px-2 py-1 text-[12px]"
      />
      {state.error && (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-2 py-1 text-[11px] text-destructive">
          {state.error}
        </p>
      )}
      <SimpleSubmit label={submitLabel} />
    </form>
  );
}

function SimpleSubmit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" disabled={pending}>
      {pending ? "Guardando…" : label}
    </Button>
  );
}

function AsignarForm({
  solicitudId,
  candidatos,
  actualId,
  onDone,
}: {
  solicitudId: string;
  candidatos: Persona[];
  actualId: string | null;
  onDone: () => void;
}) {
  const [state, formAction] = useFormState(
    asignarSolicitud,
    initialSimpleSolicitudState,
  );
  useEffect(() => {
    if (state.ok) onDone();
  }, [state.ok, onDone]);
  return (
    <form action={formAction} className="mt-2 flex items-center gap-2">
      <input type="hidden" name="solicitud_id" value={solicitudId} />
      <select
        name="asignado_a_id"
        defaultValue={actualId ?? ""}
        className="flex h-8 flex-1 rounded-md border border-input bg-background px-2 text-[12px]"
      >
        <option value="">— Sin asignar —</option>
        {candidatos.map((c) => (
          <option key={c.user_id} value={c.user_id}>
            {c.nombre}
          </option>
        ))}
      </select>
      <SimpleSubmit label="Asignar" />
      {state.error && (
        <span className="text-[10.5px] text-destructive">{state.error}</span>
      )}
    </form>
  );
}

function RevisarBtn({ solicitudId }: { solicitudId: string }) {
  const [isPending, startTransition] = useTransition();
  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      disabled={isPending}
      onClick={() => {
        startTransition(async () => {
          const fd = new FormData();
          fd.set("solicitud_id", solicitudId);
          const res = await pasarAEnRevision(
            { ok: false, error: null },
            fd,
          );
          if (!res.ok) alert(`Error: ${res.error}`);
        });
      }}
    >
      Tomar para revisión
    </Button>
  );
}

function CerrarBtn({ solicitudId }: { solicitudId: string }) {
  const [isPending, startTransition] = useTransition();
  return (
    <Button
      type="button"
      size="sm"
      variant="ghost"
      disabled={isPending}
      onClick={() => {
        if (!confirm("¿Cerrar esta solicitud?")) return;
        startTransition(async () => {
          const fd = new FormData();
          fd.set("solicitud_id", solicitudId);
          const res = await cerrarSolicitud({ ok: false, error: null }, fd);
          if (!res.ok) alert(`Error: ${res.error}`);
        });
      }}
    >
      Cerrar
    </Button>
  );
}

// ============================================================================
// Form de comentario
// ============================================================================
function ComentarioForm({
  solicitudId,
  candidatosMencion,
  onAdded,
}: {
  solicitudId: string;
  candidatosMencion: Persona[];
  onAdded: (c: Comentario) => void;
}) {
  const [state, formAction] = useFormState(
    agregarComentario,
    initialComentarioState,
  );
  const [texto, setTexto] = useState("");
  const [menciones, setMenciones] = useState<string[]>([]);

  useEffect(() => {
    if (state.ok) {
      // Optimista: el comentario ya está en el server, mostramos uno temporal.
      // El usuario puede recargar para ver el real (con autor_nombre).
      onAdded({
        id: `temp-${Date.now()}`,
        autor_id: "yo",
        autor_nombre: "Tú",
        texto,
        created_at: new Date().toISOString(),
        menciones,
      });
      setTexto("");
      setMenciones([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.ok]);

  return (
    <form action={formAction} className="mt-2 space-y-2">
      <input type="hidden" name="solicitud_id" value={solicitudId} />
      <input type="hidden" name="menciones" value={JSON.stringify(menciones)} />
      <textarea
        name="texto"
        rows={2}
        required
        maxLength={4000}
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        placeholder="Añade un comentario… (puedes mencionar usuarios abajo)"
        className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-[12px]"
      />
      {candidatosMencion.length > 0 && (
        <div className="space-y-1">
          <Label className="text-[10.5px] uppercase tracking-wider text-ink-3">
            Mencionar
          </Label>
          <div className="flex flex-wrap gap-1">
            {candidatosMencion.slice(0, 12).map((c) => {
              const sel = menciones.includes(c.user_id);
              return (
                <button
                  key={c.user_id}
                  type="button"
                  onClick={() =>
                    setMenciones((p) =>
                      sel
                        ? p.filter((u) => u !== c.user_id)
                        : [...p, c.user_id],
                    )
                  }
                  className={`rounded-full border px-2 py-0.5 text-[10.5px] ${
                    sel
                      ? "border-brand bg-brand/10 text-brand"
                      : "border-border bg-card text-ink-2 hover:bg-bg-2"
                  }`}
                >
                  @{c.nombre.split(" ")[0]}
                </button>
              );
            })}
          </div>
        </div>
      )}
      {state.error && (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-2 py-1 text-[11px] text-destructive">
          {state.error}
        </p>
      )}
      <ComentarioSubmit />
    </form>
  );
}

function ComentarioSubmit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" disabled={pending}>
      <Send className="h-3 w-3" />
      {pending ? "Enviando…" : "Comentar"}
    </Button>
  );
}

/**
 * Helper para que ESLint no se queje del Link import si no se usa
 * directamente. La acción contextual de "Crear OC desde solicitud"
 * vive en sprint 4.3 — la sintaxis quedará lista cuando se conecte.
 */
export const _kept = Link;
