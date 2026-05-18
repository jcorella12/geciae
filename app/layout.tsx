import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { cookies } from "next/headers";
import "./globals.css";
import { SWRegister } from "@/components/shared/sw-register";
import { ConfirmHost } from "@/components/ui/confirm";
import { NotifyHost } from "@/components/ui/notify";
import { PromptInputHost } from "@/components/ui/prompt-input";
import { SIDEBAR_COOKIE } from "@/lib/preferences/sidebar-state";
import { cn } from "@/lib/utils";

const THEME_COOKIE = "pse_theme";

export const metadata: Metadata = {
  title: {
    default: "ERP GECIAE",
    template: "%s · ERP GECIAE",
  },
  description:
    "Sistema ERP integrado de GECIAE (Grupo Empresarial CIAE) — operación, finanzas, comercial, calidad y personas para PSENERGIA, CIAE, IED y Limson.",
  applicationName: "ERP GECIAE",
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  themeColor: "#1E3A5F",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // Tema desde cookie — aplicado en SSR para evitar flash en oscuro
  const themeCookie = cookies().get(THEME_COOKIE)?.value;
  const isDark = themeCookie === "dark";
  // Sidebar colapsado desde cookie — aplicado en SSR para evitar layout shift
  const sidebarCollapsed = cookies().get(SIDEBAR_COOKIE)?.value === "1";

  return (
    <html
      lang="es-MX"
      suppressHydrationWarning
      data-density="comfy"
      data-theme={isDark ? "dark" : undefined}
      data-sidebar={sidebarCollapsed ? "collapsed" : undefined}
      className={cn(
        GeistSans.variable,
        GeistMono.variable,
        isDark && "dark",
      )}
      style={{
        fontFeatureSettings: "'rlig' 1, 'calt' 1",
      }}
    >
      <body className="min-h-screen bg-background font-sans text-foreground antialiased">
        {children}
        <ConfirmHost />
        <NotifyHost />
        <PromptInputHost />
        <SWRegister />
      </body>
    </html>
  );
}
