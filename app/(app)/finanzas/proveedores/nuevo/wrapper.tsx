"use client";

import { useState } from "react";

import { DocumentExtractor } from "@/components/shared/document-extractor";

import {
  ProveedorForm,
  type ProveedorFormDefaults,
} from "../proveedor-form";
import { procesarCSFProveedor } from "./ia-actions";

type Empresa = {
  id: string;
  codigo: string;
  razon_social: string;
  nombre_comercial: string | null;
};

export function NuevoProveedorWrapper({ empresas }: { empresas: Empresa[] }) {
  const [extracted, setExtracted] = useState<ProveedorFormDefaults | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  function onExtracted(d: ProveedorFormDefaults) {
    setExtracted(d);
    setReloadKey((k) => k + 1);
  }

  return (
    <div className="space-y-4">
      <DocumentExtractor
        accept="image/jpeg,image/png,image/webp,application/pdf"
        label="¿Tienes el CSF del proveedor?"
        description="La IA lee los datos fiscales y completa el formulario. Acepta PDF o imagen, máx 10 MB."
        onProcess={procesarCSFProveedor}
        onExtracted={onExtracted}
      />
      <ProveedorForm
        key={reloadKey}
        empresas={empresas}
        defaults={extracted ?? undefined}
      />
    </div>
  );
}
