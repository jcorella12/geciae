"use client";

import { useState } from "react";

import { DocumentExtractor } from "@/components/shared/document-extractor";

import {
  ClienteForm,
  type ClienteFormDefaults,
} from "../cliente-form";
import { procesarCSFCliente } from "./ia-actions";

type Empresa = {
  id: string;
  codigo: string;
  razon_social: string;
  nombre_comercial: string | null;
};

export function NuevoClienteWrapper({ empresas }: { empresas: Empresa[] }) {
  const [extracted, setExtracted] = useState<ClienteFormDefaults | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  function onExtracted(d: ClienteFormDefaults) {
    setExtracted(d);
    setReloadKey((k) => k + 1);
  }

  return (
    <div className="space-y-4">
      <DocumentExtractor
        accept="image/jpeg,image/png,image/webp,application/pdf"
        label="¿Tienes el CSF del cliente?"
        description="Súbelo y la IA autocompleta los datos fiscales del formulario. Acepta PDF o imagen, máx 10 MB."
        onProcess={procesarCSFCliente}
        onExtracted={onExtracted}
      />
      <ClienteForm
        key={reloadKey}
        empresas={empresas}
        defaults={extracted ?? undefined}
      />
    </div>
  );
}
