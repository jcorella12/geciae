"use client";

import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Download,
  File as FileIcon,
  FileImage,
  FileText,
  Trash2,
  Upload,
} from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";
import { useFormState, useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  CATEGORIAS_CON_MONTO,
  CATEGORIAS_CON_VENCIMIENTO,
  COLOR_CATEGORIA_VH,
  COLOR_VENCIMIENTO,
  ETIQUETA_CATEGORIA_VH,
  ETIQUETA_VENCIMIENTO,
  ICONO_CATEGORIA_VH,
  initialSimpleVehDocState,
  type CategoriaDocVehiculo,
  type EstadoVencimientoDoc,
} from "@/lib/vehiculos-docs/state";

import {
  eliminarDocumentoVehiculo,
  getDownloadUrlVehiculo,
  subirDocumentoVehiculo,
} from "./actions";

type Documento = {
  id: string;
  categoria: CategoriaDocVehiculo;
  nombre: string;
  descripcion: string | null;
  numero_documento: string | null;
  emisor: string | null;
  fecha_emision: string | null;
  fecha_vencimiento: string | null;
  monto: number | null;
  storage_path: string;
  mime_type: string | null;
  tamano_bytes: number | null;
  subido_por_nombre: string | null;
  created_at: string;
};

const CATEGORIAS = Object.keys(
  ETIQUETA_CATEGORIA_VH,
) as CategoriaDocVehiculo[];

const fmtMxn = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
  maximumFractionDigits: 2,
});

const fmtFecha = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleDateString("es-MX", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : null;

const fmtBytes = (b: number | null) => {
  if (!b) return "—";
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1024 / 1024).toFixed(1)} MB`;
};

const iconForMime = (mime: string | null) => {
  if (!mime) return FileIcon;
  if (mime.startsWith("image/")) return FileImage;
  if (mime.includes("pdf") || mime.includes("text")) return FileText;
  return FileIcon;
};

function calcularEstadoVencimiento(
  fecha: string | null,
): { estado: EstadoVencimientoDoc; dias: number | null } {
  if (!fecha) return { estado: "sin_vencimiento", dias: null };
  const v = new Date(fecha);
  v.setHours(0, 0, 0, 0);
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const dias = Math.round(
    (v.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24),
  );
  if (dias < 0) return { estado: "vencido", dias };
  if (dias <= 15) return { estado: "urgente", dias };
  if (dias <= 60) return { estado: "proximo", dias };
  return { estado: "vigente", dias };
}

export function DocumentosVehiculoPanel({
  vehiculoId,
  documentos,
  puedeEditar,
}: {
  vehiculoId: string;
  documentos: Documento[];
  puedeEditar: boolean;
}) {
  const [filtro, setFiltro] = useState<CategoriaDocVehiculo | "todas">("todas");
  const [showForm, setShowForm] = useState(false);
  const [, startTransition] = useTransition();

  const filtrados =
    filtro === "todas"
      ? documentos
      : documentos.filter((d) => d.categoria === filtro);

  const onDescargar = async (path: string) => {
    const url = await getDownloadUrlVehiculo(path);
    if (url) window.open(url, "_blank", "noopener");
    else alert("No se pudo generar enlace de descarga.");
  };

  const onEliminar = (id: string, path: string) => {
    if (!confirm("¿Eliminar el documento? No se puede deshacer.")) return;
    startTransition(() => {
      eliminarDocumentoVehiculo(id, vehiculoId, path);
    });
  };

  // Conteos por categoría (solo categorías con docs)
  const conteos = CATEGORIAS.map((c) => ({
    cat: c,
    n: documentos.filter((d) => d.categoria === c).length,
  })).filter((c) => c.n > 0);

  // Resumen de vencimientos
  const vencidos = documentos.filter(
    (d) => calcularEstadoVencimiento(d.fecha_vencimiento).estado === "vencido",
  );
  const urgentes = documentos.filter(
    (d) => calcularEstadoVencimiento(d.fecha_vencimiento).estado === "urgente",
  );

  return (
    <section className="rounded-lg border border-border bg-card p-5 shadow-sm">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">
            Documentos ({documentos.length})
          </h2>
          <p className="mt-0.5 text-[12px] text-ink-3">
            Factura, póliza de seguro, tarjeta de circulación, verificación,
            tenencia y otros documentos del vehículo.
          </p>
          {(vencidos.length > 0 || urgentes.length > 0) && (
            <div className="mt-2 flex flex-wrap items-center gap-2 text-[11.5px]">
              {vencidos.length > 0 && (
                <span className="flex items-center gap-1 rounded-full bg-danger-soft px-2 py-0.5 font-medium text-danger-deep">
                  <AlertTriangle className="h-3 w-3" />
                  {vencidos.length} vencido{vencidos.length > 1 && "s"}
                </span>
              )}
              {urgentes.length > 0 && (
                <span className="flex items-center gap-1 rounded-full bg-warn-soft px-2 py-0.5 font-medium text-warn-deep">
                  <Calendar className="h-3 w-3" />
                  {urgentes.length} por vencer (≤15d)
                </span>
              )}
            </div>
          )}
        </div>
        {puedeEditar && (
          <button
            onClick={() => setShowForm((s) => !s)}
            className="flex items-center gap-1.5 rounded-md border border-brand bg-brand-soft px-3 py-1.5 text-[12.5px] font-medium text-brand-deep hover:bg-brand hover:text-brand-fg"
          >
            <Upload className="h-3.5 w-3.5" />
            {showForm ? "Cancelar" : "Subir documento"}
          </button>
        )}
      </div>

      {showForm && (
        <UploadForm
          vehiculoId={vehiculoId}
          onUploaded={() => setShowForm(false)}
        />
      )}

      {/* Filtros chip */}
      {documentos.length > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => setFiltro("todas")}
            className={cn(
              "rounded-full px-2.5 py-0.5 text-[11px] font-medium",
              filtro === "todas"
                ? "bg-ink-1 text-bg-1"
                : "bg-bg-2 text-ink-2 hover:bg-bg-3",
            )}
          >
            Todas ({documentos.length})
          </button>
          {conteos.map((c) => (
            <button
              key={c.cat}
              onClick={() => setFiltro(c.cat)}
              className={cn(
                "rounded-full px-2.5 py-0.5 text-[11px] font-medium",
                filtro === c.cat
                  ? "bg-ink-1 text-bg-1"
                  : `${COLOR_CATEGORIA_VH[c.cat]} hover:opacity-80`,
              )}
            >
              {ICONO_CATEGORIA_VH[c.cat]} {ETIQUETA_CATEGORIA_VH[c.cat]} ({c.n})
            </button>
          ))}
        </div>
      )}

      {filtrados.length === 0 ? (
        <p className="rounded-md border border-dashed border-border bg-bg-2/40 p-8 text-center text-sm text-ink-3">
          {documentos.length === 0
            ? "Sin documentos. Sube factura, póliza, tarjeta de circulación, verificación, etc."
            : "No hay documentos en esa categoría."}
        </p>
      ) : (
        <ul className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
          {filtrados.map((d) => {
            const Icon = iconForMime(d.mime_type);
            const venc = calcularEstadoVencimiento(d.fecha_vencimiento);
            const esCritico =
              venc.estado === "vencido" || venc.estado === "urgente";
            return (
              <article
                key={d.id}
                className={cn(
                  "group flex flex-col gap-2 rounded-md border bg-card p-3 shadow-xs transition hover:shadow-sm",
                  esCritico
                    ? "border-danger/40"
                    : "border-border hover:border-brand/50",
                )}
              >
                <div className="flex items-start gap-2.5">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-bg-2">
                    <span className="text-base">
                      {ICONO_CATEGORIA_VH[d.categoria]}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <button
                      onClick={() => onDescargar(d.storage_path)}
                      className="line-clamp-2 text-left text-[12.5px] font-medium leading-tight hover:text-brand"
                      title={d.nombre}
                    >
                      {d.nombre}
                    </button>
                    <div className="mt-1 flex flex-wrap items-center gap-1">
                      <span
                        className={cn(
                          "rounded-full px-1.5 py-px text-[10px] font-medium",
                          COLOR_CATEGORIA_VH[d.categoria],
                        )}
                      >
                        {ETIQUETA_CATEGORIA_VH[d.categoria]}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1 opacity-0 transition group-hover:opacity-100">
                    <button
                      onClick={() => onDescargar(d.storage_path)}
                      className="text-ink-3 hover:text-brand"
                      aria-label="Descargar"
                    >
                      <Download className="h-3.5 w-3.5" />
                    </button>
                    {puedeEditar && (
                      <button
                        onClick={() => onEliminar(d.id, d.storage_path)}
                        className="text-ink-4 hover:text-destructive"
                        aria-label="Eliminar"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Metadatos del documento */}
                <dl className="grid grid-cols-2 gap-1 text-[10.5px]">
                  {d.numero_documento && (
                    <div className="col-span-2">
                      <dt className="text-ink-3">Folio / núm:</dt>
                      <dd className="font-mono">{d.numero_documento}</dd>
                    </div>
                  )}
                  {d.emisor && (
                    <div className="col-span-2">
                      <dt className="text-ink-3">Emisor:</dt>
                      <dd className="truncate">{d.emisor}</dd>
                    </div>
                  )}
                  {d.fecha_emision && (
                    <div>
                      <dt className="text-ink-3">Emisión:</dt>
                      <dd>{fmtFecha(d.fecha_emision)}</dd>
                    </div>
                  )}
                  {d.fecha_vencimiento && (
                    <div>
                      <dt className="text-ink-3">Vence:</dt>
                      <dd
                        className={cn(
                          "font-medium",
                          COLOR_VENCIMIENTO[venc.estado],
                        )}
                      >
                        {fmtFecha(d.fecha_vencimiento)}
                        {venc.dias != null && (
                          <span className="ml-1">
                            (
                            {venc.estado === "vencido"
                              ? `${Math.abs(venc.dias)}d vencido`
                              : venc.estado === "urgente"
                                ? `${venc.dias}d ⚠️`
                                : venc.estado === "proximo"
                                  ? `${venc.dias}d`
                                  : "vigente"}
                            )
                          </span>
                        )}
                      </dd>
                    </div>
                  )}
                  {d.monto != null && (
                    <div className="col-span-2">
                      <dt className="text-ink-3">Monto:</dt>
                      <dd className="font-mono tnum">
                        {fmtMxn.format(Number(d.monto))}
                      </dd>
                    </div>
                  )}
                </dl>

                {/* Estado vencimiento badge si crítico */}
                {esCritico && (
                  <div
                    className={cn(
                      "flex items-center gap-1 rounded-md px-2 py-1 text-[10.5px] font-medium",
                      venc.estado === "vencido"
                        ? "bg-danger-soft text-danger-deep"
                        : "bg-warn-soft text-warn-deep",
                    )}
                  >
                    {venc.estado === "vencido" ? (
                      <AlertTriangle className="h-3 w-3" />
                    ) : (
                      <Calendar className="h-3 w-3" />
                    )}
                    {ETIQUETA_VENCIMIENTO[venc.estado]}
                  </div>
                )}

                {/* Footer */}
                <p className="mt-auto flex items-center gap-1.5 border-t border-divider pt-2 text-[9.5px] text-ink-4">
                  <Icon className="h-3 w-3" />
                  {fmtBytes(d.tamano_bytes)} · {fmtFecha(d.created_at)}
                  {d.subido_por_nombre && ` · ${d.subido_por_nombre}`}
                </p>
              </article>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function UploadForm({
  vehiculoId,
  onUploaded,
}: {
  vehiculoId: string;
  onUploaded: () => void;
}) {
  const [state, formAction] = useFormState(
    subirDocumentoVehiculo,
    initialSimpleVehDocState,
  );
  const [categoria, setCategoria] = useState<CategoriaDocVehiculo>("factura");
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) {
      formRef.current?.reset();
      onUploaded();
    }
  }, [state.ok, onUploaded]);

  const muestraVencimiento = CATEGORIAS_CON_VENCIMIENTO.includes(categoria);
  const muestraMonto = CATEGORIAS_CON_MONTO.includes(categoria);

  return (
    <form
      ref={formRef}
      action={formAction}
      encType="multipart/form-data"
      className="mb-4 rounded-md border border-brand/40 bg-brand-soft/20 p-4"
    >
      <input type="hidden" name="vehiculo_id" value={vehiculoId} />

      <h3 className="mb-3 text-[13px] font-semibold text-brand-deep">
        Nuevo documento
      </h3>

      <div className="grid grid-cols-12 gap-2">
        <div className="col-span-12 md:col-span-5">
          <Label htmlFor="categoria" className="text-[11px]">
            Tipo de documento *
          </Label>
          <select
            id="categoria"
            name="categoria"
            value={categoria}
            onChange={(e) =>
              setCategoria(e.target.value as CategoriaDocVehiculo)
            }
            className="mt-0.5 h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
          >
            {CATEGORIAS.map((c) => (
              <option key={c} value={c}>
                {ICONO_CATEGORIA_VH[c]} {ETIQUETA_CATEGORIA_VH[c]}
              </option>
            ))}
          </select>
        </div>
        <div className="col-span-12 md:col-span-7">
          <Label htmlFor="archivo" className="text-[11px]">
            Archivo (max 50MB) *
          </Label>
          <input
            id="archivo"
            name="archivo"
            type="file"
            required
            accept=".pdf,.jpg,.jpeg,.png,.heic,.webp,.doc,.docx,image/*"
            // image/* en el accept hace que móvil ofrezca cámara + galería.
            className="mt-0.5 block w-full rounded-md border border-input bg-background text-sm file:mr-3 file:rounded-md file:border-0 file:bg-brand-soft file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-brand-deep hover:file:bg-brand hover:file:text-brand-fg"
          />
        </div>

        <div className="col-span-12 md:col-span-7">
          <Label htmlFor="nombre" className="text-[11px]">
            Nombre (opcional, usa el del archivo si vacío)
          </Label>
          <Input
            id="nombre"
            name="nombre"
            placeholder="Ej: Póliza GNP 2024-25"
            className="mt-0.5 text-sm"
          />
        </div>
        <div className="col-span-12 md:col-span-5">
          <Label htmlFor="numero_documento" className="text-[11px]">
            Folio / núm. documento
          </Label>
          <Input
            id="numero_documento"
            name="numero_documento"
            placeholder="Núm. póliza, folio factura"
            className="mt-0.5 font-mono text-sm"
          />
        </div>

        <div className="col-span-12 md:col-span-7">
          <Label htmlFor="emisor" className="text-[11px]">
            Emisor / Compañía
          </Label>
          <Input
            id="emisor"
            name="emisor"
            placeholder={
              categoria === "seguro"
                ? "GNP, Qualitas, AXA…"
                : categoria === "factura"
                  ? "Agencia, vendedor"
                  : categoria === "tenencia" || categoria === "verificacion"
                    ? "Gobierno del Estado"
                    : "Quién lo emite"
            }
            className="mt-0.5 text-sm"
          />
        </div>
        <div className="col-span-6 md:col-span-3">
          <Label htmlFor="fecha_emision" className="text-[11px]">
            Fecha emisión
          </Label>
          <Input
            id="fecha_emision"
            name="fecha_emision"
            type="date"
            className="mt-0.5 text-sm"
          />
        </div>
        {muestraVencimiento && (
          <div className="col-span-6 md:col-span-2">
            <Label htmlFor="fecha_vencimiento" className="text-[11px]">
              Vence *
            </Label>
            <Input
              id="fecha_vencimiento"
              name="fecha_vencimiento"
              type="date"
              required={muestraVencimiento}
              className="mt-0.5 text-sm"
            />
          </div>
        )}

        {muestraMonto && (
          <div className="col-span-12 md:col-span-4">
            <Label htmlFor="monto" className="text-[11px]">
              Monto (MXN)
            </Label>
            <Input
              id="monto"
              name="monto"
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              className="mt-0.5 text-sm tnum"
            />
          </div>
        )}

        <div className="col-span-12">
          <Label htmlFor="descripcion" className="text-[11px]">
            Notas (opcional)
          </Label>
          <textarea
            id="descripcion"
            name="descripcion"
            rows={2}
            placeholder="Cobertura, observaciones, condiciones especiales…"
            className="mt-0.5 w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm"
          />
        </div>
      </div>

      {state.error && (
        <p className="mt-2 text-[11px] text-destructive">{state.error}</p>
      )}

      <div className="mt-3 flex justify-end gap-2">
        <UploadBtn />
      </div>
    </form>
  );
}

function UploadBtn() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" disabled={pending}>
      {pending ? (
        "Subiendo…"
      ) : (
        <>
          <CheckCircle2 className="h-3.5 w-3.5" /> Subir documento
        </>
      )}
    </Button>
  );
}
