/**
 * Helpers para detectar el "rol Mi Día" del usuario actual.
 * Esto NO es un permiso de seguridad — solo afecta qué widgets ver primero.
 */
import type { Vinculo } from "./permisos";

export type RolMiDia =
  | "ceo"             // CEO o tesorero corporativo → vista ejecutiva multi-empresa
  | "pm"              // Director/operativo → project manager (default)
  | "residente"       // Empleado con supervisor_cuadrilla → residente obra
  | "admin"           // Empleado con tesorero_corporativo → administración
  | "almacenista"     // Operativo de inventario / supervisor → almacén
  | "rrhh"            // Empleado con atributo rh → recursos humanos
  | "empleado";       // default cualquier otro empleado

export function detectarRolMiDia(vinculos: Vinculo[]): RolMiDia {
  if (vinculos.length === 0) return "empleado";

  // CEO / directivo siempre vista ejecutiva
  if (vinculos.some((v) => v.rol === "ceo" || v.rol === "directivo"))
    return "ceo";

  // Tesorero corporativo o aprobador financiero → admin
  if (
    vinculos.some(
      (v) =>
        (v.atributos ?? []).includes("tesorero_corporativo") ||
        (v.atributos ?? []).includes("aprobador_financiero"),
    )
  ) {
    return "admin";
  }

  // Supervisor de cuadrilla → residente
  if (
    vinculos.some((v) =>
      (v.atributos ?? []).includes("supervisor_cuadrilla"),
    )
  ) {
    return "residente";
  }

  // Atributo RH → recursos humanos
  if (vinculos.some((v) => (v.atributos ?? []).includes("rh"))) {
    return "rrhh";
  }

  // Director / operativo / administrativo → PM (la vista por defecto que ya hay)
  if (
    vinculos.some(
      (v) =>
        v.rol === "director" ||
        v.rol === "operativo" ||
        v.rol === "administrativo",
    )
  ) {
    return "pm";
  }

  return "empleado";
}

export const ETIQUETA_ROL_MI_DIA: Record<RolMiDia, string> = {
  ceo: "Vista ejecutiva",
  pm: "Project Manager",
  residente: "Residente de obra",
  admin: "Administración",
  almacenista: "Almacén",
  rrhh: "Recursos Humanos",
  empleado: "Empleado",
};
