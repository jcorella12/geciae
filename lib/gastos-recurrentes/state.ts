// Tipos compartidos para Gastos Recurrentes (sin "use server").

export type GastoState = {
  ok: boolean;
  error: string | null;
  id: string | null;
};

export const initialGastoState: GastoState = {
  ok: false,
  error: null,
  id: null,
};
