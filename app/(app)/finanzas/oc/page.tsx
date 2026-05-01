import { PlaceholderPage } from "@/components/shared/placeholder-page";

export default function OCPage() {
  return (
    <PlaceholderPage
      espacio="Administración y Finanzas · Compras"
      titulo="Órdenes de compra (OC)"
      sprint="Sprint 4 (semanas 8-9)"
      resumen="Flujo completo de OC: desde la creación hasta el cierre con pago, con aprobación por umbrales y validación contra CFDI recibido."
      funcionalidades={[
        "Creación con borrador IA desde requisición o contexto",
        "Aprobación por umbrales según rol y atributo aprobador_financiero",
        "Bloqueo automático si proveedor está en estado rojo o negro",
        "Recepción de mercancía/servicio con check-list",
        "Match contra CFDI recibido del proveedor",
        "Cierre de OC con pago y actualización de tesorería",
      ]}
    />
  );
}
