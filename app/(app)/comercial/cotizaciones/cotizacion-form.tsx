"use client";

import { Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";

import { ClientePicker } from "@/components/shared/cliente-picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  calcularTotales,
  initialCotizacionState,
} from "@/lib/cotizaciones/state";

import { actualizarCotizacion, crearCotizacion } from "./actions";

type Empresa = {
  id: string;
  codigo: string;
  razon_social: string;
  nombre_comercial: string | null;
};

type Cliente = {
  id: string;
  razon_social: string;
  rfc: string;
  nombre_comercial: string | null;
};

type Oportunidad = {
  id: string;
  nombre: string;
  empresa_id: string;
  cliente_id: string | null;
};

type ConceptoLocal = {
  key: string;
  descripcion: string;
  cantidad: string;
  unidad_sat: string;
  precio_unitario: string;
  descuento: string;
  iva_tasa: string;
  clave_sat: string;
  observaciones: string;
};

type DefaultConcepto = {
  descripcion: string;
  cantidad: number | string;
  unidad_sat?: string | null;
  precio_unitario: number | string;
  descuento?: number | string;
  iva_tasa?: number | string;
  clave_sat?: string | null;
  observaciones?: string | null;
};

type Defaults = {
  empresa_id?: string;
  cliente_id?: string;
  oportunidad_id?: string | null;
  fecha_emision?: string;
  vigencia_dias?: number | string;
  descuento_global?: number | string;
  retenciones?: number | string;
  condiciones_pago?: string | null;
  notas?: string | null;
  conceptos?: DefaultConcepto[];
};

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

function nuevoConcepto(): ConceptoLocal {
  return {
    key: crypto.randomUUID(),
    descripcion: "",
    cantidad: "1",
    unidad_sat: "",
    precio_unitario: "",
    descuento: "0",
    iva_tasa: "0.16",
    clave_sat: "",
    observaciones: "",
  };
}

function conceptoDesdeDefault(c: DefaultConcepto): ConceptoLocal {
  return {
    key: crypto.randomUUID(),
    descripcion: c.descripcion ?? "",
    cantidad: String(c.cantidad ?? "1"),
    unidad_sat: c.unidad_sat ?? "",
    precio_unitario: String(c.precio_unitario ?? ""),
    descuento: String(c.descuento ?? "0"),
    iva_tasa: String(c.iva_tasa ?? "0.16"),
    clave_sat: c.clave_sat ?? "",
    observaciones: c.observaciones ?? "",
  };
}

export function CotizacionForm({
  empresas,
  clientes,
  oportunidades = [],
  cotizacionId,
  defaults,
}: {
  empresas: Empresa[];
  clientes: Cliente[];
  oportunidades?: Oportunidad[];
  cotizacionId?: string;
  defaults?: Defaults;
}) {
  const router = useRouter();
  const action = cotizacionId
    ? actualizarCotizacion.bind(null, cotizacionId)
    : crearCotizacion;
  const [state, formAction] = useFormState(action, initialCotizacionState);

  const hoyStr = new Date().toISOString().slice(0, 10);

  const [empresaId, setEmpresaId] = useState<string>(
    defaults?.empresa_id ?? (empresas.length === 1 ? empresas[0].id : ""),
  );
  const [clienteId, setClienteId] = useState<string>(defaults?.cliente_id ?? "");
  const [oportunidadId, setOportunidadId] = useState<string>(
    defaults?.oportunidad_id ?? "",
  );
  const [fechaEmision, setFechaEmision] = useState<string>(
    defaults?.fecha_emision ?? hoyStr,
  );
  const [vigenciaDias, setVigenciaDias] = useState<string>(
    String(defaults?.vigencia_dias ?? 30),
  );
  const [descuentoGlobal, setDescuentoGlobal] = useState<string>(
    String(defaults?.descuento_global ?? 0),
  );
  const [retenciones, setRetenciones] = useState<string>(
    String(defaults?.retenciones ?? 0),
  );
  const [condicionesPago, setCondicionesPago] = useState<string>(
    defaults?.condiciones_pago ?? "",
  );
  const [notas, setNotas] = useState<string>(defaults?.notas ?? "");
  const [conceptos, setConceptos] = useState<ConceptoLocal[]>(
    defaults?.conceptos && defaults.conceptos.length > 0
      ? defaults.conceptos.map(conceptoDesdeDefault)
      : [nuevoConcepto()],
  );

  // Tras crear, redirigir al detalle.
  useEffect(() => {
    if (state.ok && state.cotizacionId) {
      router.push(`/comercial/cotizaciones/${state.cotizacionId}`);
    }
  }, [state.ok, state.cotizacionId, router]);

  const oportunidadesFiltradas = useMemo(
    () =>
      empresaId
        ? oportunidades.filter(
            (o) =>
              o.empresa_id === empresaId &&
              (!clienteId || o.cliente_id === clienteId),
          )
        : [],
    [oportunidades, empresaId, clienteId],
  );

  const totales = useMemo(() => {
    return calcularTotales(
      conceptos.map((c) => ({
        descripcion: c.descripcion,
        cantidad: Number(c.cantidad) || 0,
        precio_unitario: Number(c.precio_unitario) || 0,
        descuento: Number(c.descuento) || 0,
        iva_tasa: Number(c.iva_tasa) || 0,
      })),
      Number(descuentoGlobal) || 0,
    );
  }, [conceptos, descuentoGlobal]);

  function actualizarConcepto<K extends keyof ConceptoLocal>(
    idx: number,
    key: K,
    value: ConceptoLocal[K],
  ) {
    setConceptos((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], [key]: value };
      return next;
    });
  }

  function eliminarConcepto(idx: number) {
    setConceptos((prev) =>
      prev.length > 1 ? prev.filter((_, i) => i !== idx) : prev,
    );
  }

  if (empresas.length === 0) {
    return (
      <div className="rounded-lg border border-warning/40 bg-warning/10 p-4 text-sm">
        <p className="font-medium">No tienes empresas donde puedas cotizar.</p>
        <p className="mt-1 text-muted-foreground">
          Necesitas rol CEO, Director, Operativo, o el atributo Vendedor.
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-6">
      {/* Empresa */}
      <section className="rounded-lg border border-border bg-card p-5 shadow-sm">
        <h2 className="text-base font-semibold">Empresa emisora</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Empresa del grupo que cotiza al cliente.
        </p>
        <fieldset className="mt-4 grid grid-cols-2 gap-2">
          {empresas.map((e) => (
            <label
              key={e.id}
              className="flex cursor-pointer items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm hover:bg-secondary"
            >
              <input
                type="radio"
                name="empresa_id"
                value={e.id}
                required
                checked={empresaId === e.id}
                onChange={() => setEmpresaId(e.id)}
                className="accent-primary"
              />
              <span
                className={`inline-block h-2 w-2 rounded-full ${
                  empresaCodigoColor[e.codigo] ?? "bg-muted-foreground"
                }`}
              />
              <span className="font-mono text-[11px] uppercase tracking-wide text-ink-3">
                {e.codigo}
              </span>
              <span className="ml-1 truncate">
                {e.nombre_comercial ?? e.razon_social}
              </span>
            </label>
          ))}
        </fieldset>
      </section>

      {/* Cliente */}
      <section className="rounded-lg border border-border bg-card p-5 shadow-sm">
        <h2 className="text-base font-semibold">Cliente</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          A quién va dirigida la cotización.
        </p>

        <div className="mt-4">
          <ClientePicker
            clientes={clientes}
            value={clienteId}
            onChange={setClienteId}
            empresaId={empresaId}
          />
        </div>

        {oportunidadesFiltradas.length > 0 && (
          <div className="mt-4">
            <Label htmlFor="oportunidad_id" className="text-sm">
              Oportunidad relacionada (opcional)
            </Label>
            <select
              id="oportunidad_id"
              name="oportunidad_id"
              value={oportunidadId}
              onChange={(e) => setOportunidadId(e.target.value)}
              className="mt-1 h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">— Ninguna —</option>
              {oportunidadesFiltradas.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.nombre}
                </option>
              ))}
            </select>
          </div>
        )}
      </section>

      {/* Datos generales */}
      <section className="rounded-lg border border-border bg-card p-5 shadow-sm">
        <h2 className="text-base font-semibold">Datos generales</h2>
        <div className="mt-4 grid grid-cols-3 gap-3">
          <div>
            <Label htmlFor="fecha_emision" className="text-sm">
              Fecha de emisión
            </Label>
            <Input
              id="fecha_emision"
              type="date"
              name="fecha_emision"
              value={fechaEmision}
              onChange={(e) => setFechaEmision(e.target.value)}
              required
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="vigencia_dias" className="text-sm">
              Vigencia (días)
            </Label>
            <Input
              id="vigencia_dias"
              type="number"
              name="vigencia_dias"
              min="1"
              max="365"
              value={vigenciaDias}
              onChange={(e) => setVigenciaDias(e.target.value)}
              required
              className="mt-1"
            />
          </div>
          <div>
            <Label className="text-sm">Vence el</Label>
            <p className="mt-2 text-sm text-ink-2">
              {(() => {
                if (!fechaEmision || !vigenciaDias) return "—";
                const d = new Date(fechaEmision);
                d.setDate(d.getDate() + (Number(vigenciaDias) || 0));
                return d.toLocaleDateString("es-MX");
              })()}
            </p>
          </div>
        </div>

        <div className="mt-4">
          <Label htmlFor="condiciones_pago" className="text-sm">
            Condiciones de pago (opcional)
          </Label>
          <Input
            id="condiciones_pago"
            type="text"
            name="condiciones_pago"
            value={condicionesPago}
            onChange={(e) => setCondicionesPago(e.target.value)}
            placeholder="50% anticipo, 50% contra entrega"
            className="mt-1"
          />
        </div>
      </section>

      {/* Conceptos */}
      <section className="rounded-lg border border-border bg-card p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold">Conceptos / partidas</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Mínimo un concepto. Los totales se calculan automáticamente.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              setConceptos((prev) => [...prev, nuevoConcepto()])
            }
          >
            <Plus className="h-3.5 w-3.5" />
            Agregar concepto
          </Button>
        </div>

        <div className="mt-4 space-y-3">
          {conceptos.map((c, idx) => (
            <div
              key={c.key}
              className="rounded-md border border-border bg-background p-3"
            >
              <div className="flex items-start justify-between gap-2">
                <span className="font-mono text-[11px] text-ink-3">
                  #{idx + 1}
                </span>
                {conceptos.length > 1 && (
                  <button
                    type="button"
                    onClick={() => eliminarConcepto(idx)}
                    className="text-ink-3 hover:text-destructive"
                    title="Eliminar concepto"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              <div className="mt-1 grid grid-cols-12 gap-2">
                <div className="col-span-6">
                  <Label className="text-[11px]">Descripción *</Label>
                  <Input
                    name={`conceptos[${idx}][descripcion]`}
                    value={c.descripcion}
                    onChange={(e) =>
                      actualizarConcepto(idx, "descripcion", e.target.value)
                    }
                    required
                    className="mt-0.5 text-sm"
                  />
                </div>
                <div className="col-span-2">
                  <Label className="text-[11px]">Cantidad *</Label>
                  <Input
                    name={`conceptos[${idx}][cantidad]`}
                    type="number"
                    step="0.0001"
                    min="0.0001"
                    value={c.cantidad}
                    onChange={(e) =>
                      actualizarConcepto(idx, "cantidad", e.target.value)
                    }
                    required
                    className="mt-0.5 text-sm"
                  />
                </div>
                <div className="col-span-2">
                  <Label className="text-[11px]">Unidad SAT</Label>
                  <Input
                    name={`conceptos[${idx}][unidad_sat]`}
                    value={c.unidad_sat}
                    onChange={(e) =>
                      actualizarConcepto(idx, "unidad_sat", e.target.value)
                    }
                    placeholder="E48"
                    className="mt-0.5 text-sm font-mono"
                  />
                </div>
                <div className="col-span-2">
                  <Label className="text-[11px]">Clave SAT</Label>
                  <Input
                    name={`conceptos[${idx}][clave_sat]`}
                    value={c.clave_sat}
                    onChange={(e) =>
                      actualizarConcepto(idx, "clave_sat", e.target.value)
                    }
                    placeholder="81101500"
                    className="mt-0.5 text-sm font-mono"
                  />
                </div>

                <div className="col-span-3">
                  <Label className="text-[11px]">Precio unitario *</Label>
                  <Input
                    name={`conceptos[${idx}][precio_unitario]`}
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={c.precio_unitario}
                    onChange={(e) =>
                      actualizarConcepto(idx, "precio_unitario", e.target.value)
                    }
                    required
                    className="mt-0.5 text-sm tnum"
                  />
                </div>
                <div className="col-span-2">
                  <Label className="text-[11px]">Desc. partida</Label>
                  <Input
                    name={`conceptos[${idx}][descuento]`}
                    type="number"
                    step="0.01"
                    min="0"
                    value={c.descuento}
                    onChange={(e) =>
                      actualizarConcepto(idx, "descuento", e.target.value)
                    }
                    className="mt-0.5 text-sm tnum"
                  />
                </div>
                <div className="col-span-2">
                  <Label className="text-[11px]">IVA %</Label>
                  <select
                    name={`conceptos[${idx}][iva_tasa]`}
                    value={c.iva_tasa}
                    onChange={(e) =>
                      actualizarConcepto(idx, "iva_tasa", e.target.value)
                    }
                    className="mt-0.5 h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                  >
                    <option value="0.16">16%</option>
                    <option value="0.08">8%</option>
                    <option value="0">0% (exento)</option>
                  </select>
                </div>
                <div className="col-span-5">
                  <Label className="text-[11px]">Importe (cant. × p.u.)</Label>
                  <p className="mt-1 font-mono text-sm tnum">
                    {fmtMxn.format(
                      (Number(c.cantidad) || 0) *
                        (Number(c.precio_unitario) || 0),
                    )}
                  </p>
                </div>

                <div className="col-span-12">
                  <Label className="text-[11px]">Observaciones</Label>
                  <Input
                    name={`conceptos[${idx}][observaciones]`}
                    value={c.observaciones}
                    onChange={(e) =>
                      actualizarConcepto(idx, "observaciones", e.target.value)
                    }
                    className="mt-0.5 text-sm"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Totales y notas */}
      <section className="grid grid-cols-2 gap-5">
        <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
          <h2 className="text-base font-semibold">Notas</h2>
          <textarea
            name="notas"
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
            rows={6}
            placeholder="Observaciones adicionales para el cliente, incluye/no incluye, alcance, etc."
            className="mt-3 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
        </div>

        <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
          <h2 className="text-base font-semibold">Totales</h2>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="descuento_global" className="text-sm">
                Descuento global
              </Label>
              <Input
                id="descuento_global"
                name="descuento_global"
                type="number"
                step="0.01"
                min="0"
                value={descuentoGlobal}
                onChange={(e) => setDescuentoGlobal(e.target.value)}
                className="mt-1 tnum"
              />
            </div>
            <div>
              <Label htmlFor="retenciones" className="text-sm">
                Retenciones
              </Label>
              <Input
                id="retenciones"
                name="retenciones"
                type="number"
                step="0.01"
                min="0"
                value={retenciones}
                onChange={(e) => setRetenciones(e.target.value)}
                className="mt-1 tnum"
              />
            </div>
          </div>

          <dl className="mt-5 space-y-1.5 border-t border-border pt-4 text-sm tnum">
            <Row label="Subtotal" value={fmtMxn.format(totales.subtotal)} />
            <Row
              label="Descuentos"
              value={`- ${fmtMxn.format(totales.descuento)}`}
            />
            <Row label="IVA" value={fmtMxn.format(totales.iva)} />
            <Row
              label="Retenciones"
              value={`- ${fmtMxn.format(Number(retenciones) || 0)}`}
            />
            <div className="mt-2 flex items-baseline justify-between border-t border-border pt-2">
              <dt className="text-base font-semibold">Total</dt>
              <dd className="text-lg font-semibold">
                {fmtMxn.format(totales.total - (Number(retenciones) || 0))}
              </dd>
            </div>
          </dl>
        </div>
      </section>

      {state.error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.error}
        </div>
      )}

      <div className="flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={() => router.back()}
          className="text-sm text-ink-3 hover:text-ink-1"
        >
          Cancelar
        </button>
        <SubmitButton
          edit={Boolean(cotizacionId)}
          empresaSet={Boolean(empresaId)}
          clienteSet={Boolean(clienteId)}
        />
      </div>
    </form>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between">
      <dt className="text-ink-3">{label}</dt>
      <dd className="font-mono">{value}</dd>
    </div>
  );
}

function SubmitButton({
  edit,
  empresaSet,
  clienteSet,
}: {
  edit: boolean;
  empresaSet: boolean;
  clienteSet: boolean;
}) {
  const { pending } = useFormStatus();
  const disabled = pending || !empresaSet || !clienteSet;
  return (
    <Button type="submit" disabled={disabled}>
      {pending
        ? edit
          ? "Guardando…"
          : "Creando…"
        : edit
          ? "Guardar cambios"
          : "Crear cotización"}
    </Button>
  );
}
