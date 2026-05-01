import { PlaceholderPage } from "@/components/shared/placeholder-page";

export default function ProyectosPage() {
  return (
    <PlaceholderPage
      espacio="Operación de Proyectos"
      titulo="Lista de proyectos"
      sprint="Sprint 7 (semana 14)"
      resumen="Versión básica del espacio: lista, detalle con General/Documentos/Resumen financiero, y asociación de OC, OT y CFDI al proyecto."
      funcionalidades={[
        "Lista de proyectos con filtros básicos por empresa y estado",
        "Detalle del proyecto con tabs General, Documentos (carga manual), Resumen financiero",
        "Asociar OC y OT al proyecto",
        "Cierre manual de proyecto",
        "Gantt detallado, Kanban, bitácora digital y PWA de campo → Fase 2",
      ]}
    />
  );
}
