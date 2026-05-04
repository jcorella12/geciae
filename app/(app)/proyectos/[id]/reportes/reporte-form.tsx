"use client";

import { FileText, FileUp } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ETIQUETA_SEVERIDAD,
  ETIQUETA_TIPO_REPORTE,
  initialReporteFormState,
  PLANTILLA_CONTENIDO,
  type SeveridadReporte,
  type TipoReporteProyecto,
} from "@/lib/proyecto-reportes/state";
import { cn } from "@/lib/utils";

import { crearReporte } from "./actions";

type Modo = "manual" | "pdf";

const TIPOS = Object.keys(ETIQUETA_TIPO_REPORTE) as TipoReporteProyecto[];
const SEVERIDADES = Object.keys(
  ETIQUETA_SEVERIDAD,
) as SeveridadReporte[];

type Candidato = {
  usuario_id: string;
  nombre_completo: string;
  puesto: string | null;
};

export function ReporteForm({
  proyectoId,
  candidatos,
  onCreated,
}: {
  proyectoId: string;
  candidatos: Candidato[];
  onCreated?: () => void;
}) {
  const [state, formAction] = useFormState(
    crearReporte,
    initialReporteFormState,
  );
  const formRef = useRef<HTMLFormElement>(null);
  const [tipo, setTipo] = useState<TipoReporteProyecto>("incidente");
  const [modo, setModo] = useState<Modo>("manual");
  const [contenido, setContenido] = useState<string>(
    PLANTILLA_CONTENIDO.incidente ?? "",
  );
  const [pdfNombre, setPdfNombre] = useState<string | null>(null);

  useEffect(() => {
    if (state.ok) {
      formRef.current?.reset();
      setPdfNombre(null);
      onCreated?.();
    }
  }, [state.ok, onCreated]);

  const handleTipoChange = (nuevoTipo: TipoReporteProyecto) => {
    setTipo(nuevoTipo);
    // Si el textarea está vacío o tiene plantilla previa, reemplazar
    const plantillaPrevia =
      Object.values(PLANTILLA_CONTENIDO).find((p) => p === contenido) ?? null;
    if (!contenido.trim() || plantillaPrevia) {
      setContenido(PLANTILLA_CONTENIDO[nuevoTipo] ?? "");
    }
  };

  const hoy = new Date().toISOString().slice(0, 10);
  const requiereSeguimiento = [
    "incidente",
    "no_conformidad",
    "hallazgo_seguridad",
    "retraso",
    "siniestro",
  ].includes(tipo);

  return (
    <form
      ref={formRef}
      action={formAction}
      encType="multipart/form-data"
      className="rounded-lg border border-border bg-card p-5 shadow-sm"
    >
      <input type="hidden" name="proyecto_id" value={proyectoId} />
      <input type="hidden" name="modo" value={modo} />

      <div className="mb-4">
        <h3 className="text-[14px] font-semibold">Nuevo reporte</h3>
        <p className="mt-0.5 text-[11.5px] text-ink-3">
          Documento estructurado para incidentes, avances o cualquier
          eventualidad. Puedes llenar el contenido manualmente o subir un PDF
          ya preparado.
        </p>
      </div>

      {/* Toggle de modo */}
      <div className="mb-4 inline-flex rounded-md border border-border bg-bg-2/40 p-0.5">
        <button
          type="button"
          onClick={() => setModo("manual")}
          className={cn(
            "flex items-center gap-1.5 rounded-sm px-3 py-1 text-[12px] font-medium transition",
            modo === "manual"
              ? "bg-card text-ink-1 shadow-xs"
              : "text-ink-3 hover:text-ink-1",
          )}
        >
          <FileText className="h-3.5 w-3.5" />
          Llenar manual
        </button>
        <button
          type="button"
          onClick={() => setModo("pdf")}
          className={cn(
            "flex items-center gap-1.5 rounded-sm px-3 py-1 text-[12px] font-medium transition",
            modo === "pdf"
              ? "bg-card text-ink-1 shadow-xs"
              : "text-ink-3 hover:text-ink-1",
          )}
        >
          <FileUp className="h-3.5 w-3.5" />
          Subir PDF
        </button>
      </div>

      {/* Identificación */}
      <fieldset className="mb-4">
        <legend className="text-[11px] font-semibold uppercase tracking-wider text-ink-3">
          Identificación
        </legend>
        <div className="mt-2 grid grid-cols-12 gap-2">
          <div className="col-span-12 md:col-span-4">
            <Label htmlFor="tipo" className="text-[11px]">
              Tipo *
            </Label>
            <select
              id="tipo"
              name="tipo"
              value={tipo}
              onChange={(e) => handleTipoChange(e.target.value as TipoReporteProyecto)}
              className="mt-0.5 h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
            >
              {TIPOS.map((t) => (
                <option key={t} value={t}>
                  {ETIQUETA_TIPO_REPORTE[t]}
                </option>
              ))}
            </select>
          </div>
          <div className="col-span-6 md:col-span-3">
            <Label htmlFor="severidad" className="text-[11px]">
              Severidad
            </Label>
            <select
              id="severidad"
              name="severidad"
              defaultValue="info"
              className="mt-0.5 h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
            >
              {SEVERIDADES.map((s) => (
                <option key={s} value={s}>
                  {ETIQUETA_SEVERIDAD[s]}
                </option>
              ))}
            </select>
          </div>
          <div className="col-span-6 md:col-span-2">
            <Label htmlFor="fecha_evento" className="text-[11px]">
              Fecha evento
            </Label>
            <Input
              id="fecha_evento"
              name="fecha_evento"
              type="date"
              className="mt-0.5 text-sm"
            />
          </div>
          <div className="col-span-6 md:col-span-3">
            <Label htmlFor="fecha_reporte" className="text-[11px]">
              Fecha reporte *
            </Label>
            <Input
              id="fecha_reporte"
              name="fecha_reporte"
              type="date"
              defaultValue={hoy}
              required
              className="mt-0.5 text-sm"
            />
          </div>
          <div className="col-span-12">
            <Label htmlFor="titulo" className="text-[11px]">
              Título *
            </Label>
            <Input
              id="titulo"
              name="titulo"
              required
              placeholder="Ej: Incidente eléctrico en tablero principal — 14:30"
              className="mt-0.5 text-sm"
            />
          </div>
          <div className="col-span-12">
            <Label htmlFor="resumen" className="text-[11px]">
              Resumen ejecutivo (1-2 oraciones)
            </Label>
            <Input
              id="resumen"
              name="resumen"
              placeholder="Lo más importante para alguien que ojea el reporte"
              className="mt-0.5 text-sm"
            />
          </div>
        </div>
      </fieldset>

      {/* Contenido — depende del modo */}
      <fieldset className="mb-4">
        <legend className="text-[11px] font-semibold uppercase tracking-wider text-ink-3">
          {modo === "pdf" ? "Reporte en PDF" : "Contenido detallado"}
        </legend>

        {modo === "pdf" ? (
          <div className="mt-2 grid grid-cols-12 gap-2">
            <div className="col-span-12">
              <Label htmlFor="archivo_pdf" className="text-[11px]">
                Archivo PDF *
              </Label>
              <input
                id="archivo_pdf"
                name="archivo_pdf"
                type="file"
                accept="application/pdf,.pdf"
                required={modo === "pdf"}
                onChange={(e) =>
                  setPdfNombre(e.target.files?.[0]?.name ?? null)
                }
                className="mt-0.5 block w-full rounded-md border border-input bg-background text-sm file:mr-3 file:rounded-md file:border-0 file:bg-brand-soft file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-brand-deep hover:file:bg-brand hover:file:text-brand-fg"
              />
              <p className="mt-1 text-[10.5px] text-ink-3">
                Tamaño máximo 50MB. El PDF queda como adjunto principal del
                reporte y se puede descargar desde el detalle.
              </p>
              {pdfNombre && (
                <p className="mt-1 text-[11px] text-ink-2">
                  Seleccionado: <span className="font-medium">{pdfNombre}</span>
                </p>
              )}
            </div>
            <div className="col-span-12 md:col-span-6">
              <Label htmlFor="ubicacion" className="text-[11px]">
                Ubicación (opcional)
              </Label>
              <Input
                id="ubicacion"
                name="ubicacion"
                placeholder="Sitio, área"
                className="mt-0.5 text-sm"
              />
            </div>
            <div className="col-span-12 md:col-span-6">
              <Label htmlFor="impacto" className="text-[11px]">
                Impacto (opcional)
              </Label>
              <Input
                id="impacto"
                name="impacto"
                placeholder="Personas / equipo / cronograma / costo"
                className="mt-0.5 text-sm"
              />
            </div>
            <div className="col-span-12">
              <Label htmlFor="contenido" className="text-[11px]">
                Notas adicionales (opcional, complementa el PDF)
              </Label>
              <textarea
                id="contenido"
                name="contenido"
                rows={3}
                placeholder="Contexto breve, referencias internas, etc."
                className="mt-0.5 w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm"
              />
            </div>
          </div>
        ) : (
          <div className="mt-2 grid grid-cols-12 gap-2">
            <div className="col-span-12 md:col-span-6">
              <Label htmlFor="ubicacion" className="text-[11px]">
                Ubicación
              </Label>
              <Input
                id="ubicacion"
                name="ubicacion"
                placeholder="Sitio, área específica"
                className="mt-0.5 text-sm"
              />
            </div>
            <div className="col-span-12 md:col-span-6">
              <Label htmlFor="impacto" className="text-[11px]">
                Impacto
              </Label>
              <Input
                id="impacto"
                name="impacto"
                placeholder="Personas, equipo, cronograma, costo afectado"
                className="mt-0.5 text-sm"
              />
            </div>
            <div className="col-span-12">
              <Label htmlFor="contenido" className="text-[11px]">
                Cuerpo del reporte (markdown soportado)
              </Label>
              <textarea
                id="contenido"
                name="contenido"
                rows={14}
                value={contenido}
                onChange={(e) => setContenido(e.target.value)}
                className="mt-0.5 w-full rounded-md border border-input bg-background px-3 py-1.5 font-mono text-[12px] leading-relaxed"
              />
              {PLANTILLA_CONTENIDO[tipo] && (
                <p className="mt-1 text-[10.5px] text-ink-3">
                  ⓘ Plantilla cargada para {ETIQUETA_TIPO_REPORTE[tipo]}. Edita
                  las secciones según el caso.
                </p>
              )}
            </div>
          </div>
        )}
      </fieldset>

      {/* Seguimiento */}
      {requiereSeguimiento && (
        <fieldset className="mb-4">
          <legend className="text-[11px] font-semibold uppercase tracking-wider text-ink-3">
            Seguimiento y acción correctiva
          </legend>
          <div className="mt-2 grid grid-cols-12 gap-2">
            <div className="col-span-12 md:col-span-6">
              <Label htmlFor="responsable_seguimiento" className="text-[11px]">
                Responsable de seguimiento
              </Label>
              <select
                id="responsable_seguimiento"
                name="responsable_seguimiento"
                defaultValue=""
                className="mt-0.5 h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
              >
                <option value="">— Sin asignar —</option>
                {candidatos.map((c) => (
                  <option key={c.usuario_id} value={c.usuario_id}>
                    {c.nombre_completo}
                    {c.puesto ? ` · ${c.puesto}` : ""}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-span-12 md:col-span-6">
              <Label htmlFor="fecha_compromiso" className="text-[11px]">
                Fecha compromiso resolución
              </Label>
              <Input
                id="fecha_compromiso"
                name="fecha_compromiso"
                type="date"
                className="mt-0.5 text-sm"
              />
            </div>
            <div className="col-span-12">
              <Label htmlFor="accion_correctiva" className="text-[11px]">
                Plan de acción correctiva
              </Label>
              <textarea
                id="accion_correctiva"
                name="accion_correctiva"
                rows={3}
                placeholder="Pasos concretos, recursos requeridos, indicadores de éxito"
                className="mt-0.5 w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm"
              />
            </div>
          </div>
        </fieldset>
      )}

      {/* Visibilidad y estado */}
      <div className="mb-4 flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-1.5 text-[12px]">
          <input
            type="checkbox"
            name="visible_cliente"
            className="h-4 w-4"
          />
          Visible para cliente
        </label>
        <div className="flex items-center gap-2">
          <Label htmlFor="estado" className="text-[12px]">
            Guardar como
          </Label>
          <select
            id="estado"
            name="estado"
            defaultValue="emitido"
            className="h-8 rounded-md border border-input bg-background px-2 text-sm"
          >
            <option value="borrador">Borrador</option>
            <option value="emitido">Emitido</option>
          </select>
        </div>
      </div>

      {state.error && (
        <p className="mb-2 text-[11px] text-destructive">{state.error}</p>
      )}

      <div className="flex justify-end gap-2 border-t border-divider pt-3">
        <SubmitBtn />
      </div>
    </form>
  );
}

function SubmitBtn() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" disabled={pending}>
      {pending ? "Guardando…" : "Guardar reporte"}
    </Button>
  );
}
