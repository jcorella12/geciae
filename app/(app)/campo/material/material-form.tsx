"use client";

import { Package } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { initialMovimientoState } from "@/lib/inventario/state";

import { registrarMovimiento } from "@/app/(app)/inventario/actions";

type Almacen = { id: string; codigo: string; nombre: string };
type Existencia = {
  productoId: string;
  almacenId: string;
  sku: string;
  nombre: string;
  unidad: string;
  stock: number;
};

export function MaterialForm({
  proyecto,
  empresaId,
  almacenes,
  existencias,
}: {
  proyecto: { id: string; codigo: string; nombre: string };
  empresaId: string;
  almacenes: Almacen[];
  existencias: Existencia[];
}) {
  const [state, formAction] = useFormState(
    registrarMovimiento,
    initialMovimientoState,
  );
  const formRef = useRef<HTMLFormElement>(null);
  const [almacenId, setAlmacenId] = useState(almacenes[0]?.id ?? "");
  const [productoId, setProductoId] = useState("");
  const [exito, setExito] = useState(false);

  // Productos con existencia en el almacén elegido.
  const productos = useMemo(
    () => existencias.filter((e) => e.almacenId === almacenId),
    [existencias, almacenId],
  );
  const sel = productos.find((p) => p.productoId === productoId);

  useEffect(() => {
    if (state.ok) {
      formRef.current?.reset();
      setProductoId("");
      setExito(true);
    }
  }, [state.ok]);

  if (almacenes.length === 0) {
    return (
      <div className="mx-auto w-full max-w-md px-4 py-6">
        <Link href="/campo/material" className="text-[12px] text-brand hover:underline">
          ← Cambiar proyecto
        </Link>
        <p className="mt-4 rounded-md border border-dashed border-border bg-card p-6 text-center text-[13px] text-ink-3">
          La empresa no tiene almacenes configurados.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-md px-4 py-6">
      <Link href="/campo/material" className="text-[12px] text-brand hover:underline">
        ← Cambiar proyecto
      </Link>
      <div className="mt-1.5 flex items-center gap-2">
        <Package className="h-5 w-5 text-brand" />
        <h1 className="text-[19px] font-semibold leading-tight">
          Salida de material
        </h1>
      </div>
      <p className="mt-0.5 mb-4 text-[12.5px] text-ink-3">
        <span className="font-mono text-[11px]">{proyecto.codigo}</span>{" "}
        {proyecto.nombre}
      </p>

      {exito && (
        <p className="mb-3 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-[12.5px] text-emerald-800">
          ✓ Salida registrada y descontada del almacén. Puedes registrar otra.
        </p>
      )}

      <form
        ref={formRef}
        action={formAction}
        onChange={() => exito && setExito(false)}
        className="space-y-3"
      >
        <input type="hidden" name="empresa_id" value={empresaId} />
        <input type="hidden" name="proyecto_id" value={proyecto.id} />
        <input type="hidden" name="tipo" value="salida_obra" />
        <input type="hidden" name="almacen_id" value={almacenId} />
        <input type="hidden" name="producto_id" value={productoId} />

        <div>
          <label className="mb-1 block text-[12px] font-medium">Almacén</label>
          <select
            value={almacenId}
            onChange={(e) => {
              setAlmacenId(e.target.value);
              setProductoId("");
            }}
            className="h-10 w-full rounded-md border border-input bg-background px-2 text-sm"
          >
            {almacenes.map((a) => (
              <option key={a.id} value={a.id}>
                {a.codigo} — {a.nombre}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-[12px] font-medium">Material</label>
          {productos.length === 0 ? (
            <p className="rounded-md border border-dashed border-border bg-card px-3 py-3 text-[12px] text-ink-3">
              No hay material con existencia en este almacén.
            </p>
          ) : (
            <select
              value={productoId}
              onChange={(e) => setProductoId(e.target.value)}
              className="h-10 w-full rounded-md border border-input bg-background px-2 text-sm"
            >
              <option value="">Selecciona…</option>
              {productos.map((p) => (
                <option key={p.productoId} value={p.productoId}>
                  {p.nombre} ({p.stock} {p.unidad} disp.)
                </option>
              ))}
            </select>
          )}
        </div>

        {sel && (
          <div>
            <label className="mb-1 block text-[12px] font-medium">
              Cantidad{" "}
              <span className="font-normal text-ink-3">
                (máx {sel.stock} {sel.unidad})
              </span>
            </label>
            <Input
              type="number"
              name="cantidad"
              step="any"
              min="0"
              max={sel.stock}
              placeholder="0"
              required
            />
          </div>
        )}

        {state.error && (
          <p className="text-[12px] text-destructive">{state.error}</p>
        )}

        <SubmitBtn disabled={!sel} />
      </form>
    </div>
  );
}

function SubmitBtn({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      size="lg"
      disabled={pending || disabled}
      className="w-full"
    >
      {pending ? "Registrando…" : "Registrar salida"}
    </Button>
  );
}
