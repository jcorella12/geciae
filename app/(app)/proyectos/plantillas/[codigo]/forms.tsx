"use client";

import { Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { useFormState, useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import {
  actualizarPlantilla,
  crearDocumento,
  crearEtapa,
  crearTarea,
  eliminarDocumento,
  eliminarEtapa,
  eliminarTarea,
} from "../actions";

const initial = { ok: false, error: null as string | null };

// ============================================================================
// Editar metadata de la plantilla
// ============================================================================

export function EditarPlantillaForm({
  plantilla,
  puedeEditar,
}: {
  plantilla: {
    codigo: string;
    nombre: string;
    descripcion: string | null;
    duracion_estimada_dias: number | null;
    requiere_tramites_cfe: boolean | null;
    requiere_levantamiento_tecnico: boolean | null;
    notas: string | null;
  };
  puedeEditar: boolean;
}) {
  const [state, formAction] = useFormState(actualizarPlantilla, initial);
  return (
    <form
      action={formAction}
      className="space-y-3 rounded-lg border border-border bg-card p-5 shadow-sm"
    >
      <input type="hidden" name="codigo" value={plantilla.codigo} />
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="nombre">Nombre</Label>
          <Input
            id="nombre"
            name="nombre"
            defaultValue={plantilla.nombre}
            disabled={!puedeEditar}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="duracion_estimada_dias">Duración estimada (días)</Label>
          <Input
            id="duracion_estimada_dias"
            name="duracion_estimada_dias"
            type="number"
            min="0"
            defaultValue={plantilla.duracion_estimada_dias ?? ""}
            disabled={!puedeEditar}
          />
        </div>
      </div>
      <div className="space-y-1">
        <Label htmlFor="descripcion">Descripción</Label>
        <textarea
          id="descripcion"
          name="descripcion"
          rows={2}
          defaultValue={plantilla.descripcion ?? ""}
          disabled={!puedeEditar}
          className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm disabled:opacity-70"
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="notas">Notas (uso interno)</Label>
        <textarea
          id="notas"
          name="notas"
          rows={2}
          defaultValue={plantilla.notas ?? ""}
          disabled={!puedeEditar}
          className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm disabled:opacity-70"
        />
      </div>
      <div className="flex flex-wrap gap-4">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="requiere_tramites_cfe"
            defaultChecked={plantilla.requiere_tramites_cfe === true}
            disabled={!puedeEditar}
          />
          Requiere trámites CFE
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="requiere_levantamiento_tecnico"
            defaultChecked={plantilla.requiere_levantamiento_tecnico === true}
            disabled={!puedeEditar}
          />
          Requiere levantamiento técnico
        </label>
      </div>
      {state.error && (
        <p className="text-sm text-destructive">{state.error}</p>
      )}
      {state.ok && (
        <p className="text-sm text-emerald-700">✓ Cambios guardados.</p>
      )}
      {puedeEditar && <SubmitBtn label="Guardar metadata" />}
    </form>
  );
}

// ============================================================================
// Crear etapa (form colapsable)
// ============================================================================

export function NuevaEtapaForm({
  plantillaCodigo,
  siguienteNumero,
}: {
  plantillaCodigo: string;
  siguienteNumero: number;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction] = useFormState(crearEtapa, initial);

  if (!open)
    return (
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        + Nueva etapa
      </Button>
    );

  return (
    <form
      action={formAction}
      key={state.ok ? "reset" : "form"}
      className="space-y-3 rounded-lg border border-primary/30 bg-primary/5 p-4"
    >
      <input type="hidden" name="plantilla_codigo" value={plantillaCodigo} />
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="space-y-1">
          <Label htmlFor="numero">Número</Label>
          <Input
            id="numero"
            name="numero"
            type="number"
            min={1}
            max={99}
            required
            defaultValue={siguienteNumero}
          />
        </div>
        <div className="space-y-1 sm:col-span-2">
          <Label htmlFor="nombre">Nombre de la etapa</Label>
          <Input
            id="nombre"
            name="nombre"
            required
            placeholder="Ej. Levantamiento técnico"
          />
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="space-y-1">
          <Label htmlFor="duracion_estimada_dias">Días est.</Label>
          <Input
            id="duracion_estimada_dias"
            name="duracion_estimada_dias"
            type="number"
            min={0}
          />
        </div>
        <div className="space-y-1">
          <label className="flex items-center gap-2 pt-6 text-sm">
            <input type="checkbox" name="hito_facturacion" />
            Hito de facturación
          </label>
        </div>
        <div className="space-y-1">
          <Label htmlFor="porcentaje_facturacion">% facturación</Label>
          <Input
            id="porcentaje_facturacion"
            name="porcentaje_facturacion"
            type="number"
            min={0}
            max={100}
            step={0.01}
          />
        </div>
      </div>
      <div className="space-y-1">
        <Label htmlFor="descripcion">Descripción</Label>
        <textarea
          id="descripcion"
          name="descripcion"
          rows={2}
          maxLength={2000}
          className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        />
      </div>
      {state.error && <p className="text-sm text-destructive">{state.error}</p>}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
          Cancelar
        </Button>
        <SubmitBtn label="Crear etapa" />
      </div>
    </form>
  );
}

// ============================================================================
// Crear tarea
// ============================================================================

export function NuevaTareaForm({
  etapaId,
  plantillaCodigo,
  siguienteNumero,
}: {
  etapaId: string;
  plantillaCodigo: string;
  siguienteNumero: number;
}) {
  void plantillaCodigo;
  const [open, setOpen] = useState(false);
  const [state, formAction] = useFormState(crearTarea, initial);

  if (!open)
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setOpen(true)}
        className="h-7 text-xs"
      >
        + Tarea
      </Button>
    );

  return (
    <form
      action={formAction}
      key={state.ok ? "reset" : "form"}
      className="space-y-2 rounded-md border border-primary/30 bg-primary/5 p-3 text-sm"
    >
      <input type="hidden" name="etapa_id" value={etapaId} />
      <div className="flex flex-wrap items-end gap-2">
        <div className="space-y-1">
          <Label htmlFor={`tn-${etapaId}`} className="text-xs">
            #
          </Label>
          <Input
            id={`tn-${etapaId}`}
            name="numero"
            type="number"
            min={1}
            max={99}
            required
            defaultValue={siguienteNumero}
            className="w-16 h-8 text-xs"
          />
        </div>
        <div className="flex-1 min-w-[14rem] space-y-1">
          <Label htmlFor={`tt-${etapaId}`} className="text-xs">
            Título
          </Label>
          <Input
            id={`tt-${etapaId}`}
            name="titulo"
            required
            placeholder="Ej. Confirmar 3 partes"
            className="h-8 text-xs"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor={`tr-${etapaId}`} className="text-xs">
            Rol
          </Label>
          <Input
            id={`tr-${etapaId}`}
            name="rol_responsable"
            placeholder="vendedor"
            className="w-32 h-8 text-xs"
          />
        </div>
      </div>
      <div className="flex flex-wrap gap-3">
        <label className="flex items-center gap-1 text-xs">
          <input type="checkbox" name="obligatoria" defaultChecked />
          Obligatoria
        </label>
        <label className="flex items-center gap-1 text-xs">
          <input type="checkbox" name="bloquea_avance" />
          Bloquea avance
        </label>
      </div>
      {state.error && <p className="text-xs text-destructive">{state.error}</p>}
      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setOpen(false)}
          className="h-7 text-xs"
        >
          Cancelar
        </Button>
        <SubmitBtnSm label="+ Crear" />
      </div>
    </form>
  );
}

// ============================================================================
// Crear documento
// ============================================================================

export function NuevoDocumentoForm({
  plantillaCodigo,
}: {
  plantillaCodigo: string;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction] = useFormState(crearDocumento, initial);

  if (!open)
    return (
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        + Nuevo documento requerido
      </Button>
    );

  return (
    <form
      action={formAction}
      key={state.ok ? "reset" : "form"}
      className="space-y-3 rounded-lg border border-primary/30 bg-primary/5 p-4"
    >
      <input type="hidden" name="plantilla_codigo" value={plantillaCodigo} />
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="space-y-1">
          <Label htmlFor="codigo_documento">Código</Label>
          <Input
            id="codigo_documento"
            name="codigo_documento"
            required
            placeholder="ACTA_ENTREGA"
            className="font-mono uppercase"
          />
        </div>
        <div className="space-y-1 sm:col-span-2">
          <Label htmlFor="nombre">Nombre</Label>
          <Input
            id="nombre"
            name="nombre"
            required
            placeholder="Acta de entrega-recepción"
          />
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="space-y-1">
          <Label htmlFor="requerido_para_estado">Requerido para estado</Label>
          <select
            id="requerido_para_estado"
            name="requerido_para_estado"
            defaultValue=""
            className="flex h-10 w-full rounded-md border border-input bg-background px-2 text-sm"
          >
            <option value="">— ninguno —</option>
            <option value="contrato_firmado">contrato_firmado</option>
            <option value="planeacion">planeacion</option>
            <option value="en_ejecucion">en_ejecucion</option>
            <option value="en_cierre">en_cierre</option>
            <option value="entregado">entregado</option>
            <option value="cerrado">cerrado</option>
          </select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="rol_responsable">Rol responsable</Label>
          <Input
            id="rol_responsable"
            name="rol_responsable"
            placeholder="pm / ingenieria / vendedor"
          />
        </div>
        <div className="space-y-1">
          <label className="flex items-center gap-2 pt-6 text-sm">
            <input type="checkbox" name="obligatorio" defaultChecked />
            Obligatorio
          </label>
        </div>
      </div>
      <div className="space-y-1">
        <Label htmlFor="descripcion">Descripción</Label>
        <textarea
          id="descripcion"
          name="descripcion"
          rows={2}
          maxLength={2000}
          className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        />
      </div>
      {state.error && <p className="text-sm text-destructive">{state.error}</p>}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
          Cancelar
        </Button>
        <SubmitBtn label="Crear documento" />
      </div>
    </form>
  );
}

// ============================================================================
// Botones eliminar
// ============================================================================

export function EliminarEtapaButton({
  etapaId,
  plantillaCodigo,
}: {
  etapaId: string;
  plantillaCodigo: string;
}) {
  const [pending, start] = useTransition();
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      disabled={pending}
      className="h-7 px-2 text-xs text-destructive hover:bg-destructive/10"
      onClick={() => {
        if (
          !window.confirm(
            "¿Eliminar esta etapa? Eliminará también sus tareas asociadas. Los proyectos ya creados con esta plantilla no se ven afectados.",
          )
        )
          return;
        start(async () => {
          await eliminarEtapa(etapaId, plantillaCodigo);
        });
      }}
    >
      <Trash2 className="h-3 w-3" />
    </Button>
  );
}

export function EliminarTareaButton({
  tareaId,
  plantillaCodigo,
}: {
  tareaId: string;
  plantillaCodigo: string;
}) {
  const [pending, start] = useTransition();
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      disabled={pending}
      className="h-6 px-1 text-[10px] text-destructive hover:bg-destructive/10"
      onClick={() => {
        if (!window.confirm("¿Eliminar esta tarea?")) return;
        start(async () => {
          await eliminarTarea(tareaId, plantillaCodigo);
        });
      }}
    >
      <Trash2 className="h-3 w-3" />
    </Button>
  );
}

export function EliminarDocumentoButton({
  documentoId,
  plantillaCodigo,
}: {
  documentoId: string;
  plantillaCodigo: string;
}) {
  const [pending, start] = useTransition();
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      disabled={pending}
      className="h-7 px-2 text-xs text-destructive hover:bg-destructive/10"
      onClick={() => {
        if (
          !window.confirm(
            "¿Eliminar este documento requerido? Solo afecta proyectos NUEVOS creados con esta plantilla a partir de ahora.",
          )
        )
          return;
        start(async () => {
          await eliminarDocumento(documentoId, plantillaCodigo);
        });
      }}
    >
      <Trash2 className="h-3 w-3" />
    </Button>
  );
}

function SubmitBtn({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Guardando…" : label}
    </Button>
  );
}

function SubmitBtnSm({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" disabled={pending} className="h-7 text-xs">
      {pending ? "…" : label}
    </Button>
  );
}
