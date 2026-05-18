"use client";

import { Download, FileText, Trash2, Upload } from "lucide-react";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { confirm } from "@/components/ui/confirm";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { notify } from "@/components/ui/notify";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableSurface,
} from "@/components/ui/table";
import {
  ETIQUETA_TIPO_DOC,
  type TipoDocumentoEmpleado,
} from "@/lib/personas/state";

import {
  eliminarDocumentoEmpleado,
  subirDocumentoEmpleado,
} from "./actions";

const fmtFecha = (d: string | null) =>
  d
    ? new Date(d).toLocaleDateString("es-MX", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "—";

type Documento = {
  id: string;
  tipo: string;
  nombre_archivo: string;
  fecha_emision: string | null;
  fecha_vencimiento: string | null;
  observaciones: string | null;
  created_at: string;
};

export function DocumentosTab({
  empleadoId,
  documentos,
  signedUrls,
  puedeGestionar,
}: {
  empleadoId: string;
  documentos: Documento[];
  signedUrls: Record<string, string | null>;
  puedeGestionar: boolean;
}) {
  const [showForm, setShowForm] = useState(false);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  async function eliminar(id: string) {
    if (
      !(await confirm({
        message: "¿Eliminar este documento?",
        danger: true,
        confirmLabel: "Eliminar",
      }))
    )
      return;
    start(async () => {
      const r = await eliminarDocumentoEmpleado(id);
      if (!r.ok) notify({ message: r.error ?? "Error", variant: "error" });
    });
  }

  function submit(formData: FormData) {
    setError(null);
    formData.set("empleado_id", empleadoId);
    start(async () => {
      const r = await subirDocumentoEmpleado(formData);
      if (!r.ok) {
        setError(r.error);
        return;
      }
      setShowForm(false);
    });
  }

  const hoy = new Date();
  const proximoVencer = documentos.filter(
    (d) =>
      d.fecha_vencimiento &&
      new Date(d.fecha_vencimiento) > hoy &&
      new Date(d.fecha_vencimiento) <
        new Date(hoy.getTime() + 90 * 24 * 60 * 60 * 1000),
  );
  const vencidos = documentos.filter(
    (d) => d.fecha_vencimiento && new Date(d.fecha_vencimiento) < hoy,
  );

  return (
    <div className="space-y-5">
      {(vencidos.length > 0 || proximoVencer.length > 0) && (
        <div className="rounded-md border border-warn/40 bg-warn-soft/40 p-4">
          {vencidos.length > 0 && (
            <p className="text-[13px] text-danger-deep">
              <strong>{vencidos.length} documento(s) vencido(s)</strong> —
              renueva al empleado.
            </p>
          )}
          {proximoVencer.length > 0 && (
            <p className="mt-1 text-[13px] text-warn-deep">
              <strong>{proximoVencer.length} documento(s)</strong> vencen en los
              próximos 90 días.
            </p>
          )}
        </div>
      )}

      {puedeGestionar && (
        <div>
          <Button
            size="sm"
            variant={showForm ? "outline" : "default"}
            onClick={() => setShowForm((p) => !p)}
          >
            <Upload className="h-3.5 w-3.5" />
            {showForm ? "Cancelar" : "Subir documento"}
          </Button>
        </div>
      )}

      {showForm && (
        <form
          action={submit}
          className="rounded-md border border-border bg-card p-5 shadow-xs"
        >
          <h3 className="mb-3 text-[13.5px] font-semibold">Nuevo documento</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="tipo">Tipo</Label>
              <select
                id="tipo"
                name="tipo"
                required
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-[13px]"
              >
                {Object.entries(ETIQUETA_TIPO_DOC).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="archivo">Archivo (PDF, imagen)</Label>
              <input
                id="archivo"
                name="archivo"
                type="file"
                required
                accept=".pdf,image/*"
                className="block h-9 w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-secondary file:px-3 file:py-1.5 file:text-sm hover:file:bg-secondary/80"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="fecha_emision">Fecha emisión (opcional)</Label>
              <Input
                id="fecha_emision"
                name="fecha_emision"
                type="date"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="fecha_vencimiento">
                Fecha vencimiento (opcional)
              </Label>
              <Input
                id="fecha_vencimiento"
                name="fecha_vencimiento"
                type="date"
              />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label htmlFor="observaciones">Observaciones</Label>
              <Input id="observaciones" name="observaciones" maxLength={500} />
            </div>
          </div>
          {error && (
            <p className="mt-3 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}
          <div className="mt-4 flex gap-2">
            <Button type="submit" disabled={pending}>
              {pending ? "Subiendo…" : "Subir"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowForm(false)}
            >
              Cancelar
            </Button>
          </div>
        </form>
      )}

      {documentos.length === 0 ? (
        <div className="rounded-md border border-dashed border-border bg-card p-12 text-center text-sm text-ink-3">
          Sin documentos cargados.
        </div>
      ) : (
        <TableSurface>
          <Table>
            <TableHeader>
              <TableRow interactive={false}>
                <TableHead>Tipo</TableHead>
                <TableHead>Archivo</TableHead>
                <TableHead>Emisión</TableHead>
                <TableHead>Vencimiento</TableHead>
                <TableHead>Observaciones</TableHead>
                <TableHead>Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {documentos.map((d) => {
                const tipo = d.tipo as TipoDocumentoEmpleado;
                const url = signedUrls[d.id];
                const venc = d.fecha_vencimiento
                  ? new Date(d.fecha_vencimiento)
                  : null;
                const status = venc
                  ? venc < hoy
                    ? "vencido"
                    : venc <
                        new Date(hoy.getTime() + 90 * 24 * 60 * 60 * 1000)
                      ? "proximo"
                      : "vigente"
                  : null;
                return (
                  <TableRow key={d.id}>
                    <TableCell className="text-[12.5px] font-medium">
                      {ETIQUETA_TIPO_DOC[tipo] ?? tipo}
                    </TableCell>
                    <TableCell className="text-[12px] text-ink-3">
                      <FileText className="mr-1 inline h-3 w-3" />
                      {d.nombre_archivo}
                    </TableCell>
                    <TableCell className="text-[12px] text-ink-3">
                      {fmtFecha(d.fecha_emision)}
                    </TableCell>
                    <TableCell className="text-[12px]">
                      <span
                        className={
                          status === "vencido"
                            ? "text-danger-deep font-medium"
                            : status === "proximo"
                              ? "text-warn-deep font-medium"
                              : "text-ink-3"
                        }
                      >
                        {fmtFecha(d.fecha_vencimiento)}
                      </span>
                    </TableCell>
                    <TableCell className="text-[12px] text-ink-3">
                      <p className="line-clamp-1 max-w-xs">
                        {d.observaciones ?? "—"}
                      </p>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {url && (
                          <a
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <Button size="sm" variant="outline">
                              <Download className="h-3.5 w-3.5" />
                            </Button>
                          </a>
                        )}
                        {puedeGestionar && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-destructive"
                            onClick={() => eliminar(d.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableSurface>
      )}
    </div>
  );
}
