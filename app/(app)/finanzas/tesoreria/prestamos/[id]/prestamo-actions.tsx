"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { confirm } from "@/components/ui/confirm";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { EstadoPrestamo } from "@/lib/prestamos/state";

import {
  aprobarPrestamo,
  cancelarPrestamo,
  confirmarRecepcionPrestamo,
  ejecutarPrestamo,
  registrarPagoPrestamo,
} from "../actions";

type Props = {
  prestamoId: string;
  estado: EstadoPrestamo;
  saldoPendiente: number;
  permisos: {
    puedeAprobar: boolean;
    puedeEjecutar: boolean;
    puedeConfirmar: boolean;
    puedePagar: boolean;
    puedeCancelar: boolean;
  };
};

export function PrestamoActions({
  prestamoId,
  estado,
  saldoPendiente,
  permisos,
}: Props) {
  const [, startTransition] = useTransition();
  const [showPago, setShowPago] = useState(false);
  const [showCancelar, setShowCancelar] = useState(false);
  const [showEjecutar, setShowEjecutar] = useState(false);
  const [comprobante, setComprobante] = useState("");
  const [motivoCancel, setMotivoCancel] = useState("");

  async function aprobar() {
    if (!(await confirm("¿Aprobar este préstamo?"))) return;
    startTransition(async () => {
      const r = await aprobarPrestamo(prestamoId);
      if (!r.ok) alert(`Error: ${r.error}`);
    });
  }

  function ejecutar() {
    startTransition(async () => {
      const r = await ejecutarPrestamo(
        prestamoId,
        comprobante.trim() || null,
      );
      if (!r.ok) alert(`Error: ${r.error}`);
      else setShowEjecutar(false);
    });
  }

  async function confirmar() {
    if (
      !(await confirm("¿Confirmas que recibiste la transferencia en banco?"))
    )
      return;
    startTransition(async () => {
      const r = await confirmarRecepcionPrestamo(prestamoId);
      if (!r.ok) alert(`Error: ${r.error}`);
    });
  }

  function cancelar() {
    if (!motivoCancel.trim()) return;
    startTransition(async () => {
      const r = await cancelarPrestamo(prestamoId, motivoCancel.trim());
      if (!r.ok) alert(`Error: ${r.error}`);
      else {
        setShowCancelar(false);
        setMotivoCancel("");
      }
    });
  }

  function pagar(formData: FormData) {
    startTransition(async () => {
      const r = await registrarPagoPrestamo(prestamoId, formData);
      if (!r.ok) alert(`Error: ${r.error}`);
      else setShowPago(false);
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {estado === "solicitado" && permisos.puedeAprobar && (
          <Button onClick={aprobar}>Aprobar</Button>
        )}
        {estado === "aprobado" && permisos.puedeEjecutar && (
          <Button onClick={() => setShowEjecutar(true)}>
            Marcar como ejecutado
          </Button>
        )}
        {estado === "ejecutado" && permisos.puedeConfirmar && (
          <Button onClick={confirmar} variant="default">
            Confirmar recepción
          </Button>
        )}
        {["ejecutado", "confirmado", "pagado_parcial"].includes(estado) &&
          permisos.puedePagar &&
          saldoPendiente > 0.01 && (
            <Button onClick={() => setShowPago(true)} variant="outline">
              Registrar pago
            </Button>
          )}
        {["solicitado", "aprobado"].includes(estado) &&
          permisos.puedeCancelar && (
            <Button
              onClick={() => setShowCancelar(true)}
              variant="ghost"
              className="text-destructive hover:bg-destructive/10"
            >
              Cancelar
            </Button>
          )}
      </div>

      {showEjecutar && (
        <div className="rounded-md border border-amber-300 bg-amber-50 p-4 dark:border-amber-700 dark:bg-amber-950">
          <p className="text-sm font-medium">Marcar préstamo como ejecutado</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Confirma que ya hiciste la transferencia bancaria desde la empresa
            acreedora hacia la deudora.
          </p>
          <div className="mt-3 space-y-1">
            <Label htmlFor="comprobante">Comprobante / referencia</Label>
            <Input
              id="comprobante"
              value={comprobante}
              onChange={(e) => setComprobante(e.target.value)}
              placeholder="Folio SPEI, número de operación…"
            />
          </div>
          <div className="mt-3 flex gap-2">
            <Button onClick={ejecutar}>Ejecutar</Button>
            <Button variant="outline" onClick={() => setShowEjecutar(false)}>
              Cancelar
            </Button>
          </div>
        </div>
      )}

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
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="monto_pago">Monto pagado (MXN)</Label>
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
              <Label htmlFor="fecha_pago">Fecha del pago</Label>
              <Input
                id="fecha_pago"
                name="fecha_pago"
                type="date"
                defaultValue={new Date().toISOString().slice(0, 10)}
              />
            </div>
          </div>
          <div className="mt-3 space-y-1">
            <Label htmlFor="observaciones">Observaciones</Label>
            <Input id="observaciones" name="observaciones" />
          </div>
          <div className="mt-3 flex gap-2">
            <Button type="submit">Registrar</Button>
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

      {showCancelar && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4">
          <p className="text-sm font-medium">Cancelar préstamo</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Esta acción no se puede revertir.
          </p>
          <div className="mt-3 space-y-1">
            <Label htmlFor="motivo_cancel">Motivo</Label>
            <Input
              id="motivo_cancel"
              value={motivoCancel}
              onChange={(e) => setMotivoCancel(e.target.value)}
              placeholder="Razón de la cancelación"
              required
            />
          </div>
          <div className="mt-3 flex gap-2">
            <Button onClick={cancelar} variant="destructive">
              Confirmar cancelación
            </Button>
            <Button variant="outline" onClick={() => setShowCancelar(false)}>
              Volver
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
