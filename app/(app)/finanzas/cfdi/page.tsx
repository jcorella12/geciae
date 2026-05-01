import { PlaceholderPage } from "@/components/shared/placeholder-page";

export default function CFDIPage() {
  return (
    <PlaceholderPage
      espacio="Administración y Finanzas · CFDI"
      titulo="Emisión y recepción de CFDI 4.0"
      sprint="Sprint 6 (semanas 12-13)"
      resumen="Timbrado vía PAC (SW Sapien o Diverza), complementos de pago automáticos, cancelación con motivos SAT y recepción de CFDI de proveedores con validación SAT."
      funcionalidades={[
        "Generación de borradores desde OT y eventos del proyecto",
        "Validación pre-timbrado contra catálogos SAT y CSD vigente",
        "Timbrado a un click vía PAC agnóstico",
        "Envío automático del XML/PDF al cliente",
        "Complementos de pago automáticos en pagos PPD",
        "Cancelación con motivos SAT (01-04) y flujo de aceptación",
        "Carta Porte 2.0 cuando aplica",
        "Ingesta de XML de proveedores con match a OC y validación SAT",
      ]}
    />
  );
}
