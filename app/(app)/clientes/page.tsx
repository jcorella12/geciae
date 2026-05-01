import { PlaceholderPage } from "@/components/shared/placeholder-page";

export default function ClientesPage() {
  return (
    <PlaceholderPage
      espacio="Comercial y Clientes"
      titulo="Catálogo de clientes"
      sprint="Sprint 2 (semanas 4-5) y Sprint 3 (IA en semanas 6-7)"
      resumen="Catálogo único de clientes del grupo (transversal entre las 4 empresas). Alta manual primero, alta con IA (lectura de CSF/INE) en Sprint 3."
      funcionalidades={[
        "Alta manual con datos fiscales (RFC, régimen, CP, dirección)",
        "Alta con IA leyendo CSF / INE / acta constitutiva (Sprint 3)",
        "Validación periódica contra lista 69-B del SAT",
        "Expediente del cliente: contactos, contratos, proyectos, CFDI",
        "CRM completo con pipeline y portal cliente → Fase 2",
      ]}
    />
  );
}
