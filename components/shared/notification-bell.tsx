"use client";

import { Bell, Check } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";

import { cn } from "@/lib/utils";

type Notif = {
  id: string;
  tipo: string;
  severidad: string;
  titulo: string;
  mensaje: string | null;
  url: string | null;
  leida: boolean;
  created_at: string;
};

const severidadStyle: Record<string, string> = {
  info: "border-info/30 bg-info/5",
  warning: "border-warning/40 bg-warning/5",
  danger: "border-destructive/40 bg-destructive/5",
  success: "border-success/40 bg-success/5",
};

export function NotificationBell() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [noLeidas, setNoLeidas] = useState(0);
  const [lista, setLista] = useState<Notif[]>([]);
  const [loading, setLoading] = useState(false);
  const [, startTransition] = useTransition();
  const containerRef = useRef<HTMLDivElement>(null);

  // Fetch initial count
  useEffect(() => {
    void fetchCount();
    const t = setInterval(fetchCount, 60_000); // cada 60s
    return () => clearInterval(t);
  }, []);

  // Cerrar al click fuera
  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    function onEsc(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onEsc);
    };
  }, [open]);

  async function fetchCount() {
    try {
      const res = await fetch("/api/notificaciones?solo_no_leidas=true");
      if (!res.ok) return;
      const data = (await res.json()) as { no_leidas: number };
      setNoLeidas(data.no_leidas);
    } catch {
      // silenciar
    }
  }

  async function abrirYcargar() {
    if (!open) {
      setOpen(true);
      setLoading(true);
      try {
        const res = await fetch("/api/notificaciones");
        if (res.ok) {
          const data = (await res.json()) as {
            notificaciones: Notif[];
            no_leidas: number;
          };
          setLista(data.notificaciones);
          setNoLeidas(data.no_leidas);
        }
      } finally {
        setLoading(false);
      }
    } else {
      setOpen(false);
    }
  }

  async function marcarLeida(n: Notif) {
    if (!n.leida) {
      void fetch("/api/notificaciones", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [n.id] }),
      }).then(() => setNoLeidas((c) => Math.max(0, c - 1)));
      setLista((prev) =>
        prev.map((x) => (x.id === n.id ? { ...x, leida: true } : x)),
      );
    }
    if (n.url) {
      setOpen(false);
      startTransition(() => router.push(n.url!));
    }
  }

  async function marcarTodasLeidas() {
    void fetch("/api/notificaciones", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ todas: true }),
    });
    setLista((prev) => prev.map((x) => ({ ...x, leida: true })));
    setNoLeidas(0);
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={abrirYcargar}
        className="relative inline-flex h-9 w-9 items-center justify-center rounded-md hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label={`Notificaciones (${noLeidas} no leídas)`}
      >
        <Bell className="h-4 w-4" />
        {noLeidas > 0 && (
          <span className="absolute right-0.5 top-0.5 inline-flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-destructive-foreground">
            {noLeidas > 99 ? "99+" : noLeidas}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-80 overflow-hidden rounded-lg border border-border bg-card shadow-lg sm:w-96">
          <div className="flex items-center justify-between border-b border-border px-3 py-2">
            <p className="text-sm font-semibold">
              Notificaciones
              {noLeidas > 0 && (
                <span className="ml-1 text-xs text-muted-foreground">
                  ({noLeidas} sin leer)
                </span>
              )}
            </p>
            {noLeidas > 0 && (
              <button
                type="button"
                onClick={marcarTodasLeidas}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Marcar todas leídas
              </button>
            )}
          </div>

          <a
            href="/notificaciones"
            className="block border-b border-border px-3 py-1.5 text-center text-[11px] text-brand hover:bg-bg-2"
          >
            Ver todas →
          </a>

          <div className="max-h-[60vh] overflow-y-auto">
            {loading ? (
              <p className="px-4 py-6 text-center text-sm text-muted-foreground">
                Cargando…
              </p>
            ) : lista.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-muted-foreground">
                Sin notificaciones.
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {lista.map((n) => (
                  <li key={n.id}>
                    <button
                      type="button"
                      onClick={() => marcarLeida(n)}
                      className={cn(
                        "flex w-full items-start gap-2 border-l-2 px-3 py-3 text-left text-sm transition-colors hover:bg-secondary/50",
                        severidadStyle[n.severidad] ?? "border-l-border",
                        n.leida && "opacity-60",
                      )}
                    >
                      <div className="min-w-0 flex-1">
                        <p
                          className={cn(
                            "truncate text-sm",
                            !n.leida && "font-medium",
                          )}
                        >
                          {n.titulo}
                        </p>
                        {n.mensaje && (
                          <p className="mt-0.5 truncate text-xs text-muted-foreground">
                            {n.mensaje}
                          </p>
                        )}
                        <p className="mt-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                          {new Date(n.created_at).toLocaleString("es-MX", {
                            dateStyle: "short",
                            timeStyle: "short",
                          })}
                        </p>
                      </div>
                      {n.leida && <Check className="h-3 w-3 text-muted-foreground" />}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
