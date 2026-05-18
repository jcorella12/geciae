"use client";

import { useMemo, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { notify } from "@/components/ui/notify";

import { cancelarCfdi, registrarPagoCfdi } from "../actions";

export function CfdiActions({
  cfdiId,
  estado,
  saldoPendiente,
  puedeOperar,
}: {
  cfdiId: string;
  estado: string;
  saldoPendiente: number;
  puedeOperar: boolean;
}) {
  const [showPago, setShowPago] = useState(false);
  const [showCancel, setShowCancel] = useState(false);
  const [pending, start] = useTransition();
  const [motivo, setMotivo] = useState("02");
  const [uuidSust, setUuidSust] = useState("");

  // S2-T3: idempotency token regenerado cada vez que se abre el form
  // de pago. Si hay doble-click o retry de red, el server detecta el
  // token duplicado y no registra dos veces.
  const idempotencyToken = useMemo(
    () =>
      showPago && typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : "",
    [showPago],
  );

  if (!puedeOperar) return null;

  function pagar(formData: FormData) {
    start(async () => {
      const r = await registrarPagoCfdi(cfdiId, formData);
      if (!r.ok) notify({ message: r.error ?? "Error", variant: "error" });
      else setShowPago(false);
    });
  }

  function cancelar() {
    start(async () => {
      const r = await cancelarCfdi(
        cfdiId,
        motivo,
        motivo === "01" ? uuidSust.trim() || undefined : undefined,
      );
      if (!r.ok) notify({ message: r.error ?? "Error", variant: "error" });
      else setShowCancel(false);
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {estado !== "cancelado" && estado !== "pagado" && saldoPendiente > 0.01 && (
          <Button onClick={() => setShowPago(true)} variant="outline">
            Registrar pago
          </Button>
        )}
        {estado !== "cancelado" && (
          <Button
            onClick={() => setShowCancel(true)}
            variant="ghost"
            className="text-destructive hover:bg-destructive/10"
          >
            Marcar cancelado
          </Button>
        )}
      </div>

      {showPago && (
        <form
          action={pagar}
          className="rounded-md border border-emerald-300 bg-emerald-50 p-4 dark:border-emerald-700 dark:bg-emerald-950"
        >
          <p className="text-sm font-medium">Registrar pago</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Saldo pendiente:{" "}
            <span className="font-mono">
              {saldoPendiente.toLocaleString("es-MX", {
                style: "currency",
                currency: "MXN",
              })}
            </span>
          </p>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <div className="space-y-1">
              <Label htmlFor="monto_pago">Monto (MXN)</Label>
              <Input
                id="monto_pago"
                name="monto_pago"
                type="number"
                step="0.01"
                min="0.01"
                max={saldoPendiente}
                required
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="fecha_pago">Fecha</Label>
              <Input
                id="fecha_pago"
                name="fecha_pago"
                type="date"
                defaultValue={new Date().toISOString().slice(0, 10)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="forma_pago">Forma pago</Label>
              <select
                id="forma_pago"
                name="forma_pago"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                defaultValue="03"
              >
                <option value="01">01 Efectivo</option>
                <option value="02">02 Cheque nominativo</option>
                <option value="03">03 Transferencia electrónica</option>
                <option value="04">04 Tarjeta de crédito</option>
                <option value="28">28 Tarjeta de débito</option>
                <option value="99">99 Por definir</option>
              </select>
            </div>
          </div>
          <div className="mt-3 space-y-1">
            <Label htmlFor="observaciones">Observaciones</Label>
            <Input id="observaciones" name="observaciones" />
          </div>
          <input
            type="hidden"
            name="idempotency_token"
            value={idempotencyToken}
          />
          <div className="mt-3 flex gap-2">
            <Button type="submit" disabled={pending}>
              {pending ? "Guardando…" : "Registrar"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowPago(false)}
            >
              Cancelar
            </Button>
          </div>
        </form>
      )}

      {showCancel && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4">
          <p className="text-sm font-medium">Marcar CFDI como cancelado</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Solo registra el estado en el sistema. La cancelación ante el SAT
            debe hacerse desde tu PAC actual.
          </p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="motivo">Motivo SAT</Label>
              <select
                id="motivo"
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="01">01 Comprobante con errores con relación</option>
                <option value="02">02 Comprobante con errores sin relación</option>
                <option value="03">03 No se llevó a cabo la operación</option>
                <option value="04">04 Operación nominativa relacionada en factura global</option>
              </select>
            </div>
            {motivo === "01" && (
              <div className="space-y-1">
                <Label htmlFor="uuid_sust">UUID que sustituye</Label>
                <Input
                  id="uuid_sust"
                  value={uuidSust}
                  onChange={(e) => setUuidSust(e.target.value)}
                  placeholder="UUID del CFDI nuevo"
                  className="font-mono text-xs"
                />
              </div>
            )}
          </div>
          <div className="mt-3 flex gap-2">
            <Button onClick={cancelar} variant="destructive" disabled={pending}>
              {pending ? "Cancelando…" : "Confirmar cancelación"}
            </Button>
            <Button variant="outline" onClick={() => setShowCancel(false)}>
              Volver
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
