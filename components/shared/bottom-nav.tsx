"use client";

import { Bell, FolderKanban, Home, Menu, Search } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/mi-dia", icon: Home, label: "Inicio" },
  { href: "/proyectos", icon: FolderKanban, label: "Proyectos" },
  { href: "#search", icon: Search, label: "Buscar", isAction: true },
  { href: "/notificaciones", icon: Bell, label: "Avisos" },
  { href: "#more", icon: Menu, label: "Más", isAction: true },
];

export function BottomNav() {
  const pathname = usePathname();

  function handleAction(href: string) {
    if (href === "#search") {
      // Disparar atajo ⌘K
      const event = new KeyboardEvent("keydown", {
        key: "k",
        ctrlKey: true,
        metaKey: true,
        bubbles: true,
      });
      window.dispatchEvent(event);
    } else if (href === "#more") {
      // Mostrar/ocultar sidebar mobile
      document.documentElement.classList.toggle("sidebar-mobile-open");
    }
  }

  return (
    <nav
      aria-label="Navegación inferior"
      className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-card md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="grid grid-cols-5">
        {ITEMS.map((item) => {
          const Icon = item.icon;
          const active = !item.isAction && pathname.startsWith(item.href);

          if (item.isAction) {
            return (
              <button
                key={item.href}
                type="button"
                onClick={() => handleAction(item.href)}
                className="flex flex-col items-center gap-0.5 py-2 text-[10px] text-ink-3"
              >
                <Icon className="h-5 w-5" />
                <span>{item.label}</span>
              </button>
            );
          }
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-0.5 py-2 text-[10px]",
                active ? "text-brand" : "text-ink-3",
              )}
            >
              <Icon className={cn("h-5 w-5", active && "text-brand")} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
