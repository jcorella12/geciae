import { NextResponse, type NextRequest } from "next/server";

import { updateSession } from "@/lib/supabase/middleware";

/**
 * Rutas accesibles sin autenticación.
 * `/auth/*` cubre callback y signout. `/portal-cliente` y `/portal-proveedor`
 * tendrán su propio flujo de magic link en Fase 2.
 */
const PUBLIC_PREFIXES = [
  "/login",
  "/auth",
  "/healthz",
  "/portal-cliente",
  "/portal-proveedor",
];

function isPublic(pathname: string) {
  return PUBLIC_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
}

export async function middleware(request: NextRequest) {
  const { response, user } = await updateSession(request);
  const { pathname } = request.nextUrl;

  // Root: redirige según estado auth.
  if (pathname === "/") {
    const url = request.nextUrl.clone();
    url.pathname = user ? "/mi-dia" : "/login";
    return NextResponse.redirect(url);
  }

  // Rutas privadas sin sesión → /login con `next` para volver después.
  if (!user && !isPublic(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|sw.js|workbox-.*|.*\\.(?:png|jpg|jpeg|svg|gif|webp|ico)$).*)",
  ],
};
