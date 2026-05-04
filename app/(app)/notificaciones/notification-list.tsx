"use client";

import { Check } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { Button } from "@/components/ui/button";
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

const fmtHora = (iso: string) =>
  new Date(iso).toLocaleTimeString("es-MX", {
    hour: "2-digit",
    minute: "2-digit",
  });

export function NotificationItem({
  notif,
  severidadClass,
}: {
  notif: Notif;
  severidadClass: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const onClick = async () => {
    if (!notif.leida) {
      void fetch("/api/notificaciones", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [notif.id] }),
      });
    }
    if (notif.url) {
      startTransition(() => {
        router.push(notif.url!);
      });
    } else {
      router.refresh();
    }
  };

  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        disabled={pending}
        className={cn(
          "flex w-full items-start gap-3 rounded-md border-l-4 px-3 py-2.5 text-left transition hover:bg-bg-2/50",
          severidadClass || "border-border bg-card",
          notif.leida && "opacity-60",
        )}
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p
              className={cn(
                "text-[13px] leading-tight",
                !notif.leida && "font-semibold",
              )}
            >
              {notif.titulo}
            </p>
            <span className="shrink-0 text-[10.5px] text-ink-3">
              {fmtHora(notif.created_at)}
            </span>
          </div>
          {notif.mensaje && (
            <p className="mt-0.5 text-[12px] text-ink-2">{notif.mensaje}</p>
          )}
          <p className="mt-1 text-[10px] uppercase tracking-wide text-ink-4">
            {notif.tipo.replace(/_/g, " ")}
          </p>
        </div>
        {notif.leida && <Check className="mt-1 h-3.5 w-3.5 text-ink-4" />}
      </button>
    </li>
  );
}

export function MarcarTodasBtn() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const onClick = async () => {
    await fetch("/api/notificaciones", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ todas: true }),
    });
    startTransition(() => router.refresh());
  };

  return (
    <Button onClick={onClick} disabled={pending} variant="outline" size="sm">
      <Check className="h-3.5 w-3.5" />
      Marcar todas leídas
    </Button>
  );
}
