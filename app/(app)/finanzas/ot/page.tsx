import { PlaceholderPage } from "@/components/shared/placeholder-page";

export default function OTPage() {
  return (
    <PlaceholderPage
      espacio="Administración y Finanzas · OT inter-compañías"
      titulo="Órdenes de trabajo entre empresas del grupo"
      sprint="Sprint 5 (semanas 10-11)"
      resumen="OT entre las 4 empresas con margen 15% automático configurable, doble confirmación (emisora y receptora), y generación de borrador CFDI."
      funcionalidades={[
        "Creación de OT entre dos empresas del grupo",
        "Margen automático 15% (configurable por OT)",
        "Doble confirmación: empresa emisora y receptora aprueban",
        "Generación de borrador CFDI al confirmar",
        "Trazabilidad bidireccional con tesorería del grupo",
      ]}
    />
  );
}
