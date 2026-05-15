// Tipos y constantes compartidas entre el server actions y el cliente.
// Se separa de `actions.ts` porque "use server" solo permite exportar
// funciones async.

export type CursoResult = {
  ok: boolean;
  error: string | null;
};

export const MODALIDADES = [
  { value: "presencial", label: "Presencial" },
  { value: "online", label: "Online" },
  { value: "mixto", label: "Mixto" },
] as const;

export const ESTADOS_FINALIZACION = [
  { value: "completado", label: "Completado" },
  { value: "reprobado", label: "Reprobado" },
  { value: "no_asistio", label: "No asistió" },
] as const;

export const ESTADOS_ASIGNACION_LABELS: Record<string, string> = {
  inscrito: "Inscrito",
  en_proceso: "En proceso",
  completado: "Completado",
  reprobado: "Reprobado",
  no_asistio: "No asistió",
};
