import type { Vinculo } from "@/lib/auth/permisos";

export type ModoUsuario = "simple" | "avanzado";

const ATRIBUTOS_AVANZADOS = [
  "contralor",
  "tesorero_corporativo",
  "aprobador_financiero",
  "rh",
  "vendedor",
  "auditor_interno",
] as const;

/**
 * Detecta si el usuario debería usar modo simple o avanzado.
 * - Si hay preferencia explícita guardada, gana esa.
 * - Si no, según rol y atributos: ceo/director/operativo con atributos
 *   especiales → avanzado. Empleado base → simple.
 */
export function detectarModoUsuario(
  vinculos: Vinculo[],
  preferenciaExplicita: ModoUsuario | null = null,
): ModoUsuario {
  if (preferenciaExplicita) return preferenciaExplicita;

  const tieneAtribAvanzado = vinculos.some((v) =>
    (v.atributos ?? []).some((a) =>
      (ATRIBUTOS_AVANZADOS as readonly string[]).includes(a),
    ),
  );
  const esRolAvanzado = vinculos.some((v) =>
    ["ceo", "director", "operativo"].includes(v.rol),
  );

  return esRolAvanzado || tieneAtribAvanzado ? "avanzado" : "simple";
}
