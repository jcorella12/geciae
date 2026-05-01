import { PlaceholderPage } from "@/components/shared/placeholder-page";

export default function ReportesPage() {
  return (
    <PlaceholderPage
      espacio="Reportes y BI"
      titulo="Reportes financieros y operativos"
      sprint="Sprint 8 (semana 15)"
      resumen="Salidas para CEO, contralor y contador externo. Estado de resultados por empresa, posición consolidada y paquete mensual XML para CONTPAQi."
      funcionalidades={[
        "Estado de resultados básico por empresa",
        "Posición consolidada del grupo (4 empresas)",
        "Antigüedad de cuentas por cobrar y por pagar",
        "Paquete mensual XML para CONTPAQi (contador externo)",
        "Conciliación bancaria con importación CSV/XLSX",
        "BI completo con dashboards interactivos → Fase 3",
      ]}
    />
  );
}
