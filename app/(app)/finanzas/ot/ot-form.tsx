"use client";

import { useEffect, useMemo, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { calcularTotalesOT } from "@/lib/ot/schemas";
import { initialOTState, MARGEN_DEFAULT } from "@/lib/ot/state";

import { createOT } from "./actions";

const empresaCodigoColor: Record<string, string> = {
  PSE: "bg-pse",
  CIAE: "bg-ciae",
  IED: "bg-ied",
  LIMSON: "bg-limson",
};

const fmtMxn = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
});

type Empresa = {
  id: string;
  codigo: string;
  razon_social: string;
  nombre_comercial: string | null;
};

type Servicio = {
  id: string;
  empresa_id: string;
  codigo: string;
  nombre: string;
  unidad: string | null;
  costo_base: number | null;
  margen_inter_co: number | null;
  precio_inter_co: number | null;
};

type Proyecto = {
  id: string;
  codigo: string;
  nombre: string;
  empresa_id: string;
};

export function OTForm({
  empresas,
  servicios,
  proyectos,
  empresasOrigenIds,
}: {
  empresas: Empresa[];
  servicios: Servicio[];
  proyectos: Proyecto[];
  empresasOrigenIds: string[];
}) {
  const [state, formAction] = useFormState(createOT, initialOTState);
  const [origenId, setOrigenId] = useState("");
  const [destinoId, setDestinoId] = useState("");
  const [servicioId, setServicioId] = useState("");
  const [proyectoId, setProyectoId] = useState("");
  const [cantidad, setCantidad] = useState("1");
  const [costoBase, setCostoBase] = useState("");
  const [margen, setMargen] = useState(String(MARGEN_DEFAULT));
  const [iva, setIva] = useState("0.16");
  const [retenciones, setRetenciones] = useState("0");
  const [unidad, setUnidad] = useState("");

  // Servicios disponibles: los de la empresa destino.
  const serviciosDestino = useMemo(
    () =>
      destinoId
        ? servicios.filter((s) => s.empresa_id === destinoId)
        : [],
    [destinoId, servicios],
  );

  // Proyectos: los de la empresa origen.
  const proyectosOrigen = useMemo(
    () => (origenId ? proyectos.filter((p) => p.empresa_id === origenId) : []),
    [origenId, proyectos],
  );

  // Auto-llenar costo + unidad + margen al elegir servicio.
  useEffect(() => {
    if (!servicioId) return;
    const s = servicios.find((x) => x.id === servicioId);
    if (s) {
      if (s.costo_base != null) setCostoBase(String(s.costo_base));
      if (s.margen_inter_co != null) setMargen(String(s.margen_inter_co));
      if (s.unidad) setUnidad(s.unidad);
    }
  }, [servicioId, servicios]);

  // Limpiar servicio si cambia destino.
  useEffect(() => {
    setServicioId("");
  }, [destinoId]);

  // Limpiar proyecto si cambia origen.
  useEffect(() => {
    setProyectoId("");
  }, [origenId]);

  const totales = useMemo(
    () =>
      calcularTotalesOT({
        cantidad: Number(cantidad) || 0,
        costo_base: Number(costoBase) || 0,
        margen_aplicado: Number(margen) || 0,
        iva_tasa: Number(iva) || 0,
        retenciones: Number(retenciones) || 0,
      }),
    [cantidad, costoBase, margen, iva, retenciones],
  );

  const empresasOrigen = empresas.filter((e) => empresasOrigenIds.includes(e.id));
  const empresasDestino = empresas.filter((e) => e.id !== origenId);

  const fieldErr = (k: string) => state.fieldErrors?.[k]?.[0];

  if (empresasOrigen.length === 0) {
    return (
      <div className="rounded-lg border border-warning/40 bg-warning/10 p-4 text-sm">
        <p className="font-medium">Sin empresas donde puedas crear OT.</p>
        <p className="mt-1 text-muted-foreground">
          Necesitas rol CEO, Director u Operativo en al menos una empresa.
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="proyecto_id" value={proyectoId} />
      <input type="hidden" name="servicio_id" value={servicioId} />

      {/* Empresas */}
      <section className="rounded-lg border border-border bg-card p-5 shadow-sm">
        <h2 className="text-base font-semibold">Empresas involucradas</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <Label className="text-sm font-medium">Origen (paga el servicio)</Label>
            <fieldset className="mt-2 space-y-1">
              {empresasOrigen.map((e) => (
                <label
                  key={e.id}
                  className="flex cursor-pointer items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm hover:bg-secondary"
                >
                  <input
                    type="radio"
                    name="empresa_origen_id"
                    value={e.id}
                    required
                    checked={origenId === e.id}
                    onChange={() => setOrigenId(e.id)}
                    className="h-4 w-4"
                  />
                  <span
                    className={`inline-block h-2 w-2 rounded-full ${
                      empresaCodigoColor[e.codigo] ?? "bg-muted-foreground"
                    }`}
                  />
                  <span>{e.nombre_comercial ?? e.razon_social}</span>
                </label>
              ))}
            </fieldset>
            {fieldErr("empresa_origen_id") && (
              <p className="mt-1 text-xs text-destructive">{fieldErr("empresa_origen_id")}</p>
            )}
          </div>

          <div>
            <Label className="text-sm font-medium">
              Destino (presta el servicio)
            </Label>
            <fieldset className="mt-2 space-y-1">
              {empresasDestino.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Selecciona origen primero.
                </p>
              ) : (
                empresasDestino.map((e) => (
                  <label
                    key={e.id}
                    className="flex cursor-pointer items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm hover:bg-secondary"
                  >
                    <input
                      type="radio"
                      name="empresa_destino_id"
                      value={e.id}
                      required
                      checked={destinoId === e.id}
                      onChange={() => setDestinoId(e.id)}
                      className="h-4 w-4"
                    />
                    <span
                      className={`inline-block h-2 w-2 rounded-full ${
                        empresaCodigoColor[e.codigo] ?? "bg-muted-foreground"
                      }`}
                    />
                    <span>{e.nombre_comercial ?? e.razon_social}</span>
                  </label>
                ))
              )}
            </fieldset>
            {fieldErr("empresa_destino_id") && (
              <p className="mt-1 text-xs text-destructive">{fieldErr("empresa_destino_id")}</p>
            )}
          </div>
        </div>
      </section>

      {/* Servicio + proyecto */}
      <section className="rounded-lg border border-border bg-card p-5 shadow-sm">
        <h2 className="text-base font-semibold">Servicio y proyecto</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor="servicio_select">Servicio (opcional)</Label>
            <select
              id="servicio_select"
              value={servicioId}
              onChange={(e) => setServicioId(e.target.value)}
              disabled={!destinoId}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm disabled:opacity-50"
            >
              <option value="">— Sin servicio (manual) —</option>
              {serviciosDestino.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.codigo} — {s.nombre}{" "}
                  {s.precio_inter_co != null
                    ? `· ${fmtMxn.format(Number(s.precio_inter_co))}`
                    : ""}
                </option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground">
              Si seleccionas, autocompleta costo, unidad y margen.
            </p>
          </div>

          <div className="space-y-1">
            <Label htmlFor="proyecto_select">Proyecto (opcional)</Label>
            <select
              id="proyecto_select"
              value={proyectoId}
              onChange={(e) => setProyectoId(e.target.value)}
              disabled={!origenId}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm disabled:opacity-50"
            >
              <option value="">— Sin proyecto —</option>
              {proyectosOrigen.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.codigo} — {p.nombre}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {/* Detalles */}
      <section className="rounded-lg border border-border bg-card p-5 shadow-sm">
        <h2 className="text-base font-semibold">Detalle del trabajo</h2>
        <div className="mt-4 space-y-4">
          <div className="space-y-1">
            <Label htmlFor="descripcion">Descripción del servicio</Label>
            <textarea
              id="descripcion"
              name="descripcion"
              required
              rows={3}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              placeholder="Mantenimiento preventivo de sistema FV de 50 kWp en sitio del cliente"
            />
            {fieldErr("descripcion") && (
              <p className="text-xs text-destructive">{fieldErr("descripcion")}</p>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1">
              <Label htmlFor="fecha_solicitud">Fecha solicitud</Label>
              <Input
                id="fecha_solicitud"
                name="fecha_solicitud"
                type="date"
                required
                defaultValue={new Date().toISOString().slice(0, 10)}
              />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label htmlFor="fecha_completacion_esperada">
                Fecha completación esperada
              </Label>
              <Input
                id="fecha_completacion_esperada"
                name="fecha_completacion_esperada"
                type="date"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="cantidad">Cantidad</Label>
              <Input
                id="cantidad"
                name="cantidad"
                type="number"
                min="0"
                step="0.01"
                value={cantidad}
                onChange={(e) => setCantidad(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="unidad">Unidad</Label>
              <Input
                id="unidad"
                name="unidad"
                value={unidad}
                onChange={(e) => setUnidad(e.target.value)}
                placeholder="servicio, m², hora, kWp"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="costo_base">Costo base unitario (MXN)</Label>
              <Input
                id="costo_base"
                name="costo_base"
                type="number"
                min="0"
                step="0.01"
                value={costoBase}
                onChange={(e) => setCostoBase(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="margen_aplicado">Margen aplicado (0-1)</Label>
              <Input
                id="margen_aplicado"
                name="margen_aplicado"
                type="number"
                min="0"
                max="1"
                step="0.01"
                value={margen}
                onChange={(e) => setMargen(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="iva_tasa">Tasa IVA (0-1)</Label>
              <Input
                id="iva_tasa"
                name="iva_tasa"
                type="number"
                min="0"
                max="1"
                step="0.01"
                value={iva}
                onChange={(e) => setIva(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="retenciones">Retenciones (MXN)</Label>
              <Input
                id="retenciones"
                name="retenciones"
                type="number"
                min="0"
                step="0.01"
                value={retenciones}
                onChange={(e) => setRetenciones(e.target.value)}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Totales */}
      <section className="ml-auto max-w-sm rounded-lg border border-border bg-card p-5 shadow-sm">
        <dl className="space-y-1.5 text-sm">
          <Row k="Subtotal (cantidad × costo base)" v={fmtMxn.format(totales.subtotal)} />
          <Row k={`Margen ${(Number(margen) * 100).toFixed(0)}%`} v={fmtMxn.format(totales.precio_inter_co - totales.subtotal)} />
          <Row k="Precio inter-co" v={fmtMxn.format(totales.precio_inter_co)} />
          <Row k="IVA" v={fmtMxn.format(totales.iva)} />
          <Row k="Retenciones" v={`- ${fmtMxn.format(totales.retenciones)}`} />
          <div className="my-2 border-t border-border" />
          <Row k={<strong>Total</strong>} v={<strong className="text-base">{fmtMxn.format(totales.total)}</strong>} />
        </dl>
      </section>

      <section className="rounded-lg border border-border bg-card p-5 shadow-sm">
        <Label htmlFor="observaciones">Observaciones</Label>
        <textarea
          id="observaciones"
          name="observaciones"
          rows={2}
          maxLength={2000}
          className="mt-2 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        />
      </section>

      {state.error && (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.error}
        </p>
      )}

      <SubmitBtn />
    </form>
  );
}

function Row({ k, v }: { k: React.ReactNode; v: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-2">
      <dt className="text-muted-foreground">{k}</dt>
      <dd className="font-mono">{v}</dd>
    </div>
  );
}

function SubmitBtn() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Creando OT…" : "Crear OT"}
    </Button>
  );
}
