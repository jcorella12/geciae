"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ETIQUETA_CATEGORIA_INV,
  ICONO_CATEGORIA_INV,
  initialItemState,
  UNIDADES_MEDIDA,
  type CategoriaInventario,
} from "@/lib/inventario/state";

import { crearItemInventario } from "../actions";

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
  nombre_comercial: string | null;
};

const CATEGORIAS = Object.keys(
  ETIQUETA_CATEGORIA_INV,
) as CategoriaInventario[];

export function ItemForm({
  empresas,
  proveedores,
}: {
  empresas: Empresa[];
  proveedores: Proveedor[];
}) {
  const [state, formAction] = useFormState(
    crearItemInventario,
    initialItemState,
  );
  const [categoria, setCategoria] = useState<CategoriaInventario>("panel_solar");

  return (
    <form action={formAction} className="space-y-5">
      <section className="rounded-lg border border-border bg-card p-5 shadow-sm">
        <h2 className="text-base font-semibold">Identificación</h2>
        <div className="mt-4 grid grid-cols-12 gap-3">
          <div className="col-span-12 md:col-span-6">
            <Label htmlFor="empresa_id" className="text-sm">
              Empresa *
            </Label>
            <select
              id="empresa_id"
              name="empresa_id"
              required
              defaultValue=""
              className="mt-1 h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">— Selecciona —</option>
              {empresas.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.codigo} · {e.nombre_comercial ?? e.razon_social}
                </option>
              ))}
            </select>
          </div>
          <div className="col-span-12 md:col-span-6">
            <Label htmlFor="codigo" className="text-sm">
              SKU / Código *
            </Label>
            <Input
              id="codigo"
              name="codigo"
              required
              placeholder="PSE-PAN-580"
              className="mt-1 font-mono uppercase"
            />
          </div>
          <div className="col-span-12">
            <Label htmlFor="nombre" className="text-sm">
              Nombre *
            </Label>
            <Input
              id="nombre"
              name="nombre"
              required
              placeholder="Panel solar bifacial 580W"
              className="mt-1"
            />
          </div>
          <div className="col-span-12">
            <Label htmlFor="descripcion" className="text-sm">
              Descripción
            </Label>
            <textarea
              id="descripcion"
              name="descripcion"
              rows={2}
              placeholder="Detalle técnico, certificaciones, etc."
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </div>
          <div className="col-span-6 md:col-span-4">
            <Label htmlFor="categoria" className="text-sm">
              Categoría *
            </Label>
            <select
              id="categoria"
              name="categoria"
              value={categoria}
              onChange={(e) =>
                setCategoria(e.target.value as CategoriaInventario)
              }
              className="mt-1 h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              {CATEGORIAS.map((c) => (
                <option key={c} value={c}>
                  {ICONO_CATEGORIA_INV[c]} {ETIQUETA_CATEGORIA_INV[c]}
                </option>
              ))}
            </select>
          </div>
          <div className="col-span-6 md:col-span-4">
            <Label htmlFor="marca" className="text-sm">
              Marca
            </Label>
            <Input
              id="marca"
              name="marca"
              placeholder="Trina, JA Solar…"
              className="mt-1"
            />
          </div>
          <div className="col-span-12 md:col-span-4">
            <Label htmlFor="modelo" className="text-sm">
              Modelo
            </Label>
            <Input
              id="modelo"
              name="modelo"
              placeholder="TSM-580NEG19RC.20"
              className="mt-1"
            />
          </div>
          <div className="col-span-6 md:col-span-4">
            <Label htmlFor="unidad_medida" className="text-sm">
              Unidad medida *
            </Label>
            <select
              id="unidad_medida"
              name="unidad_medida"
              required
              defaultValue="pieza"
              className="mt-1 h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              {UNIDADES_MEDIDA.map((u) => (
                <option key={u.value} value={u.value}>
                  {u.label}
                </option>
              ))}
            </select>
          </div>
          <div className="col-span-12 md:col-span-8">
            <Label htmlFor="subcategoria" className="text-sm">
              Subcategoría / etiqueta libre
            </Label>
            <Input
              id="subcategoria"
              name="subcategoria"
              placeholder="bifacial, monofásico, MC4, etc."
              className="mt-1"
            />
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-border bg-card p-5 shadow-sm">
        <h2 className="text-base font-semibold">Stock y valoración</h2>
        <div className="mt-4 grid grid-cols-12 gap-3">
          <div className="col-span-6 md:col-span-3">
            <Label htmlFor="stock_minimo" className="text-sm">
              Stock mínimo
            </Label>
            <Input
              id="stock_minimo"
              name="stock_minimo"
              type="number"
              step="0.01"
              min="0"
              defaultValue="0"
              className="mt-1 tnum"
            />
          </div>
          <div className="col-span-6 md:col-span-3">
            <Label htmlFor="stock_maximo" className="text-sm">
              Stock máximo
            </Label>
            <Input
              id="stock_maximo"
              name="stock_maximo"
              type="number"
              step="0.01"
              min="0"
              className="mt-1 tnum"
            />
          </div>
          <div className="col-span-6 md:col-span-3">
            <Label htmlFor="valor_mercado" className="text-sm">
              Valor a mercado
            </Label>
            <Input
              id="valor_mercado"
              name="valor_mercado"
              type="number"
              step="0.01"
              min="0"
              placeholder="Precio actual unitario"
              className="mt-1 tnum"
            />
          </div>
          <div className="col-span-6 md:col-span-3">
            <Label htmlFor="fuente_valor" className="text-sm">
              Fuente del valor
            </Label>
            <Input
              id="fuente_valor"
              name="fuente_valor"
              placeholder="Cotización proveedor X"
              className="mt-1 text-sm"
            />
          </div>
          <p className="col-span-12 text-[11px] text-ink-3">
            El <strong>costo promedio</strong> y <strong>último costo</strong>{" "}
            se calculan automáticamente al registrar entradas (compras). El{" "}
            <strong>valor a mercado</strong> es el precio actual del producto y
            puede actualizarse manualmente cuando el mercado se mueva.
          </p>
        </div>
      </section>

      <section className="rounded-lg border border-border bg-card p-5 shadow-sm">
        <h2 className="text-base font-semibold">Proveedor preferido</h2>
        <div className="mt-4 grid grid-cols-12 gap-3">
          <div className="col-span-12">
            <Label htmlFor="proveedor_preferido_id" className="text-sm">
              Proveedor (opcional)
            </Label>
            <select
              id="proveedor_preferido_id"
              name="proveedor_preferido_id"
              defaultValue=""
              className="mt-1 h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">— Sin asignar —</option>
              {proveedores.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.razon_social} · {p.rfc}
                </option>
              ))}
            </select>
          </div>
          <div className="col-span-12">
            <Label htmlFor="observaciones" className="text-sm">
              Observaciones
            </Label>
            <textarea
              id="observaciones"
              name="observaciones"
              rows={2}
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

      <div className="flex justify-end">
        <SubmitBtn />
      </div>
    </form>
  );
}

function SubmitBtn() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Creando…" : "Crear item"}
    </Button>
  );
}
