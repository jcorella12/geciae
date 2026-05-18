"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { confirm } from "@/components/ui/confirm";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { cerrarPresupuesto, generarProvisionGarantia, guardarPresupuesto } from "./actions";

type Props = {
  proyectoId: string;
  cerrado: boolean;
  initial: {
    ingreso_total?: number;
    presupuesto_materiales?: number;
    presupuesto_mano_obra_ingenieria?: number;
    presupuesto_mano_obra_campo?: number;
    presupuesto_subcontratos?: number;
    presupuesto_indirectos?: number;
    margen_objetivo_pct?: number;
    porcentaje_provision_garantia?: number;
  } | null;
};

export function PresupuestoForm({ proyectoId, cerrado, initial }: Props) {
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  function handleSubmit(formData: FormData) {
    formData.set("proyecto_id", proyectoId);
    startTransition(async () => {
      const r = await guardarPresupuesto(formData);
      setMsg(r.ok ? "✓ Guardado" : `✗ ${r.error}`);
    });
  }

  async function handleCerrar() {
    if (
      !(await confirm("¿Cerrar el presupuesto? No podrá editarse sin reabrir."))
    )
      return;
    startTransition(async () => {
      const r = await cerrarPresupuesto(proyectoId);
      setMsg(r.ok ? "✓ Cerrado" : `✗ ${r.error}`);
    });
  }

  function handleProvision() {
    startTransition(async () => {
      const r = await generarProvisionGarantia(proyectoId);
      setMsg(r.ok ? "✓ Provisión generada" : `✗ ${r.error}`);
    });
  }

  return (
    <form action={handleSubmit} className="space-y-3">
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <Label>Ingreso total contratado *</Label>
          <Input
            name="ingreso_total"
            type="number"
            step="0.01"
            min="0"
            required
            defaultValue={initial?.ingreso_total ?? ""}
            disabled={cerrado || pending}
          />
        </div>
        <div>
          <Label>Margen objetivo (%)</Label>
          <Input
            name="margen_objetivo_pct"
            type="number"
            step="0.1"
            min="0"
            max="100"
            defaultValue={initial?.margen_objetivo_pct ?? 25}
            disabled={cerrado || pending}
          />
        </div>
        <div>
          <Label>% provisión garantía</Label>
          <Input
            name="porcentaje_provision_garantia"
            type="number"
            step="0.1"
            min="0"
            max="30"
            defaultValue={initial?.porcentaje_provision_garantia ?? 3}
            disabled={cerrado || pending}
          />
        </div>
        <div />
        <div>
          <Label>Presupuesto materiales</Label>
          <Input
            name="presupuesto_materiales"
            type="number"
            step="0.01"
            min="0"
            defaultValue={initial?.presupuesto_materiales ?? 0}
            disabled={cerrado || pending}
          />
        </div>
        <div>
          <Label>Presupuesto mano obra ingeniería</Label>
          <Input
            name="presupuesto_mano_obra_ingenieria"
            type="number"
            step="0.01"
            min="0"
            defaultValue={initial?.presupuesto_mano_obra_ingenieria ?? 0}
            disabled={cerrado || pending}
          />
        </div>
        <div>
          <Label>Presupuesto mano obra campo</Label>
          <Input
            name="presupuesto_mano_obra_campo"
            type="number"
            step="0.01"
            min="0"
            defaultValue={initial?.presupuesto_mano_obra_campo ?? 0}
            disabled={cerrado || pending}
          />
        </div>
        <div>
          <Label>Presupuesto subcontratos</Label>
          <Input
            name="presupuesto_subcontratos"
            type="number"
            step="0.01"
            min="0"
            defaultValue={initial?.presupuesto_subcontratos ?? 0}
            disabled={cerrado || pending}
          />
        </div>
        <div>
          <Label>Presupuesto indirectos</Label>
          <Input
            name="presupuesto_indirectos"
            type="number"
            step="0.01"
            min="0"
            defaultValue={initial?.presupuesto_indirectos ?? 0}
            disabled={cerrado || pending}
          />
        </div>
      </div>

      {msg && (
        <p
          className={`text-[12px] ${
            msg.startsWith("✓") ? "text-emerald-700" : "text-red-700"
          }`}
        >
          {msg}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={cerrado || pending}>
          {cerrado ? "Cerrado (no editable)" : pending ? "Guardando…" : "Guardar"}
        </Button>
        {!cerrado && (
          <Button type="button" variant="outline" onClick={handleProvision} disabled={pending}>
            Generar provisión garantía
          </Button>
        )}
        {!cerrado && (
          <Button
            type="button"
            variant="outline"
            onClick={handleCerrar}
            disabled={pending}
          >
            Cerrar presupuesto
          </Button>
        )}
      </div>
    </form>
  );
}
