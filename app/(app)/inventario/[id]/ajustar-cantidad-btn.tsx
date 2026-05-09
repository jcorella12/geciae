"use client";

import { Edit3 } from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { ajustarCantidadStock } from "../actions";

type AlmacenStock = {
  almacen_id: string;
  almacen_codigo: string;
  almacen_nombre: string;
  stock: number;
};

/**
 * Permite ajustar la cantidad de stock de un producto en un almacén
 * específico. Crea un movimiento entrada_ajuste / salida_ajuste para
 * preservar audit trail. Solo CEO + contralor pueden usarlo (gating
 * adicional en el server action).
 */
export function AjustarCantidadBtn({
  productoId,
  almacenes,
}: {
  productoId: string;
  almacenes: AlmacenStock[];
}) {
  const [open, setOpen] = useState(false);
  const [almacenId, setAlmacenId] = useState<string>(
    almacenes[0]?.almacen_id ?? "",
  );
  const [cantidadNueva, setCantidadNueva] = useState<string>("");
  const [motivo, setMotivo] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const dialogRef = useRef<HTMLDivElement | null>(null);

  const almacenSeleccionado = almacenes.find((a) => a.almacen_id === almacenId);
  const cantidadActual = almacenSeleccionado?.stock ?? 0;

  // Inicializar con el stock actual cuando cambias de almacén
  useEffect(() => {
    if (open && almacenSeleccionado && cantidadNueva === "") {
      setCantidadNueva(String(almacenSeleccionado.stock));
    }
  }, [almacenId, open, almacenSeleccionado, cantidadNueva]);

  // Cerrar con ESC
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  function abrir() {
    setOpen(true);
    setCantidadNueva(String(cantidadActual));
    setMotivo("");
    setError(null);
  }

  function guardar() {
    setError(null);
    const num = parseFloat(cantidadNueva);
    if (!Number.isFinite(num) || num < 0) {
      setError("Cantidad inválida.");
      return;
    }
    if (num === cantidadActual) {
      setError("La cantidad no cambia.");
      return;
    }
    if (motivo.trim().length < 10) {
      setError("El motivo del ajuste debe tener al menos 10 caracteres.");
      return;
    }
    if (!almacenId) {
      setError("Selecciona un almacén.");
      return;
    }
    startTransition(async () => {
      const r = await ajustarCantidadStock({
        productoId,
        almacenId,
        cantidadActual,
        cantidadNueva: num,
        motivo: motivo.trim(),
      });
      if (!r.ok) {
        setError(r.error ?? "Error");
      } else {
        setOpen(false);
      }
    });
  }

  if (almacenes.length === 0) {
    return null;
  }

  if (!open) {
    return (
      <Button size="sm" variant="outline" onClick={abrir}>
        <Edit3 className="h-3.5 w-3.5" />
        Ajustar cantidad
      </Button>
    );
  }

  const num = parseFloat(cantidadNueva);
  const diff =
    Number.isFinite(num) && num !== cantidadActual ? num - cantidadActual : 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-6"
      onClick={(e) => {
        if (e.target === e.currentTarget) setOpen(false);
      }}
    >
      <div
        ref={dialogRef}
        className="w-full max-w-md rounded-md border border-border bg-card p-5 shadow-lg"
      >
        <h3 className="mb-1 text-[15px] font-semibold">Ajustar cantidad de stock</h3>
        <p className="mb-4 text-[11.5px] text-ink-3">
          Crea un movimiento de ajuste por la diferencia (entrada o salida).
          La acción queda registrada en el kardex.
        </p>

        <div className="mb-3">
          <Label className="text-[11.5px]">Almacén</Label>
          <select
            value={almacenId}
            onChange={(e) => {
              setAlmacenId(e.target.value);
              const a = almacenes.find((x) => x.almacen_id === e.target.value);
              if (a) setCantidadNueva(String(a.stock));
            }}
            className="mt-0.5 w-full rounded-md border border-border bg-card px-3 py-1.5 text-[13px]"
          >
            {almacenes.map((a) => (
              <option key={a.almacen_id} value={a.almacen_id}>
                {a.almacen_nombre} · stock actual {a.stock}
              </option>
            ))}
          </select>
        </div>

        <div className="mb-3 grid grid-cols-2 gap-3">
          <div>
            <Label className="text-[11.5px]">Cantidad actual</Label>
            <Input
              value={cantidadActual}
              readOnly
              className="mt-0.5 bg-bg-2/40 text-[13px] tnum"
            />
          </div>
          <div>
            <Label className="text-[11.5px]">Cantidad nueva</Label>
            <Input
              type="number"
              step="any"
              min="0"
              value={cantidadNueva}
              onChange={(e) => setCantidadNueva(e.target.value)}
              autoFocus
              className="mt-0.5 text-[13px] tnum"
            />
          </div>
        </div>

        {diff !== 0 && Number.isFinite(num) && (
          <p
            className={`mb-3 text-[11.5px] ${
              diff > 0 ? "text-emerald-700" : "text-amber-700"
            }`}
          >
            {diff > 0 ? "Entrada" : "Salida"} de{" "}
            <span className="font-semibold tnum">{Math.abs(diff)}</span> unidades.
          </p>
        )}

        <div className="mb-4">
          <Label className="text-[11.5px]">
            Motivo del ajuste (mín. 10 caracteres)
          </Label>
          <textarea
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            rows={3}
            placeholder="Ej: Conteo físico mostró 5 unidades menos por daño en bodega."
            className="mt-0.5 w-full rounded-md border border-border bg-card px-3 py-2 text-[13px]"
          />
        </div>

        {error && (
          <p className="mb-3 text-[11.5px] text-danger-deep">{error}</p>
        )}

        <div className="flex items-center gap-2">
          <Button size="sm" onClick={guardar} disabled={pending}>
            {pending ? "Guardando…" : "Confirmar ajuste"}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={pending}
          >
            Cancelar
          </Button>
        </div>
      </div>
    </div>
  );
}
