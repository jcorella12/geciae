import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  esCEO,
  obtenerVinculos,
  tieneAtributo,
} from "@/lib/auth/permisos";

import { BulkZipForm } from "./bulk-form";

export const metadata = {
  title: "Carga masiva CFDI (ZIP) · PSE ERP",
};

export default async function BulkZipPage() {
  // Gate: alguien con permiso de registrar CFDI en al menos una empresa.
  // El action vuelve a validar por empresa.
  const vinculos = await obtenerVinculos();
  const tieneAlgunPermiso =
    esCEO(vinculos) ||
    tieneAtributo(vinculos, "tesorero_corporativo") ||
    vinculos.some((v) => v.rol === "director" || v.rol === "operativo");
  if (!tieneAlgunPermiso) {
    redirect("/finanzas/cfdi");
  }

  return (
    <div className="container mx-auto max-w-5xl space-y-6 py-6">
      <div>
        <Link
          href="/finanzas/cfdi"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3 w-3" />
          Volver al listado CFDI
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">
          Carga masiva de CFDIs desde ZIP
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Sube un ZIP con los CFDIs emitidos o recibidos del mes. El sistema
          detecta automáticamente la empresa del grupo, el sentido
          (emitido/recibido) y vincula proveedor o cliente por RFC.
        </p>
      </div>

      <div className="flex justify-end">
        <Link href="/finanzas/cfdi/nuevo">
          <Button variant="outline" size="sm">
            Subir uno a la vez →
          </Button>
        </Link>
      </div>

      <BulkZipForm />
    </div>
  );
}
