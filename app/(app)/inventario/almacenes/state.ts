// Tipo y constante del form de Almacenes.
// Separado de actions.ts porque archivos "use server" SOLO pueden exportar
// funciones async (Next.js falla en runtime de prod con
// "A 'use server' file can only export async functions, found object").

export type AlmacenState = {
  ok: boolean;
  id: string | null;
  error: string | null;
};

export const initialAlmacenState: AlmacenState = {
  ok: false,
  id: null,
  error: null,
};
