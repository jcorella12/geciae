"use server";

import { cookies } from "next/headers";

const THEME_COOKIE = "pse_theme";

export async function setTheme(theme: "light" | "dark" | "system") {
  cookies().set(THEME_COOKIE, theme, {
    httpOnly: false,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 365,
    path: "/",
  });
}
