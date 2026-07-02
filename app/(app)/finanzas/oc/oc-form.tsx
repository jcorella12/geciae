"use client";

import { ChevronDown, Plus, Sparkles, Trash2, Upload } from "lucide-react";
import { useMemo, useState, useTransition } from "react";
import { useFormState, useFormStatus } from "react-dom";

import { CentroSelector } from "@/components/centros/centro-selector";
import { ProveedorPicker } from "@/components/shared/proveedor-picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { CentroOpcion } from "@/lib/centros/listar";
import { calcularTotalesOC } from "@/lib/oc/schemas";
import {
  initialOCState,
  limitePagoDe,
  TASA_IVA_DEFAULT,
  TIPOS_COMPRA,
  URGENCIAS_OC,
} from "@/lib/oc/state";

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
type CuentaContable = { clave: string; descripcion: string; rubro: string };
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
  centros = [],
  centroDefaultPorEmpresa = {},
  defaultProyectoId = null,
  defaultEmpresaId,
  solicitudOrigenId = null,
  empresasPagadoras = [],
  cuentas = [],
}: {
  empresas: Empresa[];
  proveedores: Proveedor[];
  proyectos?: Proyecto[];
  centros?: CentroOpcion[];
  centroDefaultPorEmpresa?: Record<string, string | null>;
  defaultProyectoId?: string | null;
  defaultEmpresaId?: string;
  solicitudOrigenId?: string | null;
  /** Todas las empresas activas del grupo (para "quién paga"). */
  empresasPagadoras?: Empresa[];
  /** Catálogo contable (clave/descr/rubro) para clasificación de contraloría. */
  cuentas?: CuentaContable[];
}) {
  const [state, formAction] = useFormState(createOC, initialOCState);
  const [modo, setModo] = useState<"rapido" | "detallado">("rapido");

  const [empresaId, setEmpresaId] = useState<string>(defaultEmpresaId ?? "");
  const [proveedorId, setProveedorId] = useState<string>("");
  const [proyectoId, setProyectoId] = useState<string>(defaultProyectoId ?? "");

  // Modo rápido
  const [descripcionGeneral, setDescripcionGeneral] = useState("");
  const [totalDirecto, setTotalDirecto] = useState("");
  const [ivaIncluido, setIvaIncluido] = useState(true);

  // Documento adjunto (sirve para IA y como respaldo guardado)
  const [docFile, setDocFile] = useState<File | null>(null);
  const [iaMsg, setIaMsg] = useState<string | null>(null);
  const [iaErr, setIaErr] = useState<string | null>(null);
  const [leyendo, startLeer] = useTransition();

  // Modo detallado
  const [conceptos, setConceptos] = useState<ConceptoLocal[]>([nuevoConcepto()]);
  const [descuento, setDescuento] = useState("0");
  const [retenciones, setRetenciones] = useState("0");
  const [condicionesPago, setCondicionesPago] = useState("");

  // Contraloría
  const [urgencia, setUrgencia] = useState("cero");
  const [empresaPagadoraId, setEmpresaPagadoraId] = useState("");
  const [tipoCompra, setTipoCompra] = useState("");
  const [cuentaClave, setCuentaClave] = useState("");

  const proveedoresFiltrados = useMemo(
    () =>
      proveedores.filter(
        (p) => p.semaforo !== "rojo" && p.semaforo !== "negro",
      ),
    [proveedores],
  );
  const proveedorSeleccionado = useMemo(
    () => proveedores.find((p) => p.id === proveedorId) ?? null,
    [proveedores, proveedorId],
  );
  const proyectosFiltrados = useMemo(
    () => (empresaId ? proyectos.filter((p) => p.empresa_id === empresaId) : []),
    [proyectos, empresaId],
  );

  // Contraloría: límite de pago estimado y catálogo filtrado por tipo.
  const limitePreview = limitePagoDe(
    new Date().toISOString().slice(0, 10),
    urgencia,
  );
  const rubrosDeTipo =
    (TIPOS_COMPRA.find((t) => t.value === tipoCompra)?.rubros as
      | readonly string[]
      | null
      | undefined) ?? null;
  const cuentasFiltradas = useMemo(
    () =>
      rubrosDeTipo
        ? cuentas.filter((c) => rubrosDeTipo.includes(c.rubro))
        : cuentas,
    [cuentas, rubrosDeTipo],
  );
  const esInterEmpresa = Boolean(
    empresaPagadoraId && empresaId && empresaPagadoraId !== empresaId,
  );

  function aplicarCotizacion(d: CotizacionDefaults) {
    if (d.proveedor.id) setProveedorId(d.proveedor.id);
    if (d.condiciones_pago) setCondicionesPago(d.condiciones_pago);
    if (d.total_cotizacion != null) {
      setTotalDirecto(String(d.total_cotizacion));
    }
    // Resumen para la descripción general (modo rápido).
    if (d.conceptos.length > 0) {
      const resumen = d.conceptos
        .map((c) => c.descripcion)
        .join(", ")
        .slice(0, 200);
      setDescripcionGeneral((prev) => prev || resumen);
      // Si el usuario está en detallado, también precargamos la tabla.
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
  }

  function leerConIA() {
    if (!docFile) return;
    setIaErr(null);
    setIaMsg(null);
    startLeer(async () => {
      const fd = new FormData();
      fd.append("archivo", docFile);
      const res = await procesarCotizacionOC(fd);
      if (!res.ok) {
        setIaErr(res.error);
        return;
      }
      aplicarCotizacion(res.defaults);
      setIaMsg(
        `Datos leídos (confianza ${Math.round(res.meta.confidence * 100)}%). Revisa total y proveedor.`,
      );
    });
  }

  const totalesDetallado = useMemo(
    () =>
      calcularTotalesOC({
        conceptos: conceptos.map((c) => ({
          cantidad: Number(c.cantidad) || 0,
          precio_unitario: Number(c.precio_unitario) || 0,
          iva_tasa: Number(c.iva_tasa) || 0,
        })),
        descuento: Number(descuento) || 0,
        retenciones: Number(retenciones) || 0,
      }),
    [conceptos, descuento, retenciones],
  );

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

  const fieldErr = (k: string) => state.fieldErrors?.[k]?.[0];
  const totalRapidoNum = Number(totalDirecto) || 0;

  return (
    <form action={formAction} className="space-y-5">
      {solicitudOrigenId && (
        <input type="hidden" name="solicitud_origen" value={solicitudOrigenId} />
      )}
      <input type="hidden" name="modo" value={modo} />
      <input type="hidden" name="proyecto_id" value={proyectoId} />
      <input
        type="hidden"
        name="fecha_emision"
        value={new Date().toISOString().slice(0, 10)}
      />
      <input type="hidden" name="condiciones_pago" value={condicionesPago} />

      {/* 1 · Documento (cotización / factura) */}
      <section className="rounded-lg border border-border bg-card p-5 shadow-sm">
        <h2 className="text-base font-semibold">Documento (cotización o factura)</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Adjunta el PDF, foto o XML. Queda como respaldo de la OC. Si quieres,
          la IA lee el proveedor y el total por ti.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <label className="flex cursor-pointer items-center gap-2 rounded-md border border-dashed border-border bg-background px-3 py-2 text-sm hover:bg-secondary">
            <Upload className="h-4 w-4 text-muted-foreground" />
            <span className="truncate">
              {docFile ? docFile.name : "Seleccionar archivo…"}
            </span>
            <input
              type="file"
              name="documento"
              accept="image/jpeg,image/png,image/webp,application/pdf,text/xml,application/xml"
              className="hidden"
              onChange={(e) => {
                setDocFile(e.target.files?.[0] ?? null);
                setIaMsg(null);
                setIaErr(null);
              }}
            />
          </label>
          {docFile && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={leerConIA}
              disabled={leyendo}
            >
              <Sparkles className="h-4 w-4" />
              {leyendo ? "Leyendo…" : "Leer con IA"}
            </Button>
          )}
        </div>
        {iaMsg && (
          <p className="mt-2 rounded-md border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs">
            {iaMsg}
          </p>
        )}
        {iaErr && (
          <p className="mt-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-1.5 text-xs text-destructive">
            {iaErr}
          </p>
        )}
      </section>

      {/* 2 · Empresa */}
      <section className="rounded-lg border border-border bg-card p-5 shadow-sm">
        <h2 className="text-base font-semibold">Empresa solicitante</h2>
        <fieldset className="mt-3 grid grid-cols-2 gap-2">
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

      {/* 3 · Proveedor */}
      <section className="rounded-lg border border-border bg-card p-5 shadow-sm">
        <h2 className="text-base font-semibold">Proveedor</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Solo proveedores en semáforo verde o amarillo. Si no existe, créalo
          aquí mismo.
        </p>
        <div className="mt-3 space-y-2">
          <ProveedorPicker
            proveedores={proveedoresFiltrados.map((p) => ({
              id: p.id,
              razon_social: p.razon_social,
              rfc: p.rfc,
              nombre_comercial: null,
            }))}
            value={proveedorId}
            onChange={setProveedorId}
            empresaId={empresaId || null}
          />
          {proveedorSeleccionado && (
            <p className="rounded-md border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs">
              {proveedorSeleccionado.razon_social} ·{" "}
              <span className="font-mono">{proveedorSeleccionado.rfc}</span>
            </p>
          )}
          {fieldErr("proveedor_id") && (
            <p className="text-xs text-destructive">{fieldErr("proveedor_id")}</p>
          )}
        </div>
      </section>

      {/* 4 · Qué se compra + total (modo rápido) / conceptos (detallado) */}
      {modo === "rapido" ? (
        <section className="rounded-lg border border-border bg-card p-5 shadow-sm">
          <h2 className="text-base font-semibold">¿Qué se compra?</h2>
          <div className="mt-3 space-y-3">
            <div>
              <Label htmlFor="descripcion_general" className="text-sm">
                Descripción <span className="text-destructive">*</span>
              </Label>
              <Input
                id="descripcion_general"
                name="descripcion_general"
                value={descripcionGeneral}
                onChange={(e) => setDescripcionGeneral(e.target.value)}
                placeholder={
                  docFile
                    ? "Ej. Material eléctrico para obra"
                    : "Sin documento: explica qué es y por qué (ej. Renta oficina mayo)"
                }
              />
              {fieldErr("descripcion_general") && (
                <p className="mt-1 text-xs text-destructive">
                  {fieldErr("descripcion_general")}
                </p>
              )}
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor="total_directo" className="text-sm">
                  Total (MXN) <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="total_directo"
                  name="total_directo"
                  type="number"
                  min="0"
                  step="0.01"
                  value={totalDirecto}
                  onChange={(e) => setTotalDirecto(e.target.value)}
                  placeholder="0.00"
                />
                {fieldErr("total_directo") && (
                  <p className="mt-1 text-xs text-destructive">
                    {fieldErr("total_directo")}
                  </p>
                )}
              </div>
              <div className="flex items-end pb-1">
                <label className="flex cursor-pointer items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    name="iva_incluido"
                    value="true"
                    checked={ivaIncluido}
                    onChange={(e) => setIvaIncluido(e.target.checked)}
                    className="h-4 w-4"
                  />
                  El total ya incluye IVA 16%
                </label>
                {/* Cuando NO está marcado, mandamos false explícito */}
                {!ivaIncluido && (
                  <input type="hidden" name="iva_incluido" value="false" />
                )}
              </div>
            </div>
            {totalRapidoNum > 0 && (
              <p className="text-xs text-muted-foreground">
                {ivaIncluido
                  ? `Subtotal ${fmtMxn.format(
                      Math.round((totalRapidoNum / 1.16) * 100) / 100,
                    )} + IVA · Total ${fmtMxn.format(totalRapidoNum)}`
                  : `Subtotal ${fmtMxn.format(totalRapidoNum)} (sin IVA)`}
              </p>
            )}
          </div>
        </section>
      ) : (
        <ConceptosDetallado
          conceptos={conceptos}
          setConceptos={setConceptos}
          actualizarConcepto={actualizarConcepto}
          descuento={descuento}
          setDescuento={setDescuento}
          retenciones={retenciones}
          setRetenciones={setRetenciones}
          totales={totalesDetallado}
          conceptosJson={conceptosJson}
          fieldErr={fieldErr}
        />
      )}

      {/* 5 · Imputación: proyecto + centro de costo (ambos opcionales) */}
      <section className="rounded-lg border border-border bg-card p-5 shadow-sm">
        <h2 className="text-base font-semibold">¿A qué se carga?</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Si es de un proyecto, elígelo. Si no (oficina, nómina, gasto general),
          usa un centro de costo. Puedes dejar ambos vacíos si aún no aplica.
        </p>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <div>
            <Label className="text-sm">Proyecto · opcional</Label>
            {!empresaId ? (
              <p className="mt-1 text-xs text-muted-foreground">
                Selecciona empresa primero.
              </p>
            ) : proyectosFiltrados.length === 0 ? (
              <p className="mt-1 text-xs text-muted-foreground">
                Sin proyectos activos en esta empresa.
              </p>
            ) : (
              <select
                value={proyectoId}
                onChange={(e) => setProyectoId(e.target.value)}
                className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">— Sin proyecto —</option>
                {proyectosFiltrados.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.codigo} — {p.nombre}
                  </option>
                ))}
              </select>
            )}
          </div>
          <div>
            <Label className="text-sm">Centro de costo · opcional</Label>
            <div className="mt-1">
              <CentroSelector
                id="centro_id"
                label=""
                empresaId={empresaId || undefined}
                filtroTipo="costo"
                defaultValue={
                  empresaId ? centroDefaultPorEmpresa[empresaId] ?? null : null
                }
                centros={centros}
                warnVacio={false}
              />
            </div>
          </div>
        </div>
      </section>

      {/* 5.5 · Pago: urgencia + quién paga */}
      <section className="rounded-lg border border-border bg-card p-5 shadow-sm">
        <h2 className="text-base font-semibold">Pago</h2>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <div>
            <Label className="text-sm">Urgencia de pago</Label>
            <select
              name="urgencia"
              value={urgencia}
              onChange={(e) => setUrgencia(e.target.value)}
              className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              {URGENCIAS_OC.map((u) => (
                <option key={u.value} value={u.value}>
                  {u.label}
                </option>
              ))}
            </select>
            {limitePreview && (
              <p className="mt-1 text-xs text-muted-foreground">
                Límite de pago:{" "}
                <strong>
                  {new Date(`${limitePreview}T12:00:00`).toLocaleDateString(
                    "es-MX",
                    { day: "numeric", month: "long" },
                  )}
                </strong>{" "}
                (días hábiles)
              </p>
            )}
          </div>
          <div>
            <Label className="text-sm">¿Quién paga? · opcional</Label>
            <select
              name="empresa_pagadora_id"
              value={empresaPagadoraId}
              onChange={(e) => setEmpresaPagadoraId(e.target.value)}
              className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">Misma empresa solicitante</option>
              {(empresasPagadoras.length ? empresasPagadoras : empresas).map(
                (e) => (
                  <option key={e.id} value={e.id}>
                    {e.codigo} — {e.nombre_comercial ?? e.razon_social}
                  </option>
                ),
              )}
            </select>
            {esInterEmpresa && (
              <p className="mt-1 rounded-md border border-warning/40 bg-warning/10 px-2 py-1 text-xs">
                ⇄ Operación <strong>inter-empresa</strong>: paga una empresa
                distinta a la que solicita.
              </p>
            )}
          </div>
        </div>
      </section>

      {/* 5.75 · Clasificación contable (contraloría) · opcional */}
      <details className="rounded-lg border border-border bg-card shadow-sm">
        <summary className="cursor-pointer select-none px-5 py-4 text-sm font-medium text-muted-foreground hover:text-foreground">
          Clasificación contable · opcional (la puede completar contraloría)
        </summary>
        <div className="grid gap-4 px-5 pb-5 sm:grid-cols-2">
          <div>
            <Label className="text-sm">Tipo de compra</Label>
            <select
              name="tipo_compra"
              value={tipoCompra}
              onChange={(e) => {
                setTipoCompra(e.target.value);
                setCuentaClave("");
              }}
              className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">— Sin clasificar —</option>
              {TIPOS_COMPRA.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="cuenta_clave" className="text-sm">
              Cuenta contable
            </Label>
            <Input
              id="cuenta_clave"
              name="cuenta_clave"
              list="cuentas-contables-list"
              value={cuentaClave}
              onChange={(e) => setCuentaClave(e.target.value.split(" ")[0])}
              placeholder={
                cuentas.length
                  ? `Busca en ${cuentasFiltradas.length} cuentas…`
                  : "Catálogo no disponible"
              }
              disabled={cuentas.length === 0}
              className="mt-1 font-mono"
            />
            <datalist id="cuentas-contables-list">
              {cuentasFiltradas.slice(0, 500).map((c) => (
                <option key={c.clave} value={c.clave}>
                  {c.clave} · {c.descripcion} ({c.rubro})
                </option>
              ))}
            </datalist>
            {cuentaClave &&
              (() => {
                const sel = cuentas.find((c) => c.clave === cuentaClave);
                return sel ? (
                  <p className="mt-1 text-xs text-muted-foreground">
                    <span className="font-mono">{sel.clave}</span> ·{" "}
                    {sel.descripcion}{" "}
                    <span className="text-ink-4">({sel.rubro})</span>
                  </p>
                ) : (
                  <p className="mt-1 text-xs text-amber-700">
                    Clave no encontrada en el catálogo — se guardará la OC sin
                    cuenta.
                  </p>
                );
              })()}
          </div>
        </div>
      </details>

      {/* 6 · Comentarios */}
      <section className="rounded-lg border border-border bg-card p-5 shadow-sm">
        <Label htmlFor="comentarios" className="text-sm">
          Comentarios · opcional
        </Label>
        <textarea
          id="comentarios"
          name="comentarios"
          rows={2}
          maxLength={2000}
          className="mt-2 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </section>

      {/* Toggle modo */}
      <button
        type="button"
        onClick={() => setModo((m) => (m === "rapido" ? "detallado" : "rapido"))}
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
      >
        <ChevronDown
          className={`h-3.5 w-3.5 transition-transform ${
            modo === "detallado" ? "rotate-180" : ""
          }`}
        />
        {modo === "rapido"
          ? "Desglosar por concepto (para recepción ítem por ítem)"
          : "Volver a modo rápido (un solo total)"}
      </button>

      {state.error && (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.error}
        </p>
      )}

      <SubmitButton />
    </form>
  );
}

function ConceptosDetallado({
  conceptos,
  setConceptos,
  actualizarConcepto,
  descuento,
  setDescuento,
  retenciones,
  setRetenciones,
  totales,
  conceptosJson,
  fieldErr,
}: {
  conceptos: ConceptoLocal[];
  setConceptos: React.Dispatch<React.SetStateAction<ConceptoLocal[]>>;
  actualizarConcepto: <K extends keyof ConceptoLocal>(
    idx: number,
    key: K,
    value: ConceptoLocal[K],
  ) => void;
  descuento: string;
  setDescuento: (v: string) => void;
  retenciones: string;
  setRetenciones: (v: string) => void;
  totales: ReturnType<typeof calcularTotalesOC>;
  conceptosJson: string;
  fieldErr: (k: string) => string | undefined;
}) {
  return (
    <section className="rounded-lg border border-border bg-card p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold">Conceptos</h2>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setConceptos((prev) => [...prev, nuevoConcepto()])}
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
                  Importe
                  <br />
                  <span className="text-sm font-medium text-foreground">
                    {fmtMxn.format(importe)}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setConceptos((prev) =>
                      prev.length > 1 ? prev.filter((_, j) => j !== i) : prev,
                    )
                  }
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

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="descuento" className="text-sm">
            Descuento (MXN)
          </Label>
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
        <div>
          <Label htmlFor="retenciones" className="text-sm">
            Retenciones (MXN)
          </Label>
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

      <dl className="mt-5 space-y-1 text-sm">
        <Row k="Subtotal" v={fmtMxn.format(totales.subtotal)} />
        <Row k="IVA" v={fmtMxn.format(totales.iva)} />
        <div className="my-1.5 border-t border-border" />
        <Row
          k={<strong>Total</strong>}
          v={<strong>{fmtMxn.format(totales.total)}</strong>}
        />
      </dl>
    </section>
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
