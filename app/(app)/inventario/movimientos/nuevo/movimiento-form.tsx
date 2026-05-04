"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ENTRADAS,
  ETIQUETA_TIPO_MOV,
  initialMovimientoState,
  SALIDAS,
  type TipoMovimiento,
} from "@/lib/inventario/state";

import { registrarMovimiento } from "../../actions";

type Empresa = { id: string; codigo: string; nombre_comercial: string | null };
type Item = {
  id: string;
  codigo: string;
  nombre: string;
  unidad_medida: string | null;
  costo_promedio: number | null;
  empresa_id: string | null;
};
type Almacen = {
  id: string;
  codigo: string;
  nombre: string;
  empresa_id: string;
};
type Proyecto = {
  id: string;
  codigo: string;
  nombre: string;
  empresa_id: string;
};
type Proveedor = { id: string; razon_social: string; rfc: string };

type Defaults = {
  producto_id?: string;
  proyecto_id?: string;
  tipo?: string;
};

export function MovimientoForm({
  empresas,
  items,
  almacenes,
  proyectos,
  proveedores,
  defaults,
}: {
  empresas: Empresa[];
  items: Item[];
  almacenes: Almacen[];
  proyectos: Proyecto[];
  proveedores: Proveedor[];
  defaults?: Defaults;
}) {
  const router = useRouter();
  const [state, formAction] = useFormState(
    registrarMovimiento,
    initialMovimientoState,
  );

  const [tipo, setTipo] = useState<TipoMovimiento>(
    (defaults?.tipo as TipoMovimiento) ?? "entrada_compra",
  );
  const [empresaId, setEmpresaId] = useState("");
  const [productoId, setProductoId] = useState(defaults?.producto_id ?? "");
  const [proyectoId, setProyectoId] = useState(defaults?.proyecto_id ?? "");
  const [busquedaItem, setBusquedaItem] = useState("");

  // Si vienen defaults con producto, inferir empresa
  useEffect(() => {
    if (defaults?.producto_id && !empresaId) {
      const it = items.find((i) => i.id === defaults.producto_id);
      if (it?.empresa_id) setEmpresaId(it.empresa_id);
    }
  }, [defaults?.producto_id, empresaId, items]);

  const itemsFiltrados = useMemo(() => {
    let arr = items;
    if (empresaId) arr = arr.filter((i) => i.empresa_id === empresaId);
    const q = busquedaItem.trim().toLowerCase();
    if (q) {
      arr = arr.filter(
        (i) =>
          i.codigo.toLowerCase().includes(q) ||
          i.nombre.toLowerCase().includes(q),
      );
    }
    return arr.slice(0, 30);
  }, [items, empresaId, busquedaItem]);

  const itemSeleccionado = items.find((i) => i.id === productoId);
  const almacenesEmpresa = almacenes.filter(
    (a) => !empresaId || a.empresa_id === empresaId,
  );
  const proyectosEmpresa = proyectos.filter(
    (p) => !empresaId || p.empresa_id === empresaId,
  );

  const esEntrada = ENTRADAS.includes(tipo);
  const esSalida = SALIDAS.includes(tipo);
  const esTraspaso = tipo === "traspaso_salida";

  return (
    <form action={formAction} className="space-y-5">
      {/* Tipo de movimiento */}
      <section className="rounded-lg border border-border bg-card p-5 shadow-sm">
        <h2 className="text-base font-semibold">Tipo de movimiento</h2>
        <input type="hidden" name="tipo" value={tipo} />
        <div className="mt-3 grid grid-cols-2 gap-2">
          {[...ENTRADAS, ...SALIDAS]
            .filter((t) => t !== "traspaso_entrada")
            .map((t) => (
              <button
                type="button"
                key={t}
                onClick={() => setTipo(t)}
                className={`rounded-md border px-3 py-2 text-left text-[12.5px] transition ${
                  tipo === t
                    ? "border-brand bg-brand-soft text-brand-deep"
                    : "border-border bg-card hover:bg-bg-2"
                }`}
              >
                <span className="block font-medium">
                  {ETIQUETA_TIPO_MOV[t]}
                </span>
              </button>
            ))}
        </div>
      </section>

      <section className="rounded-lg border border-border bg-card p-5 shadow-sm">
        <h2 className="text-base font-semibold">Producto y almacén</h2>
        <div className="mt-4 grid grid-cols-12 gap-3">
          <div className="col-span-12 md:col-span-6">
            <Label htmlFor="empresa_id" className="text-sm">
              Empresa *
            </Label>
            <select
              id="empresa_id"
              name="empresa_id"
              required
              value={empresaId}
              onChange={(e) => {
                setEmpresaId(e.target.value);
                setProductoId("");
              }}
              className="mt-1 h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">— Selecciona —</option>
              {empresas.map((em) => (
                <option key={em.id} value={em.id}>
                  {em.codigo} · {em.nombre_comercial}
                </option>
              ))}
            </select>
          </div>
          <div className="col-span-12 md:col-span-6">
            <Label htmlFor="almacen_id" className="text-sm">
              Almacén *
            </Label>
            <select
              id="almacen_id"
              name="almacen_id"
              required
              defaultValue=""
              className="mt-1 h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">— Selecciona —</option>
              {almacenesEmpresa.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.codigo} · {a.nombre}
                </option>
              ))}
            </select>
          </div>

          <input
            type="hidden"
            name="producto_id"
            value={productoId}
            required
          />
          <div className="col-span-12">
            <Label className="text-sm">Producto *</Label>
            <Input
              type="text"
              placeholder="Buscar por SKU o nombre…"
              value={busquedaItem}
              onChange={(e) => setBusquedaItem(e.target.value)}
              className="mt-1 text-sm"
            />
            <div className="mt-1 max-h-40 overflow-y-auto rounded-md border border-border bg-background">
              {itemsFiltrados.map((it) => (
                <button
                  key={it.id}
                  type="button"
                  onClick={() => setProductoId(it.id)}
                  className={`flex w-full items-center justify-between gap-2 border-b border-border/60 px-3 py-1.5 text-left text-sm last:border-b-0 hover:bg-secondary/40 ${productoId === it.id ? "bg-secondary/60" : ""}`}
                >
                  <span className="flex-1 truncate">{it.nombre}</span>
                  <code className="font-mono text-[10.5px] text-ink-3">
                    {it.codigo}
                  </code>
                  {productoId === it.id && (
                    <span className="text-[10px] font-semibold text-brand">
                      ✓
                    </span>
                  )}
                </button>
              ))}
              {itemsFiltrados.length === 0 && (
                <p className="px-3 py-3 text-xs text-ink-3">
                  Sin items. Crea uno desde Inventario.
                </p>
              )}
            </div>
            {itemSeleccionado && (
              <p className="mt-1 text-xs text-ink-3">
                Seleccionado:{" "}
                <strong>{itemSeleccionado.nombre}</strong>
                {itemSeleccionado.costo_promedio
                  ? ` · costo prom: $${Number(itemSeleccionado.costo_promedio).toFixed(2)}`
                  : ""}
              </p>
            )}
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-border bg-card p-5 shadow-sm">
        <h2 className="text-base font-semibold">Cantidad y costo</h2>
        <div className="mt-4 grid grid-cols-12 gap-3">
          <div className="col-span-6 md:col-span-3">
            <Label htmlFor="fecha" className="text-sm">
              Fecha *
            </Label>
            <Input
              id="fecha"
              name="fecha"
              type="date"
              required
              defaultValue={new Date().toISOString().slice(0, 10)}
              className="mt-1"
            />
          </div>
          <div className="col-span-6 md:col-span-3">
            <Label htmlFor="cantidad" className="text-sm">
              Cantidad *{" "}
              <span className="text-[10.5px] text-ink-3">
                ({itemSeleccionado?.unidad_medida ?? "—"})
              </span>
            </Label>
            <Input
              id="cantidad"
              name="cantidad"
              type="number"
              step="0.01"
              min="0.01"
              required
              className="mt-1 tnum"
            />
          </div>
          {esEntrada && (
            <div className="col-span-12 md:col-span-6">
              <Label htmlFor="costo_unitario" className="text-sm">
                Costo unitario {tipo === "entrada_compra" ? "*" : ""}
              </Label>
              <Input
                id="costo_unitario"
                name="costo_unitario"
                type="number"
                step="0.01"
                min="0"
                placeholder="MXN por unidad"
                className="mt-1 tnum"
              />
              <p className="mt-1 text-[10.5px] text-ink-3">
                El costo promedio del producto se actualizará automáticamente
                con esta entrada (promedio ponderado).
              </p>
            </div>
          )}
          {esSalida && (
            <div className="col-span-12">
              <p className="text-[11px] text-ink-3">
                ℹ️ El costo unitario de la salida se asigna automáticamente al
                costo promedio actual del producto.
              </p>
            </div>
          )}
          <div className="col-span-12">
            <Label htmlFor="numero_documento" className="text-sm">
              Número de documento (factura, OC, etc.)
            </Label>
            <Input
              id="numero_documento"
              name="numero_documento"
              placeholder="Folio interno o referencia externa"
              className="mt-1 font-mono text-sm"
            />
          </div>
        </div>
      </section>

      {/* Vínculos: proyecto / proveedor */}
      <section className="rounded-lg border border-border bg-card p-5 shadow-sm">
        <h2 className="text-base font-semibold">Vínculos</h2>
        <div className="mt-4 grid grid-cols-12 gap-3">
          {(tipo === "salida_proyecto" || tipo === "salida_obra") && (
            <div className="col-span-12">
              <Label htmlFor="proyecto_id" className="text-sm">
                Proyecto destino *
              </Label>
              <select
                id="proyecto_id"
                name="proyecto_id"
                required
                value={proyectoId}
                onChange={(e) => setProyectoId(e.target.value)}
                className="mt-1 h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">— Selecciona proyecto —</option>
                {proyectosEmpresa.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.codigo} · {p.nombre}
                  </option>
                ))}
              </select>
            </div>
          )}
          {tipo === "entrada_compra" && (
            <div className="col-span-12">
              <Label htmlFor="proveedor_id" className="text-sm">
                Proveedor (opcional)
              </Label>
              <select
                id="proveedor_id"
                name="proveedor_id"
                defaultValue=""
                className="mt-1 h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">— Sin especificar —</option>
                {proveedores.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.razon_social} · {p.rfc}
                  </option>
                ))}
              </select>
            </div>
          )}
          {esTraspaso && (
            <div className="col-span-12">
              <Label htmlFor="almacen_destino_id" className="text-sm">
                Almacén destino *
              </Label>
              <select
                id="almacen_destino_id"
                name="almacen_destino_id"
                required={esTraspaso}
                defaultValue=""
                className="mt-1 h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">— Selecciona —</option>
                {almacenesEmpresa.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.codigo} · {a.nombre}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="col-span-12">
            <Label htmlFor="observaciones" className="text-sm">
              Observaciones
            </Label>
            <textarea
              id="observaciones"
              name="observaciones"
              rows={2}
              placeholder="Notas adicionales del movimiento"
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </div>
        </div>
      </section>

      {state.error && (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.error}
        </p>
      )}
      {state.ok && (
        <p className="rounded-md border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          ✓ Movimiento registrado.{" "}
          <button
            type="button"
            className="underline"
            onClick={() => router.push("/inventario")}
          >
            Volver al inventario →
          </button>
        </p>
      )}

      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
        >
          Cancelar
        </Button>
        <SubmitBtn />
      </div>
    </form>
  );
}

function SubmitBtn() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Registrando…" : "Registrar movimiento"}
    </Button>
  );
}
