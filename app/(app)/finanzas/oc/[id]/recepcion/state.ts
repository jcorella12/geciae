// Tipo y constante del form de Recepción de OC.
// Separado de actions.ts porque archivos "use server" SOLO pueden exportar
// funciones async (Next.js falla en runtime de prod con
// "A 'use server' file can only export async functions, found object").

export type RecepcionState = {
  ok: boolean;
  error: string | null;
};

export const initialRecepcionState: RecepcionState = {
  ok: false,
  error: null,
};
