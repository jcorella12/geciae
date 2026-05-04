export type ProveedorState = {
  ok: boolean;
  error: string | null;
  fieldErrors?: Record<string, string[]>;
};

export const initialProveedorState: ProveedorState = {
  ok: false,
  error: null,
};
