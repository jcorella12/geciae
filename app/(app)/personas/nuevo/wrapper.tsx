"use client";

import { useState } from "react";

import { DocumentExtractor } from "@/components/shared/document-extractor";

import {
  EmpleadoForm,
  type EmpleadoFormDefaults,
} from "../empleado-form";
import { procesarINEEmpleado } from "./ia-actions";

type Empresa = {
  id: string;
  codigo: string;
  razon_social: string;
  nombre_comercial: string | null;
};

export function NuevoEmpleadoWrapper({
  empresasGestionables,
}: {
  empresasGestionables: Empresa[];
}) {
  const [extracted, setExtracted] = useState<EmpleadoFormDefaults | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  function onExtracted(d: EmpleadoFormDefaults) {
    setExtracted(d);
    setReloadKey((k) => k + 1);
  }

  return (
    <div className="space-y-4">
      <DocumentExtractor
        accept="image/jpeg,image/png,image/webp,application/pdf"
        label="¿Tienes la INE/IFE del empleado?"
        description="La IA lee nombre, CURP, fecha de nacimiento y domicilio. Acepta foto o PDF."
        onProcess={procesarINEEmpleado}
        onExtracted={onExtracted}
      />
      <EmpleadoForm
        key={reloadKey}
        empresasGestionables={empresasGestionables}
        defaults={extracted ?? undefined}
      />
    </div>
  );
}
