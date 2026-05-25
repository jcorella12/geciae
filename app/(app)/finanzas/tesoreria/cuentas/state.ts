// Tipos y constantes del form de Cuentas bancarias.
// Aparte del actions.ts porque archivos con "use server" SOLO pueden exportar
// funciones async (Next.js falla en runtime de prod con
// "A 'use server' file can only export async functions, found object").

export type CuentaState = {
  ok: boolean;
  error: string | null;
};

export const initialCuentaState: CuentaState = { ok: false, error: null };
