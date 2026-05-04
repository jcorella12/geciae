/**
 * Constantes y tipos de la preferencia de sidebar.
 *
 * Vive aparte de las server actions para no violar la regla "use server"
 * (donde solo se pueden exportar funciones async).
 */

export const SIDEBAR_COOKIE = "sidebar_collapsed";

export const SIDEBAR_COOKIE_OPTS = {
  httpOnly: false as const,
  sameSite: "lax" as const,
  path: "/",
  maxAge: 60 * 60 * 24 * 365, // 1 año
};
