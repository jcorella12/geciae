"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

import { SIDEBAR_COOKIE, SIDEBAR_COOKIE_OPTS } from "./sidebar-state";

/**
 * Preferencia de colapso del sidebar.
 *
 * Se guarda en cookie para que el render server-side aplique el ancho correcto
 * desde el primer paint y evitar layout shift.
 */
export async function getSidebarCollapsed(): Promise<boolean> {
  const v = cookies().get(SIDEBAR_COOKIE)?.value;
  return v === "1";
}

export async function setSidebarCollapsed(collapsed: boolean): Promise<void> {
  cookies().set(SIDEBAR_COOKIE, collapsed ? "1" : "0", SIDEBAR_COOKIE_OPTS);
}

export async function toggleSidebar(): Promise<{ collapsed: boolean }> {
  const current = cookies().get(SIDEBAR_COOKIE)?.value === "1";
  const next = !current;
  cookies().set(SIDEBAR_COOKIE, next ? "1" : "0", SIDEBAR_COOKIE_OPTS);
  // Revalidamos la raíz para que el layout server-side relea la cookie y
  // emita el ancho correcto en la siguiente respuesta.
  revalidatePath("/", "layout");
  return { collapsed: next };
}
