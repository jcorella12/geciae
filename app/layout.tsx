import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  weight: ["400", "500", "600", "700"],
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  weight: ["400", "500"],
});

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
  return (
    <html lang="es-MX" suppressHydrationWarning>
      <body
        className={cn(
          inter.variable,
          jetbrainsMono.variable,
          "min-h-screen bg-background font-sans text-foreground antialiased",
        )}
      >
        {children}
      </body>
    </html>
  );
}
