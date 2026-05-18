"use client";

import { Plus } from "lucide-react";
import { useState, useTransition } from "react";
import { useFormState, useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";
import { confirm } from "@/components/ui/confirm";
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
  COLOR_ESTADO_VACACION,
  ETIQUETA_ESTADO_VACACION,
  ETIQUETA_TIPO_VACACION,
  initialVacacionState,
  type EstadoVacacion,
  type TipoVacacion,
} from "@/lib/personas/state";

import {
  aprobarVacacion,
  rechazarVacacion,
  solicitarVacaciones,
} from "./actions";

const fmtFecha = (d: string) =>
  new Date(d).toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

type Solicitud = {
  id: string;
  tipo: string;
  fecha_inicio: string;
  fecha_fin: string;
  dias: number;
  motivo: string | null;
  estado: string;
  observaciones: string | null;
  fecha_aprobacion: string | null;
};

export function VacacionesTab({
  empleadoId,
  diasAnualesLft,
  diasTomados,
  diasDisponibles,
  solicitudes,
  puedeSolicitar,
  puedeAprobar,
}: {
  empleadoId: string;
  diasAnualesLft: number;
  diasTomados: number;
  diasDisponibles: number;
  solicitudes: Solicitud[];
  puedeSolicitar: boolean;
  puedeAprobar: boolean;
}) {
  const [showForm, setShowForm] = useState(false);
  const [state, formAction] = useFormState(
    solicitarVacaciones,
    initialVacacionState,
  );
  const [, startTransition] = useTransition();

  async function aprobar(id: string) {
    if (!(await confirm("¿Aprobar esta solicitud?"))) return;
    startTransition(async () => {
      const r = await aprobarVacacion(id);
      if (!r.ok) alert(`Error: ${r.error}`);
    });
  }

  function rechazar(id: string) {
    const motivo = prompt("Motivo del rechazo:");
    if (!motivo || !motivo.trim()) return;
    startTransition(async () => {
      const r = await rechazarVacacion(id, motivo.trim());
      if (!r.ok) alert(`Error: ${r.error}`);
    });
  }

  return (
    <div className="space-y-5">
      {/* Saldo */}
      <section className="rounded-md border border-border bg-card p-5 shadow-xs">
        <h2 className="mb-3 text-[13.5px] font-semibold">
          Saldo de vacaciones · período actual
        </h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <Stat
            label="Días anuales (LFT)"
            value={diasAnualesLft}
            mono={false}
            sub="Según antigüedad"
          />
          <Stat
            label="Días tomados"
            value={diasTomados}
            mono={false}
            color="var(--warn-deep)"
          />
          <Stat
            label="Disponibles"
            value={diasDisponibles}
            mono={false}
            color={
              diasDisponibles > 0 ? "var(--success-deep)" : "var(--ink-3)"
            }
          />
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-bg-3">
          <div
            className="h-full bg-emerald-500"
            style={{
              width: `${diasAnualesLft > 0 ? Math.min((diasTomados / diasAnualesLft) * 100, 100) : 0}%`,
            }}
          />
        </div>
        {puedeSolicitar && (
          <div className="mt-4">
            <Button
              size="sm"
              variant={showForm ? "outline" : "default"}
              onClick={() => setShowForm((p) => !p)}
            >
              <Plus className="h-3.5 w-3.5" />
              {showForm ? "Cancelar" : "Solicitar permiso"}
            </Button>
          </div>
        )}
      </section>

      {/* Form de solicitud */}
      {showForm && (
        <form
          action={(fd) => {
            formAction(fd);
            setShowForm(false);
          }}
          className="rounded-md border border-border bg-card p-5 shadow-xs"
        >
          <input type="hidden" name="empleado_id" value={empleadoId} />
          <h3 className="mb-3 text-[13.5px] font-semibold">
            Nueva solicitud
          </h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="tipo">Tipo</Label>
              <select
                id="tipo"
                name="tipo"
                required
                defaultValue="vacaciones"
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-[13px]"
              >
                <option value="vacaciones">Vacaciones</option>
                <option value="permiso_con_goce">Permiso con goce</option>
                <option value="permiso_sin_goce">Permiso sin goce</option>
                <option value="incapacidad">Incapacidad</option>
              </select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="motivo">Motivo (opcional)</Label>
              <Input id="motivo" name="motivo" maxLength={500} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="fecha_inicio">Inicio</Label>
              <Input
                id="fecha_inicio"
                name="fecha_inicio"
                type="date"
                required
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="fecha_fin">Fin</Label>
              <Input
                id="fecha_fin"
                name="fecha_fin"
                type="date"
                required
              />
            </div>
          </div>
          {state.error && (
            <p className="mt-3 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {state.error}
            </p>
          )}
          <div className="mt-4 flex gap-2">
            <SubmitBtn label="Solicitar" />
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

      {/* Histórico */}
      <section>
        <h2 className="mb-3 text-[13.5px] font-semibold">Histórico</h2>
        {solicitudes.length === 0 ? (
          <div className="rounded-md border border-dashed border-border bg-card p-8 text-center text-sm text-ink-3">
            Sin solicitudes registradas.
          </div>
        ) : (
          <TableSurface>
            <Table>
              <TableHeader>
                <TableRow interactive={false}>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Inicio</TableHead>
                  <TableHead>Fin</TableHead>
                  <TableHead align="right">Días</TableHead>
                  <TableHead>Motivo</TableHead>
                  <TableHead>Estado</TableHead>
                  {puedeAprobar && <TableHead>Acciones</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {solicitudes.map((s) => {
                  const estado = s.estado as EstadoVacacion;
                  const tipo = s.tipo as TipoVacacion;
                  return (
                    <TableRow key={s.id}>
                      <TableCell className="text-[12.5px]">
                        {ETIQUETA_TIPO_VACACION[tipo] ?? tipo}
                      </TableCell>
                      <TableCell className="text-[12.5px]">
                        {fmtFecha(s.fecha_inicio)}
                      </TableCell>
                      <TableCell className="text-[12.5px]">
                        {fmtFecha(s.fecha_fin)}
                      </TableCell>
                      <TableCell align="right" mono>
                        {s.dias}
                      </TableCell>
                      <TableCell className="text-[12px] text-ink-3">
                        <p className="line-clamp-1 max-w-xs">
                          {s.motivo ?? "—"}
                        </p>
                        {s.observaciones && (
                          <p className="line-clamp-1 max-w-xs text-danger-deep">
                            {s.observaciones}
                          </p>
                        )}
                      </TableCell>
                      <TableCell>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${COLOR_ESTADO_VACACION[estado]}`}
                        >
                          {ETIQUETA_ESTADO_VACACION[estado]}
                        </span>
                      </TableCell>
                      {puedeAprobar && (
                        <TableCell>
                          {s.estado === "pendiente" ? (
                            <div className="flex gap-1">
                              <Button
                                size="sm"
                                onClick={() => aprobar(s.id)}
                              >
                                Aprobar
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-destructive"
                                onClick={() => rechazar(s.id)}
                              >
                                Rechazar
                              </Button>
                            </div>
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
      {pending ? "Enviando…" : label}
    </Button>
  );
}
