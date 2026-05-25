// Tipos y constantes para el form "Generar usuario para empleado".
// Vive aparte del actions.ts porque archivos con "use server" SOLO pueden
// exportar funciones async (Next.js valida esto en build y, peor, en runtime
// de prod tira "A 'use server' file can only export async functions").

export type GenerarUsuarioState = {
  ok: boolean;
  error: string | null;
  message: string | null;
};

export const initialGenerarUsuarioState: GenerarUsuarioState = {
  ok: false,
  error: null,
  message: null,
};
