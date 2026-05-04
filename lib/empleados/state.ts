export type EmpleadoState = {
  ok: boolean;
  error: string | null;
  fieldErrors?: Record<string, string[]>;
};

export const initialEmpleadoState: EmpleadoState = {
  ok: false,
  error: null,
};
