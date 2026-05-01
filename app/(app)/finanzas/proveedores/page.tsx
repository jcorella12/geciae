import { PlaceholderPage } from "@/components/shared/placeholder-page";

export default function ProveedoresPage() {
  return (
    <PlaceholderPage
      espacio="Administración y Finanzas · Proveedores"
      titulo="Catálogo de proveedores"
      sprint="Sprint 2 (catálogo) + Sprint 4 (cumplimiento)"
      resumen="Catálogo único de proveedores con expediente robusto y semáforo automático de cumplimiento (verde/amarillo/rojo/negro)."
      funcionalidades={[
        "Alta manual con datos fiscales y bancarios",
        "Alta con IA leyendo CSF y opinión de cumplimiento (Sprint 3)",
        "Niveles de cumplimiento automáticos según vigencia de documentos",
        "Bloqueo automático para crear OC con proveedor en rojo o negro",
        "Evaluación básica de proveedores",
        "Portal proveedor (subida de CFDI, gestión personal REPSE) → Fase 2",
      ]}
    />
  );
}
