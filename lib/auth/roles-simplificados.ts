import {
  esCEO,
  tieneAtributo,
  type Vinculo,
} from "@/lib/auth/permisos";

/**
 * Modelo de 3 roles (decisión CEO 2026-06-10) — fase 1: capa de visibilidad.
 *
 * La empresa son ~25 personas en 4 empresas del mismo dueño. El sistema viejo
 * (5 roles base × 8 atributos × umbrales × NavCaps) es de corporativo. Se
 * colapsa a 3 roles con filosofía deny-list: todos usan casi todo, solo se
 * oculta una lista corta (finanzas para operativo; salarios para no-rh;
 * configuración/admin para no-directivo).
 *
 * IMPORTANTE: esta es la capa de VISIBILIDAD (UI), retrocompatible. Mapea los
 * roles viejos (ceo/director/empleado/operativo) + atributos a uno de los 3
 * roles nuevos EN RUNTIME, sin tocar el enum de la BD ni los datos. La
 * migración que cambia el enum/datos/RLS va aparte (archivo, se aplica con
 * revisión) — mientras tanto este mapeo deja todo funcionando.
 */
export type RolSimplificado = "directivo" | "administrativo" | "operativo";

/**
 * Deriva el rol simplificado de los vínculos del usuario:
 *  - directivo: CEO/director de cualquier empresa, o atributo contralor /
 *    tesorero_corporativo (se fusionan en directivo).
 *  - administrativo: no directivo, con atributo financiero/rh
 *    (aprobador_financiero o rh) → equipo de oficina/finanzas.
 *  - operativo: el resto (técnicos, cuadrillas, vendedores).
 */
export function rolSimplificado(vinculos: Vinculo[]): RolSimplificado {
  if (
    esCEO(vinculos) ||
    vinculos.some((v) => v.rol === "director") ||
    tieneAtributo(vinculos, "contralor") ||
    tieneAtributo(vinculos, "tesorero_corporativo")
  ) {
    return "directivo";
  }
  if (
    // Modelo nuevo (post-migración ROLES F2): el rol ya es autoritativo.
    vinculos.some((v) => v.rol === "administrativo") ||
    tieneAtributo(vinculos, "aprobador_financiero") ||
    tieneAtributo(vinculos, "rh") ||
    // Un operativo "de oficina" (PM/vendedor con función de captura financiera)
    // no se distingue por rol viejo; los atributos arriba lo cubren. Sin
    // atributo, cae a operativo (más restrictivo) — correcto por defecto.
    false
  ) {
    return "administrativo";
  }
  return "operativo";
}

/**
 * ¿El usuario ve datos sensibles de nómina/salarios de OTROS empleados?
 * Solo directivo y la etiqueta `rh`. (Cada quien ve lo suyo en su perfil.)
 */
export function veSalariosDeOtros(vinculos: Vinculo[]): boolean {
  return (
    rolSimplificado(vinculos) === "directivo" ||
    tieneAtributo(vinculos, "rh")
  );
}

/**
 * Secciones de navegación gateadas por la deny-list. Todo lo que NO está aquí
 * es visible para los 3 roles (filosofía "en duda, abierto").
 */
export type SeccionRestringida = "finanzas" | "administracion";

/**
 * ¿El rol puede ver una sección restringida?
 *  - finanzas (OC/OT/CFDI/tesorería/gastos/cumplimiento/finanzas-grupo):
 *    directivo y administrativo. Oculto para operativo (excepto sus propias
 *    OC/solicitudes, que se filtran a nivel de página/RLS).
 *  - administracion (configuración, gestión de usuarios, ajustes gerenciales,
 *    /admin): solo directivo.
 */
export function visibleParaRol(
  rol: RolSimplificado,
  seccion: SeccionRestringida,
): boolean {
  switch (seccion) {
    case "finanzas":
      return rol === "directivo" || rol === "administrativo";
    case "administracion":
      return rol === "directivo";
    default:
      return true;
  }
}

export const ETIQUETA_ROL_SIMPLIFICADO: Record<RolSimplificado, string> = {
  directivo: "Directivo",
  administrativo: "Administrativo",
  operativo: "Operativo",
};
