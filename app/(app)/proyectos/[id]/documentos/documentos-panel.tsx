"use client";

import {
  Download,
  Eye,
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
import {
  COLOR_CATEGORIA_DOC,
  ETIQUETA_CATEGORIA_DOC,
  initialSimpleFormState,
  type CategoriaDocProyecto,
} from "@/lib/proyecto-extras/state";

import {
  eliminarDocumento,
  getDownloadUrl,
  subirDocumento,
} from "./actions";

type Documento = {
  id: string;
  categoria: CategoriaDocProyecto;
  nombre: string;
  descripcion: string | null;
  storage_path: string;
  mime_type: string | null;
  tamano_bytes: number | null;
  visible_cliente: boolean | null;
  subido_por_nombre: string | null;
  created_at: string;
};

const fmtBytes = (b: number | null) => {
  if (!b) return "—";
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1024 / 1024).toFixed(1)} MB`;
};

const fmtFecha = (iso: string) =>
  new Date(iso).toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

const iconForMime = (mime: string | null) => {
  if (!mime) return FileIcon;
  if (mime.startsWith("image/")) return FileImage;
  if (mime.includes("pdf") || mime.includes("text")) return FileText;
  return FileIcon;
};

const CATEGORIAS = Object.keys(
  ETIQUETA_CATEGORIA_DOC,
) as CategoriaDocProyecto[];

export function DocumentosPanel({
  proyectoId,
  documentos,
  puedeEditar,
}: {
  proyectoId: string;
  documentos: Documento[];
  puedeEditar: boolean;
}) {
  const [filtro, setFiltro] = useState<CategoriaDocProyecto | "todas">("todas");
  const [showForm, setShowForm] = useState(false);
  const [, startTransition] = useTransition();

  const filtrados =
    filtro === "todas"
      ? documentos
      : documentos.filter((d) => d.categoria === filtro);

  const onDescargar = async (path: string) => {
    const url = await getDownloadUrl(path);
    if (url) window.open(url, "_blank", "noopener");
    else alert("No se pudo generar enlace de descarga.");
  };

  const onEliminar = (id: string, path: string) => {
    if (!confirm("¿Eliminar el documento? No se puede deshacer.")) return;
    startTransition(() => {
      eliminarDocumento(id, proyectoId, path);
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => setFiltro("todas")}
            className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${
              filtro === "todas"
                ? "bg-ink-1 text-bg-1"
                : "bg-bg-2 text-ink-2 hover:bg-bg-3"
            }`}
          >
            Todas ({documentos.length})
          </button>
          {CATEGORIAS.map((c) => {
            const n = documentos.filter((d) => d.categoria === c).length;
            if (n === 0) return null;
            return (
              <button
                key={c}
                onClick={() => setFiltro(c)}
                className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${
                  filtro === c
                    ? "bg-ink-1 text-bg-1"
                    : `${COLOR_CATEGORIA_DOC[c]} hover:opacity-80`
                }`}
              >
                {ETIQUETA_CATEGORIA_DOC[c]} ({n})
              </button>
            );
          })}
        </div>
        {puedeEditar && (
          <button
            onClick={() => setShowForm((s) => !s)}
            className="flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-[12.5px] font-medium hover:bg-bg-2"
          >
            <Upload className="h-3.5 w-3.5" />
            {showForm ? "Cancelar" : "Subir documento"}
          </button>
        )}
      </div>

      {showForm && (
        <UploadForm
          proyectoId={proyectoId}
          onUploaded={() => setShowForm(false)}
        />
      )}

      {filtrados.length === 0 ? (
        <p className="rounded-md border border-dashed border-border bg-card p-12 text-center text-sm text-ink-3">
          {documentos.length === 0
            ? "Sin documentos. Sube contratos, planos, fotos y otros archivos del proyecto."
            : "No hay documentos en esa categoría."}
        </p>
      ) : (
        <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
          {filtrados.map((d) => {
            const Icon = iconForMime(d.mime_type);
            return (
              <article
                key={d.id}
                className="group flex items-start gap-3 rounded-md border border-border bg-card p-3.5 shadow-xs hover:border-brand/50"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-bg-2">
                  <Icon className="h-4 w-4 text-ink-3" />
                </div>
                <div className="min-w-0 flex-1">
                  <button
                    onClick={() => onDescargar(d.storage_path)}
                    className="line-clamp-1 text-left text-[12.5px] font-medium hover:text-brand"
                    title={d.nombre}
                  >
                    {d.nombre}
                  </button>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5">
                    <span
                      className={`rounded-full px-1.5 py-px text-[10px] font-medium ${COLOR_CATEGORIA_DOC[d.categoria]}`}
                    >
                      {ETIQUETA_CATEGORIA_DOC[d.categoria]}
                    </span>
                    {d.visible_cliente && (
                      <span className="flex items-center gap-1 rounded-full bg-info-soft px-1.5 py-px text-[9.5px] text-info-deep">
                        <Eye className="h-2.5 w-2.5" />
                        Cliente
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-[10.5px] text-ink-3">
                    {fmtBytes(d.tamano_bytes)} · {fmtFecha(d.created_at)}
                    {d.subido_por_nombre && ` · ${d.subido_por_nombre}`}
                  </p>
                  {d.descripcion && (
                    <p className="mt-1 line-clamp-2 text-[10.5px] text-ink-3">
                      {d.descripcion}
                    </p>
                  )}
                </div>
                <div className="flex flex-col gap-1 opacity-0 transition group-hover:opacity-100">
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
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

function UploadForm({
  proyectoId,
  onUploaded,
}: {
  proyectoId: string;
  onUploaded: () => void;
}) {
  const [state, formAction] = useFormState(subirDocumento, initialSimpleFormState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) {
      formRef.current?.reset();
      onUploaded();
    }
  }, [state.ok, onUploaded]);

  return (
    <form
      ref={formRef}
      action={formAction}
      className="rounded-md border border-border bg-card p-4 shadow-sm"
    >
      <input type="hidden" name="proyecto_id" value={proyectoId} />

      <div className="grid grid-cols-12 gap-2">
        <div className="col-span-12 md:col-span-7">
          <Label htmlFor="archivo" className="text-[11px]">
            Archivo (max 50MB)
          </Label>
          <Input
            id="archivo"
            name="archivo"
            type="file"
            required
            className="mt-0.5 text-sm"
          />
        </div>
        <div className="col-span-12 md:col-span-5">
          <Label htmlFor="categoria" className="text-[11px]">
            Categoría
          </Label>
          <select
            id="categoria"
            name="categoria"
            defaultValue="otro"
            className="mt-0.5 h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
          >
            {CATEGORIAS.map((c) => (
              <option key={c} value={c}>
                {ETIQUETA_CATEGORIA_DOC[c]}
              </option>
            ))}
          </select>
        </div>

        <div className="col-span-12 md:col-span-7">
          <Label htmlFor="nombre" className="text-[11px]">
            Nombre (opcional, usa el del archivo si vacío)
          </Label>
          <Input
            id="nombre"
            name="nombre"
            placeholder="Contrato firmado v2…"
            className="mt-0.5 text-sm"
          />
        </div>
        <div className="col-span-12 md:col-span-5 flex items-end">
          <label className="flex items-center gap-1.5 text-[12px]">
            <input
              type="checkbox"
              name="visible_cliente"
              className="h-4 w-4"
            />
            Visible para cliente
          </label>
        </div>

        <div className="col-span-12">
          <Label htmlFor="descripcion" className="text-[11px]">
            Descripción (opcional)
          </Label>
          <textarea
            id="descripcion"
            name="descripcion"
            rows={2}
            className="mt-0.5 w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm"
          />
        </div>
      </div>

      {state.error && (
        <p className="mt-2 text-[11px] text-destructive">{state.error}</p>
      )}

      <div className="mt-3 flex justify-end">
        <UploadBtn />
      </div>
    </form>
  );
}

function UploadBtn() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" disabled={pending}>
      {pending ? "Subiendo…" : "Subir"}
    </Button>
  );
}
