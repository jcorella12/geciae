import { PlaceholderPage } from "@/components/shared/placeholder-page";

export default function CalidadPage() {
  return (
    <PlaceholderPage
      espacio="Calidad y Cumplimiento"
      titulo="Sistema de Gestión de Calidad (SGC)"
      sprint="Fase 1.5 (meses 4-6)"
      resumen="SGC para certificación ISO 9001 de PSENERGIA — Levantamiento Técnico y Diseño. Auditorías internas, no conformidades, repositorio de procedimientos e indicadores."
      funcionalidades={[
        "Configuración del SGC y alcance de certificación",
        "Repositorio de procedimientos con versionado",
        "Programación y ejecución de auditorías internas",
        "Registro y seguimiento de no conformidades",
        "Indicadores de procesos y revisiones por la dirección",
        "Coordinador de calidad y auditor interno tienen acceso (atributos)",
      ]}
    />
  );
}
