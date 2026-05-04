"use client";

import { Plus, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";

import { DocumentExtractor } from "@/components/shared/document-extractor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { calcularTotalesOC } from "@/lib/oc/schemas";
import { initialOCState, TASA_IVA_DEFAULT } from "@/lib/oc/state";

import { createOC } from "./actions";
import {
  procesarCotizacionOC,
  type CotizacionDefaults,
} from "./nueva/ia-actions";

const empresaCodigoColor: Record<string, string> = {
  PSE: "bg-pse",
  CIAE: "bg-ciae",
  IED: "bg-ied",
  LIMSON: "bg-limson",
};

const semaforoBadge: Record<string, string> = {
  verde: "bg-success/15 text-success",
  amarillo: "bg-warning/15 text-foreground",
  rojo: "bg-destructive/15 text-destructive",
  negro: "bg-foreground/10 text-foreground",
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

type Proveedor = {
  id: string;
  razon_social: string;
  rfc: string;
  semaforo: string | null;
};

type Proyecto = {
  id: string;
  codigo: string;
  nombre: string;
  empresa_id: string;
  estado: string | null;
};

type ConceptoLocal = {
  key: string;
  descripcion: string;
  cantidad: string;
  unidad_sat: string;
  precio_unitario: string;
  iva_tasa: string;
  clave_sat: string;
};

function nuevoConcepto(): ConceptoLocal {
  return {
    key: crypto.randomUUID(),
    descripcion: "",
    cantidad: "1",
    unidad_sat: "",
    precio_unitario: "",
    iva_tasa: String(TASA_IVA_DEFAULT),
    clave_sat: "",
  };
}

export function OCForm({
  empresas,
  proveedores,
  proyectos = [],
  defaultProyectoId = null,
  defaultEmpresaId,
  solicitudOrigenId = null,
}: {
  empresas: Empresa[];
  proveedores: Proveedor[];
  proyectos?: Proyecto[];
  defaultProyectoId?: string | null;
  defaultEmpresaId?: string;
  /** Si la OC se crea desde una solicitud, su ID — se vincula post-creación. */
  solicitudOrigenId?: string | null;
}) {
  const [state, formAction] = useFormState(createOC, initialOCState);
  const [conceptos, setConceptos] = useState<ConceptoLocal[]>([
    nuevoConcepto(),
  ]);
  const [empresaId, setEmpresaId] = useState<string>(defaultEmpresaId ?? "");
  const [proveedorId, setProveedorId] = useState<string>("");
  const [proyectoId, setProyectoId] = useState<string>(defaultProyectoId ?? "");
  const [descuento, setDescuento] = useState("0");
  const [retenciones, setRetenciones] = useState("0");
  const [busquedaProv, setBusquedaProv] = useState("");
  const [condicionesPago, setCondicionesPago] = useState("");
  const [cotizacionInfo, setCotizacionInfo] =
    useState<CotizacionDefaults | null>(null);

  function aplicarCotizacion(d: CotizacionDefaults) {
    setCotizacionInfo(d);
    if (d.proveedor.id) {
      setProveedorId(d.proveedor.id);
    }
    if (d.conceptos.length > 0) {
      setConceptos(
        d.conceptos.map((c) => ({
          key: crypto.randomUUID(),
          descripcion: c.descripcion,
          cantidad: String(c.cantidad),
          unidad_sat: c.unidad_sat ?? "",
          precio_unitario: String(c.precio_unitario),
          iva_tasa: String(c.iva_tasa),
          clave_sat: "",
        })),
      );
    }
    if (d.condiciones_pago) {
      setCondicionesPago(d.condiciones_pago);
    }
  }

  const proyectosFiltrados = useMemo(
    () => (empresaId ? proyectos.filter((p) => p.empresa_id === empresaId) : []),
    [proyectos, empresaId],
  );

  useEffect(() => {
    if (proyectoId && empresaId) {
      const aun = proyectosFiltrados.some((p) => p.id === proyectoId);
      if (!aun) setProyectoId("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [empresaId]);

  const proveedoresFiltrados = useMemo(() => {
    const q = busquedaProv.trim().toLowerCase();
    return proveedores
      .filter((p) => p.semaforo !== "rojo" && p.semaforo !== "negro")
      .filter((p) =>
        q
          ? p.razon_social.toLowerCase().includes(q) ||
            p.rfc.toLowerCase().includes(q)
          : true,
      );
  }, [proveedores, busquedaProv]);

  const proveedorSeleccionado = useMemo(
    () => proveedores.find((p) => p.id === proveedorId) ?? null,
    [proveedores, proveedorId],
  );

  const totales = useMemo(() => {
    return calcularTotalesOC({
      conceptos: conceptos.map((c) => ({
        cantidad: Number(c.cantidad) || 0,
        precio_unitario: Number(c.precio_unitario) || 0,
        iva_tasa: Number(c.iva_tasa) || 0,
      })),
      descuento: Number(descuento) || 0,
      retenciones: Number(retenciones) || 0,
    });
  }, [conceptos, descuento, retenciones]);

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

  // Serializar conceptos a JSON para el form post.
  const conceptosJson = JSON.stringify(
    conceptos.map((c) => ({
      descripcion: c.descripcion,
      cantidad: Number(c.cantidad) || 0,
      unidad_sat: c.unidad_sat,
      precio_unitario: Number(c.precio_unitario) || 0,
      iva_tasa: Number(c.iva_tasa) || 0,
      clave_sat: c.clave_sat,
    })),
  );

  if (empresas.length === 0) {
    return (
      <div className="rounded-lg border border-warning/40 bg-warning/10 p-4 text-sm">
        <p className="font-medium">No tienes empresas donde puedas crear OC.</p>
        <p className="mt-1 text-muted-foreground">
          Necesitas rol CEO, Director u Operativo en la empresa solicitante.
        </p>
      </div>
    );
  }

  if (proveedores.length === 0) {
    return (
      <div className="rounded-lg border border-warning/40 bg-warning/10 p-4 text-sm">
        <p className="font-medium">Sin proveedores registrados.</p>
        <p className="mt-1 text-muted-foreground">
          Da de alta proveedores en{" "}
          <a className="underline" href="/finanzas/proveedores">
            /finanzas/proveedores
          </a>{" "}
          antes de crear OC.
        </p>
      </div>
    );
  }

  const fieldErr = (k: string) => state.fieldErrors?.[k]?.[0];

  return (
    <form action={formAction} className="space-y-6">
      {/* Solicitud de origen (si la OC se crea desde una solicitud aprobada) */}
      {solicitudOrigenId && (
        <input
          type="hidden"
          name="solicitud_origen"
          value={solicitudOrigenId}
        />
      )}
      {/* IA: cargar cotización */}
      <DocumentExtractor
        accept="image/jpeg,image/png,image/webp,application/pdf"
        label="¿Tienes la cotización del proveedor?"
        description="Súbela y la IA llena los conceptos, busca el proveedor por RFC y precarga condiciones de pago. Acepta cotizaciones, presupuestos o facturas en PDF/imagen."
        onProcess={procesarCotizacionOC}
        onExtracted={aplicarCotizacion}
      />

      {cotizacionInfo && (
        <div className="rounded-md border border-info/30 bg-info/5 px-3 py-2 text-xs">
          <p className="font-medium">Cotización cargada</p>
          <ul className="mt-1 space-y-0.5 text-muted-foreground">
            {cotizacionInfo.proveedor.rfc && (
              <li>
                Proveedor:{" "}
                {cotizacionInfo.proveedor.razon_social ?? "(sin nombre)"} ·{" "}
                <code className="font-mono">{cotizacionInfo.proveedor.rfc}</code>
                {cotizacionInfo.proveedor.id ? (
                  <span className="ml-1 text-success">✓ encontrado en catálogo</span>
                ) : cotizacionInfo.proveedor.no_encontrado ? (
                  <span className="ml-1 text-warning-foreground">
                    ⚠ no está en catálogo —{" "}
                    <a
                      href="/finanzas/proveedores/nuevo"
                      target="_blank"
                      rel="noopener"
                      className="underline"
                    >
                      crear proveedor
                    </a>
                  </span>
                ) : null}
              </li>
            )}
            <li>{cotizacionInfo.conceptos.length} concepto(s) extraído(s)</li>
            {cotizacionInfo.total_cotizacion != null && (
              <li>
                Total cotización: {fmtMxn.format(cotizacionInfo.total_cotizacion)}{" "}
                <span className="text-muted-foreground/80">
                  (verifica que coincida con el total del form abajo)
                </span>
              </li>
            )}
          </ul>
        </div>
      )}

      {/* Empresa solicitante */}
      <section className="rounded-lg border border-border bg-card p-5 shadow-sm">
        <h2 className="text-base font-semibold">Empresa solicitante</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Empresa del grupo que paga la OC.
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
                className="h-4 w-4"
              />
              <span
                className={`inline-block h-2 w-2 rounded-full ${
                  empresaCodigoColor[e.codigo] ?? "bg-muted-foreground"
                }`}
              />
              <span className="truncate">
                {e.nombre_comercial ?? e.razon_social}
              </span>
            </label>
          ))}
        </fieldset>
        {fieldErr("empresa_id") && (
          <p className="mt-2 text-xs text-destructive">{fieldErr("empresa_id")}</p>
        )}
      </section>

      {/* Proyecto */}
      <section className="rounded-lg border border-border bg-card p-5 shadow-sm">
        <h2 className="text-base font-semibold">
          Proyecto{" "}
          <span className="text-sm font-normal text-muted-foreground">
            (opcional)
          </span>
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Asocia esta OC a un proyecto activo de la empresa para contabilizar
          el costo en su presupuesto.
        </p>
        <input type="hidden" name="proyecto_id" value={proyectoId} />
        <div className="mt-3">
          {!empresaId ? (
            <p className="text-sm text-muted-foreground">
              Selecciona empresa primero.
            </p>
          ) : proyectosFiltrados.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Sin proyectos activos en esta empresa.{" "}
              <a className="underline" href="/proyectos/nuevo">
                Crear uno
              </a>
              .
            </p>
          ) : (
            <select
              value={proyectoId}
              onChange={(e) => setProyectoId(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">Sin proyecto (gasto general)</option>
              {proyectosFiltrados.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.codigo} — {p.nombre}
                </option>
              ))}
            </select>
          )}
        </div>
      </section>

      {/* Proveedor */}
      <section className="rounded-lg border border-border bg-card p-5 shadow-sm">
        <h2 className="text-base font-semibold">Proveedor</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Solo se listan proveedores activos en semáforo verde o amarillo. Los
          rojos/negros bloquean la creación de OC.
        </p>

        <input type="hidden" name="proveedor_id" value={proveedorId} />

        <div className="mt-4 space-y-2">
          <Input
            type="search"
            placeholder="Buscar por razón social o RFC…"
            value={busquedaProv}
            onChange={(e) => setBusquedaProv(e.target.value)}
          />
          <div className="max-h-48 overflow-y-auto rounded-md border border-border">
            {proveedoresFiltrados.length === 0 ? (
              <p className="px-3 py-4 text-center text-sm text-muted-foreground">
                Sin resultados.
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {proveedoresFiltrados.map((p) => (
                  <li key={p.id}>
                    <button
                      type="button"
                      onClick={() => setProveedorId(p.id)}
                      className={`flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm transition-colors ${
                        proveedorId === p.id
                          ? "bg-primary/10"
                          : "hover:bg-secondary/50"
                      }`}
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block font-medium">
                          {p.razon_social}
                        </span>
                        <span className="block font-mono text-xs text-muted-foreground">
                          {p.rfc}
                        </span>
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs ${
                          semaforoBadge[p.semaforo ?? "verde"] ?? "bg-secondary"
                        }`}
                      >
                        {p.semaforo ?? "verde"}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          {proveedorSeleccionado && (
            <p className="rounded-md border border-primary/30 bg-primary/10 px-3 py-2 text-xs">
              Seleccionado: <strong>{proveedorSeleccionado.razon_social}</strong>{" "}
              · {proveedorSeleccionado.rfc}
              {proveedorSeleccionado.semaforo === "amarillo" && (
                <span className="ml-2 text-warning-foreground">
                  ⚠ Documentación próxima a vencer.
                </span>
              )}
            </p>
          )}
          {fieldErr("proveedor_id") && (
            <p className="text-xs text-destructive">{fieldErr("proveedor_id")}</p>
          )}
        </div>
      </section>

      {/* Datos generales */}
      <section className="rounded-lg border border-border bg-card p-5 shadow-sm">
        <h2 className="text-base font-semibold">Datos generales</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor="fecha_emision">Fecha de emisión</Label>
            <Input
              id="fecha_emision"
              name="fecha_emision"
              type="date"
              required
              defaultValue={new Date().toISOString().slice(0, 10)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="fecha_entrega_esperada">Fecha entrega esperada</Label>
            <Input
              id="fecha_entrega_esperada"
              name="fecha_entrega_esperada"
              type="date"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="condiciones_pago">Condiciones de pago</Label>
            <Input
              id="condiciones_pago"
              name="condiciones_pago"
              placeholder="30 días"
              value={condicionesPago}
              onChange={(e) => setCondicionesPago(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="forma_pago">Forma de pago</Label>
            <Input
              id="forma_pago"
              name="forma_pago"
              placeholder="Transferencia"
            />
          </div>
        </div>
      </section>

      {/* Conceptos */}
      <section className="rounded-lg border border-border bg-card p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">Conceptos</h2>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              setConceptos((prev) => [...prev, nuevoConcepto()])
            }
          >
            <Plus className="h-4 w-4" /> Agregar
          </Button>
        </div>

        <input type="hidden" name="conceptos" value={conceptosJson} />

        <div className="mt-4 space-y-3">
          {conceptos.map((c, i) => {
            const importe =
              (Number(c.cantidad) || 0) * (Number(c.precio_unitario) || 0);
            return (
              <div
                key={c.key}
                className="grid gap-2 rounded-md border border-border bg-background p-3 sm:grid-cols-12"
              >
                <div className="sm:col-span-5">
                  <Label className="text-xs">
                    Descripción <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    value={c.descripcion}
                    onChange={(e) =>
                      actualizarConcepto(i, "descripcion", e.target.value)
                    }
                    placeholder="Servicio o material"
                    required
                  />
                </div>
                <div className="sm:col-span-1">
                  <Label className="text-xs">Cant.</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={c.cantidad}
                    onChange={(e) =>
                      actualizarConcepto(i, "cantidad", e.target.value)
                    }
                    required
                  />
                </div>
                <div className="sm:col-span-1">
                  <Label className="text-xs">Unidad</Label>
                  <Input
                    value={c.unidad_sat}
                    onChange={(e) =>
                      actualizarConcepto(i, "unidad_sat", e.target.value)
                    }
                    placeholder="PZA"
                  />
                </div>
                <div className="sm:col-span-2">
                  <Label className="text-xs">Precio unit.</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={c.precio_unitario}
                    onChange={(e) =>
                      actualizarConcepto(i, "precio_unitario", e.target.value)
                    }
                    required
                  />
                </div>
                <div className="sm:col-span-1">
                  <Label className="text-xs">IVA</Label>
                  <Input
                    type="number"
                    min="0"
                    max="1"
                    step="0.01"
                    value={c.iva_tasa}
                    onChange={(e) =>
                      actualizarConcepto(i, "iva_tasa", e.target.value)
                    }
                  />
                </div>
                <div className="flex items-end justify-between sm:col-span-2">
                  <span className="text-xs text-muted-foreground">
                    Importe<br />
                    <span className="text-sm font-medium text-foreground">
                      {fmtMxn.format(importe)}
                    </span>
                  </span>
                  <button
                    type="button"
                    onClick={() => eliminarConcepto(i)}
                    disabled={conceptos.length === 1}
                    className="rounded-md p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive disabled:opacity-30"
                    aria-label="Eliminar concepto"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
        {fieldErr("conceptos") && (
          <p className="mt-2 text-xs text-destructive">{fieldErr("conceptos")}</p>
        )}
      </section>

      {/* Ajustes y totales */}
      <section className="rounded-lg border border-border bg-card p-5 shadow-sm">
        <h2 className="text-base font-semibold">Ajustes y totales</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor="descuento">Descuento (MXN)</Label>
            <Input
              id="descuento"
              name="descuento"
              type="number"
              min="0"
              step="0.01"
              value={descuento}
              onChange={(e) => setDescuento(e.target.value)}
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

        <dl className="mt-6 space-y-1.5 text-sm">
          <Row k="Subtotal" v={fmtMxn.format(totales.subtotal)} />
          <Row k="Descuento" v={`- ${fmtMxn.format(totales.descuento)}`} />
          <Row k="IVA" v={fmtMxn.format(totales.iva)} />
          <Row k="Retenciones" v={`- ${fmtMxn.format(totales.retenciones)}`} />
          <div className="my-2 border-t border-border" />
          <Row
            k={<strong>Total</strong>}
            v={
              <strong className="text-base">
                {fmtMxn.format(totales.total)}
              </strong>
            }
          />
        </dl>
      </section>

      <section className="rounded-lg border border-border bg-card p-5 shadow-sm">
        <Label htmlFor="comentarios">Comentarios / observaciones</Label>
        <textarea
          id="comentarios"
          name="comentarios"
          rows={3}
          maxLength={2000}
          className="mt-2 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </section>

      {state.error && (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.error}
        </p>
      )}

      <SubmitButton />
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

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Creando OC…" : "Crear OC en borrador"}
    </Button>
  );
}
