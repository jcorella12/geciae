/**
 * Helpers para formatear fechas sin sufrir el bug clásico de timezone.
 *
 * Bug: `new Date("2026-05-08").toLocaleDateString("es-MX")` interpreta el
 * string como UTC midnight y al convertir a hora local en México (UTC-7)
 * muestra el día anterior (7 de mayo). Esto pasa con CUALQUIER columna DATE
 * de Postgres que el ORM serializa como "YYYY-MM-DD".
 *
 * Solución: parsear YYYY-MM-DD a Date(year, month-1, day) que usa hora
 * local, no UTC. Así la fecha se preserva sin shift.
 *
 * REGLA: para columnas DATE usa estos helpers. Para TIMESTAMPTZ está bien
 * `new Date(s).toLocaleDateString()` porque el ISO incluye timezone explícito.
 */

const MESES_CORTOS = [
  "ene",
  "feb",
  "mar",
  "abr",
  "may",
  "jun",
  "jul",
  "ago",
  "sep",
  "oct",
  "nov",
  "dic",
];

const MESES_LARGOS = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];

/** Convierte "YYYY-MM-DD" a {y, m, d} sin TZ shift. NULL si parsea falla. */
function parseISODate(s: string | null | undefined): { y: number; m: number; d: number } | null {
  if (!s) return null;
  // Soporta "2026-05-08" o "2026-05-08T..." (ignora la parte de tiempo)
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (!match) return null;
  const y = Number(match[1]);
  const m = Number(match[2]);
  const d = Number(match[3]);
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) {
    return null;
  }
  return { y, m, d };
}

/**
 * Formatea una fecha DATE de Postgres como "08 may 26".
 * Usa hora local, no UTC, así NO sufre el TZ shift bug.
 */
export function fmtFechaCorta(s: string | null | undefined): string {
  const p = parseISODate(s);
  if (!p) return "—";
  return `${String(p.d).padStart(2, "0")} ${MESES_CORTOS[p.m - 1]} ${String(p.y).slice(-2)}`;
}

/** Formatea como "8 de mayo de 2026". */
export function fmtFechaLarga(s: string | null | undefined): string {
  const p = parseISODate(s);
  if (!p) return "—";
  return `${p.d} de ${MESES_LARGOS[p.m - 1]} de ${p.y}`;
}

/** Formatea como "08/05/2026". */
export function fmtFechaNumerica(s: string | null | undefined): string {
  const p = parseISODate(s);
  if (!p) return "—";
  return `${String(p.d).padStart(2, "0")}/${String(p.m).padStart(2, "0")}/${p.y}`;
}

/** Convierte "YYYY-MM-DD" a Date local (hora 12:00 para evitar bordes de TZ). */
export function fechaLocalSegura(s: string | null | undefined): Date | null {
  const p = parseISODate(s);
  if (!p) return null;
  return new Date(p.y, p.m - 1, p.d, 12, 0, 0);
}
