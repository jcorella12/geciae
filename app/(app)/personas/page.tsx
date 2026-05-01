import { PlaceholderPage } from "@/components/shared/placeholder-page";

export default function PersonasPage() {
  return (
    <PlaceholderPage
      espacio="Personas"
      titulo="Catálogo de empleados y colaboradores"
      sprint="Sprint 2 (catálogo) + Sprint 7 (expediente básico)"
      resumen="Catálogo único de empleados con 3 categorías (planta, por obra, REPSE), expediente con captura IA y autoservicio para cada empleado."
      funcionalidades={[
        "Alta con IA leyendo INE/IFE (Sprint 3)",
        "Datos personales y laborales por categoría",
        "Asignaciones a empresas y proyectos",
        "Documentos del empleado (contrato individual escaneado)",
        "Mi expediente — vista de autoservicio por empleado",
        "Capacitaciones, evaluaciones, vacaciones, finiquitos → Fase 2",
      ]}
    />
  );
}
