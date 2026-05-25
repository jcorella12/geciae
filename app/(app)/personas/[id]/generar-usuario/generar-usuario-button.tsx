"use client";

import { UserPlus, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { generarUsuarioParaEmpleado } from "./actions";
import { initialGenerarUsuarioState } from "./state";

const ATRIBUTOS_OPCIONALES = [
  { value: "rh", label: "RH (acceso a nómina de todo el grupo)" },
  { value: "contralor", label: "Contralor (acceso a nómina + finanzas)" },
  {
    value: "tesorero_corporativo",
    label: "Tesorero corporativo",
  },
  { value: "auditor_interno", label: "Auditor interno" },
  { value: "aprobador_financiero", label: "Aprobador financiero" },
  { value: "vendedor", label: "Vendedor" },
  { value: "supervisor_cuadrilla", label: "Supervisor de cuadrilla" },
  { value: "coordinador_calidad", label: "Coordinador de calidad" },
] as const;

export function GenerarUsuarioButton({
  empleadoId,
  emailDefault = "",
  nombreEmpleado,
}: {
  empleadoId: string;
  emailDefault?: string;
  nombreEmpleado: string;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction] = useFormState(
    generarUsuarioParaEmpleado,
    initialGenerarUsuarioState,
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  // Cerrar después de éxito
  useEffect(() => {
    if (state.ok) {
      const t = setTimeout(() => setOpen(false), 2500);
      return () => clearTimeout(t);
    }
  }, [state.ok]);

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <UserPlus className="h-3.5 w-3.5" />
        Generar usuario
      </Button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Generar usuario para empleado"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <div className="w-full max-w-md rounded-lg border border-border bg-card shadow-lg">
            <header className="flex items-center justify-between border-b border-border px-4 py-3">
              <h3 className="text-sm font-semibold">
                Generar usuario · {nombreEmpleado}
              </h3>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </header>

            <form action={formAction} className="space-y-4 p-5">
              <input type="hidden" name="empleado_id" value={empleadoId} />

              <p className="text-xs text-muted-foreground">
                Crea (o vincula) una cuenta de la app para este empleado.
                Se le enviará un magic link al correo. Una vez que lo
                active, podrá entrar a su <strong>Portal del Empleado</strong>{" "}
                y descargar sus recibos XML/PDF.
              </p>

              <div className="space-y-2">
                <Label htmlFor="email">Correo del empleado</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  required
                  defaultValue={emailDefault}
                  placeholder="empleado@correo.com"
                />
                <p className="text-[11px] text-muted-foreground">
                  Si el correo ya tiene cuenta en la app, simplemente se
                  vincula al empleado. Si no, se envía invitación.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="rol">Rol en la empresa</Label>
                <select
                  id="rol"
                  name="rol"
                  defaultValue="empleado"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="empleado">Empleado (solo su portal)</option>
                  <option value="operativo">
                    Operativo (PM, vendedor, supervisor)
                  </option>
                  <option value="director">Director / Gerente</option>
                </select>
              </div>

              <fieldset className="space-y-2">
                <legend className="text-sm font-medium">
                  Atributos opcionales
                </legend>
                <p className="text-[11px] text-muted-foreground">
                  Solo marca los que apliquen. Estos son permisos
                  adicionales — un empleado normal NO necesita ninguno.
                </p>
                <div className="grid grid-cols-1 gap-1.5">
                  {ATRIBUTOS_OPCIONALES.map((a) => (
                    <label
                      key={a.value}
                      className="flex cursor-pointer items-center gap-2 rounded-md border border-border bg-background px-3 py-1.5 text-xs hover:bg-secondary"
                    >
                      <input
                        type="checkbox"
                        name="atributos"
                        value={a.value}
                        className="h-3.5 w-3.5"
                      />
                      <span>{a.label}</span>
                    </label>
                  ))}
                </div>
              </fieldset>

              {state.error && (
                <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {state.error}
                </p>
              )}
              {state.message && (
                <p className="rounded-md border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
                  ✓ {state.message}
                </p>
              )}

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setOpen(false)}
                >
                  Cerrar
                </Button>
                <Submit />
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

function Submit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Enviando…" : "Generar y enviar invitación"}
    </Button>
  );
}
