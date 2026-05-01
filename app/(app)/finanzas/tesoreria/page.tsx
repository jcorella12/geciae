import { PlaceholderPage } from "@/components/shared/placeholder-page";

export default function TesoreriaPage() {
  return (
    <PlaceholderPage
      espacio="Administración y Finanzas · Tesorería"
      titulo="Posición consolidada y créditos inter-compañías"
      sprint="Sprint 5 (semanas 10-11)"
      resumen="Tesorería transversal del grupo: posición consolidada en tiempo real, líneas revolventes entre empresas, cálculo diario de intereses con TIIE+6%."
      funcionalidades={[
        "Posición consolidada del grupo (CEO + atributo tesorero_corporativo)",
        "Líneas revolventes inter-compañías con aprobación por umbrales",
        "Cálculo diario de intereses devengados (TIIE 28 + 6%, no capitaliza)",
        "Matriz mensual inter-compañías generada automáticamente",
        "Conciliación bancaria con importación CSV/XLSX",
        "Sincronización TIIE diaria con Banxico",
      ]}
    />
  );
}
