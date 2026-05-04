"use client";

import { Plus, Receipt, Sparkles } from "lucide-react";
import { useRef, useState, useTransition } from "react";
import { useFormState, useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Stat } from "@/components/ui/stat";
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
  COLOR_ESTADO_VIATICO,
  ETIQUETA_CATEGORIA_VIATICO,
  ETIQUETA_ESTADO_VIATICO,
  initialViaticoState,
  type CategoriaViatico,
  type EstadoViatico,
} from "@/lib/personas/state";

import {
  aprobarViatico,
  crearViatico,
  marcarReembolsado,
  ocrTicketViatico,
  rechazarViatico,
} from "./actions";

const fmtMxn = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
});

const fmtFecha = (d: string) =>
  new Date(d).toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

type Viatico = {
  id: string;
  fecha_gasto: string;
  concepto: string;
  categoria: string;
  monto: number;
  observaciones: string | null;
  estado: string;
  url_ticket: string | null;
  motivo_rechazo: string | null;
  fecha_aprobacion: string | null;
  fecha_reembolso: string | null;
};

type Proyecto = { id: string; codigo: string; nombre: string };

export function ViaticosTab({
  empleadoId,
  empresaId,
  viaticos,
  proyectos,
  totales,
  ticketUrls,
  puedeCapturar,
  puedeAprobar,
}: {
  empleadoId: string;
  empresaId: string;
  viaticos: Viatico[];
  proyectos: Proyecto[];
  totales: {
    pendiente: number;
    aprobado: number;
    reembolsado: number;
    total: number;
  };
  ticketUrls: Record<string, string | null>;
  puedeCapturar: boolean;
  puedeAprobar: boolean;
}) {
  const [showForm, setShowForm] = useState(false);
  const [state, formAction] = useFormState(crearViatico, initialViaticoState);
  const [, startTransition] = useTransition();
  const [ocrPending, startOcr] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  const [ocrInfo, setOcrInfo] = useState<{
    confidence: number;
    detectado: string[];
  } | null>(null);

  function escanearTicket(file: File) {
    if (!file) return;
    const fd = new FormData();
    fd.set("ticket", file);
    fd.set("empresa_id", empresaId);
    setOcrInfo(null);
    startOcr(async () => {
      const r = await ocrTicketViatico(fd);
      if (!r.ok) {
        alert(`No se pudo leer el ticket: ${r.error}`);
        return;
      }
      const f = formRef.current;
      if (!f) return;
      const set = (name: string, value: string) => {
        const el = f.elements.namedItem(name) as
          | HTMLInputElement
          | HTMLSelectElement
          | HTMLTextAreaElement
          | null;
        if (el) el.value = value;
      };
      const detectado: string[] = [];
      if (r.datos.fecha) {
        set("fecha_gasto", r.datos.fecha);
        detectado.push(`fecha ${r.datos.fecha}`);
      }
      if (r.datos.monto_total) {
        set("monto", String(r.datos.monto_total));
        detectado.push(`monto ${r.datos.monto_total}`);
      }
      if (r.datos.categoria) {
        set("categoria", r.datos.categoria);
        detectado.push(`categoría ${r.datos.categoria}`);
      }
      if (r.datos.concepto) {
        set("concepto", r.datos.concepto);
        detectado.push("concepto");
      } else if (r.datos.nombre_establecimiento) {
        set("concepto", r.datos.nombre_establecimiento);
        detectado.push("establecimiento → concepto");
      }
      setOcrInfo({ confidence: r.confidence, detectado });
    });
  }

  function aprobar(id: string) {
    startTransition(async () => {
      const r = await aprobarViatico(id);
      if (!r.ok) alert(`Error: ${r.error}`);
    });
  }
  function rechazar(id: string) {
    const motivo = prompt("Motivo del rechazo:");
    if (!motivo || !motivo.trim()) return;
    startTransition(async () => {
      const r = await rechazarViatico(id, motivo.trim());
      if (!r.ok) alert(`Error: ${r.error}`);
    });
  }
  function reembolsar(id: string) {
    if (!confirm("¿Marcar como reembolsado?")) return;
    startTransition(async () => {
      const r = await marcarReembolsado(id);
      if (!r.ok) alert(`Error: ${r.error}`);
    });
  }

  return (
    <div className="space-y-5">
      {/* Totales */}
      <section className="rounded-md border border-border bg-card p-5 shadow-xs">
        <h2 className="mb-3 text-[13.5px] font-semibold">Resumen</h2>
        <div className="grid gap-4 sm:grid-cols-4">
          <Stat
            label="Pendientes"
            value={fmtMxn.format(totales.pendiente)}
            color="var(--warn-deep)"
          />
          <Stat
            label="Aprobados"
            value={fmtMxn.format(totales.aprobado)}
            color="var(--info)"
          />
          <Stat
            label="Reembolsados"
            value={fmtMxn.format(totales.reembolsado)}
            color="var(--success-deep)"
          />
          <Stat label="Total histórico" value={fmtMxn.format(totales.total)} />
        </div>
        {puedeCapturar && (
          <div className="mt-4">
            <Button
              size="sm"
              variant={showForm ? "outline" : "default"}
              onClick={() => setShowForm((p) => !p)}
            >
              <Plus className="h-3.5 w-3.5" />
              {showForm ? "Cancelar" : "Capturar viático"}
            </Button>
          </div>
        )}
      </section>

      {/* Form */}
      {showForm && (
        <form
          ref={formRef}
          action={(fd) => {
            formAction(fd);
            setShowForm(false);
          }}
          className="rounded-md border border-border bg-card p-5 shadow-xs"
        >
          <input type="hidden" name="empleado_id" value={empleadoId} />
          <input type="hidden" name="empresa_id" value={empresaId} />
          <h3 className="mb-3 text-[13.5px] font-semibold">Nuevo viático</h3>

          {/* OCR con IA */}
          <div className="mb-4 rounded-md border border-info/40 bg-info-soft/40 p-3">
            <div className="mb-2 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-info" />
              <span className="text-[13px] font-medium">
                Escanear ticket con IA
              </span>
            </div>
            <p className="mb-2 text-[11.5px] text-ink-3">
              Toma o sube una foto del ticket — la IA llena fecha, monto,
              categoría y concepto automáticamente.
            </p>
            <input
              type="file"
              accept="image/*,application/pdf"
              capture="environment"
              disabled={ocrPending}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) escanearTicket(f);
              }}
              className="block w-full text-[12px] file:mr-3 file:rounded-md file:border-0 file:bg-info file:px-3 file:py-1.5 file:text-[12px] file:font-medium file:text-white hover:file:opacity-90 disabled:opacity-50"
            />
            {ocrPending && (
              <p className="mt-2 text-[11px] text-info-deep">
                Leyendo ticket con Claude…
              </p>
            )}
            {ocrInfo && (
              <p className="mt-2 text-[11px] text-ink-3">
                ✓ Detectado ({(ocrInfo.confidence * 100).toFixed(0)}% confianza):
                {" "}
                {ocrInfo.detectado.join(", ")}.{" "}
                <span className="text-ink-3">
                  Revisa los campos abajo y ajusta si hace falta.
                </span>
              </p>
            )}
          </div>


          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="fecha_gasto">Fecha del gasto</Label>
              <Input
                id="fecha_gasto"
                name="fecha_gasto"
                type="date"
                required
                defaultValue={new Date().toISOString().slice(0, 10)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="categoria">Categoría</Label>
              <select
                id="categoria"
                name="categoria"
                required
                defaultValue="alimentos"
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-[13px]"
              >
                <option value="hospedaje">Hospedaje</option>
                <option value="alimentos">Alimentos</option>
                <option value="transporte">Transporte</option>
                <option value="combustible">Combustible</option>
                <option value="peajes">Peajes</option>
                <option value="estacionamiento">Estacionamiento</option>
                <option value="papeleria">Papelería</option>
                <option value="telefono">Teléfono</option>
                <option value="otros">Otros</option>
              </select>
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label htmlFor="concepto">Concepto</Label>
              <Input
                id="concepto"
                name="concepto"
                required
                maxLength={200}
                placeholder="Comida con cliente, gasolina ruta a obra…"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="monto">Monto (MXN)</Label>
              <Input
                id="monto"
                name="monto"
                type="number"
                step="0.01"
                min="0.01"
                required
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="proyecto_id">Proyecto (opcional)</Label>
              <select
                id="proyecto_id"
                name="proyecto_id"
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-[13px]"
              >
                <option value="">— Sin proyecto —</option>
                {proyectos.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.codigo} · {p.nombre}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label htmlFor="ticket">Ticket / comprobante (PDF o foto)</Label>
              <input
                id="ticket"
                name="ticket"
                type="file"
                accept="image/*,application/pdf"
                className="block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-secondary file:px-3 file:py-1.5 file:text-sm hover:file:bg-secondary/80"
              />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label htmlFor="observaciones">Observaciones</Label>
              <Input id="observaciones" name="observaciones" maxLength={500} />
            </div>
          </div>

          {state.error && (
            <p className="mt-3 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {state.error}
            </p>
          )}
          <div className="mt-4 flex gap-2">
            <SubmitBtn label="Capturar" />
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

      {/* Lista */}
      <section>
        <h2 className="mb-3 text-[13.5px] font-semibold">Histórico</h2>
        {viaticos.length === 0 ? (
          <div className="rounded-md border border-dashed border-border bg-card p-8 text-center text-sm text-ink-3">
            Sin viáticos capturados.
          </div>
        ) : (
          <TableSurface>
            <Table>
              <TableHeader>
                <TableRow interactive={false}>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Concepto</TableHead>
                  <TableHead>Categoría</TableHead>
                  <TableHead align="right">Monto</TableHead>
                  <TableHead>Ticket</TableHead>
                  <TableHead>Estado</TableHead>
                  {puedeAprobar && <TableHead>Acciones</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {viaticos.map((v) => {
                  const estado = v.estado as EstadoViatico;
                  const cat = v.categoria as CategoriaViatico;
                  const url = ticketUrls[v.id];
                  return (
                    <TableRow key={v.id}>
                      <TableCell className="text-[12.5px] text-ink-3">
                        {fmtFecha(v.fecha_gasto)}
                      </TableCell>
                      <TableCell className="text-[12.5px]">
                        <p className="line-clamp-1 max-w-xs">{v.concepto}</p>
                        {v.observaciones && (
                          <p className="line-clamp-1 max-w-xs text-[11px] text-ink-3">
                            {v.observaciones}
                          </p>
                        )}
                      </TableCell>
                      <TableCell className="text-[12px]">
                        {ETIQUETA_CATEGORIA_VIATICO[cat] ?? cat}
                      </TableCell>
                      <TableCell align="right" mono>
                        {fmtMxn.format(Number(v.monto))}
                      </TableCell>
                      <TableCell>
                        {url ? (
                          <a
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[12px] text-brand hover:underline"
                          >
                            <Receipt className="h-3 w-3" />
                            Ver
                          </a>
                        ) : (
                          <span className="text-[11px] text-ink-4">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${COLOR_ESTADO_VIATICO[estado]}`}
                        >
                          {ETIQUETA_ESTADO_VIATICO[estado]}
                        </span>
                        {v.motivo_rechazo && (
                          <p className="mt-0.5 line-clamp-1 max-w-xs text-[10px] text-danger-deep">
                            {v.motivo_rechazo}
                          </p>
                        )}
                      </TableCell>
                      {puedeAprobar && (
                        <TableCell>
                          {v.estado === "pendiente" ? (
                            <div className="flex gap-1">
                              <Button size="sm" onClick={() => aprobar(v.id)}>
                                Aprobar
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-destructive"
                                onClick={() => rechazar(v.id)}
                              >
                                Rechazar
                              </Button>
                            </div>
                          ) : v.estado === "aprobado" ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => reembolsar(v.id)}
                            >
                              Reembolsar
                            </Button>
                          ) : (
                            <span className="text-[11px] text-ink-3">—</span>
                          )}
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableSurface>
        )}
      </section>
    </div>
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
