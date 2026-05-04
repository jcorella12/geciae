"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useFormState, useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { initialPrestamoState } from "@/lib/prestamos/state";

import { solicitarPrestamo } from "./actions";

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

type LineaOpcion = {
  id: string;
  monto_disponible: number | null;
  monto_autorizado: number;
  spread: number | null;
  acreedora: { codigo: string; nombre_comercial: string | null; razon_social: string } | null;
  deudora: { codigo: string; nombre_comercial: string | null; razon_social: string } | null;
};

export function PrestamoForm({
  lineas,
  lineaPreseleccionada,
}: {
  lineas: LineaOpcion[];
  lineaPreseleccionada: string | null;
}) {
  const router = useRouter();
  const [state, formAction] = useFormState(
    solicitarPrestamo,
    initialPrestamoState,
  );

  useEffect(() => {
    if (state.ok && state.prestamoId) {
      router.push(`/finanzas/tesoreria/prestamos/${state.prestamoId}`);
    }
  }, [state, router]);

  if (lineas.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">
        No hay líneas de crédito disponibles para tu empresa. Pide al CEO o
        tesorero corporativo que abran una línea primero.
      </div>
    );
  }

  return (
    <form action={formAction} className="rounded-lg border border-border bg-card p-5 shadow-sm">
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">Línea de crédito</legend>
        <div className="grid gap-2">
          {lineas.map((l) => {
            const disponible = Number(
              l.monto_disponible ?? l.monto_autorizado,
            );
            return (
              <label
                key={l.id}
                className="flex cursor-pointer items-start gap-3 rounded-md border border-border bg-background px-4 py-3 text-sm hover:bg-secondary"
              >
                <input
                  type="radio"
                  name="linea_id"
                  value={l.id}
                  required
                  defaultChecked={lineaPreseleccionada === l.id}
                  className="mt-1 h-4 w-4"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="inline-flex items-center gap-1.5">
                      <span
                        className={`inline-block h-2 w-2 rounded-full ${
                          empresaCodigoColor[l.acreedora?.codigo ?? ""] ??
                          "bg-muted-foreground"
                        }`}
                      />
                      {l.acreedora?.codigo} (acreedora)
                    </span>
                    <span className="text-muted-foreground">→</span>
                    <span className="inline-flex items-center gap-1.5">
                      <span
                        className={`inline-block h-2 w-2 rounded-full ${
                          empresaCodigoColor[l.deudora?.codigo ?? ""] ??
                          "bg-muted-foreground"
                        }`}
                      />
                      {l.deudora?.codigo} (deudora)
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Disponible:{" "}
                    <span className="font-mono font-medium text-foreground">
                      {fmtMxn.format(disponible)}
                    </span>{" "}
                    · Spread {((l.spread ?? 0) * 100).toFixed(2)}%
                  </p>
                </div>
              </label>
            );
          })}
        </div>
      </fieldset>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="monto">Monto solicitado (MXN)</Label>
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
          <Label htmlFor="fecha_vencimiento">Fecha estimada de pago</Label>
          <Input
            id="fecha_vencimiento"
            name="fecha_vencimiento"
            type="date"
          />
        </div>
      </div>

      <div className="mt-4 space-y-1">
        <Label htmlFor="motivo">Motivo / destino del préstamo</Label>
        <textarea
          id="motivo"
          name="motivo"
          rows={3}
          maxLength={500}
          placeholder="Compra de materiales para proyecto X, capital de trabajo, …"
          className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        />
      </div>

      {state.error && (
        <p className="mt-3 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.error}
        </p>
      )}

      <div className="mt-4 flex gap-2">
        <SubmitBtn />
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/finanzas/tesoreria/prestamos")}
        >
          Cancelar
        </Button>
      </div>
    </form>
  );
}

function SubmitBtn() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Solicitando…" : "Solicitar préstamo"}
    </Button>
  );
}
