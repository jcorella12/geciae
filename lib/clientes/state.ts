/**
 * Estado y tipos del flujo de clientes — separados de `actions.ts` porque
 * un archivo `"use server"` solo puede exportar funciones async.
 */

export type ClienteState = {
  ok: boolean;
  error: string | null;
  fieldErrors?: Record<string, string[]>;
};

export const initialClienteState: ClienteState = {
  ok: false,
  error: null,
};
