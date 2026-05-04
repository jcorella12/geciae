import { Bell, CheckCheck } from "lucide-react";
import Link from "next/link";

import { createClient } from "@/lib/supabase/server";

import { MarcarTodasBtn, NotificationItem } from "./notification-list";

export const dynamic = "force-dynamic";

const SEVERIDAD_COLOR: Record<string, string> = {
  info: "border-info/30 bg-info-soft/40",
  warning: "border-warn/40 bg-warn-soft/40",
  danger: "border-danger/40 bg-danger-soft/40",
  success: "border-emerald-300 bg-emerald-50",
};

export default async function CentroNotificacionesPage({
  searchParams,
}: {
  searchParams: { filtro?: string };
}) {
  const supabase = createClient();
  const filtro = searchParams.filtro ?? "todas";

  let q = supabase
    .from("notificaciones")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);

  if (filtro === "no_leidas") q = q.eq("leida", false);
  if (filtro === "leidas") q = q.eq("leida", true);

  const { data: notifs } = await q;
  const lista = notifs ?? [];

  const { count: noLeidas } = await supabase
    .from("notificaciones")
    .select("id", { count: "exact", head: true })
    .eq("leida", false);

  // Agrupar por día
  const grupos = new Map<string, typeof lista>();
  for (const n of lista) {
    const fecha = new Date(n.created_at as string);
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const ayer = new Date(hoy);
    ayer.setDate(ayer.getDate() - 1);
    const f = new Date(fecha);
    f.setHours(0, 0, 0, 0);
    let label: string;
    if (f.getTime() === hoy.getTime()) label = "Hoy";
    else if (f.getTime() === ayer.getTime()) label = "Ayer";
    else
      label = fecha.toLocaleDateString("es-MX", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });
    if (!grupos.has(label)) grupos.set(label, []);
    grupos.get(label)!.push(n);
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-7">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-ink-3" />
            <h1 className="text-[24px] font-semibold leading-tight">
              Notificaciones
            </h1>
            {(noLeidas ?? 0) > 0 && (
              <span className="rounded-full bg-destructive px-2 py-0.5 text-[11px] font-semibold text-destructive-foreground">
                {noLeidas}
              </span>
            )}
          </div>
          <p className="mt-1 text-[13px] text-ink-3">
            Centro unificado de avisos: aprobaciones, asignaciones, vencimientos
            y eventos relevantes para ti.
          </p>
        </div>
        {(noLeidas ?? 0) > 0 && <MarcarTodasBtn />}
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-1.5">
        <Link
          href="/notificaciones"
          className={`rounded-full px-2.5 py-0.5 text-[11.5px] font-medium ${filtro === "todas" ? "bg-ink-1 text-bg-1" : "bg-bg-2 text-ink-2"}`}
        >
          Todas
        </Link>
        <Link
          href="/notificaciones?filtro=no_leidas"
          className={`rounded-full px-2.5 py-0.5 text-[11.5px] font-medium ${filtro === "no_leidas" ? "bg-ink-1 text-bg-1" : "bg-bg-2 text-ink-2"}`}
        >
          No leídas
        </Link>
        <Link
          href="/notificaciones?filtro=leidas"
          className={`rounded-full px-2.5 py-0.5 text-[11.5px] font-medium ${filtro === "leidas" ? "bg-ink-1 text-bg-1" : "bg-bg-2 text-ink-2"}`}
        >
          Leídas
        </Link>
      </div>

      {lista.length === 0 ? (
        <div className="rounded-md border border-dashed border-border bg-card p-12 text-center">
          <CheckCheck className="mx-auto h-8 w-8 text-ink-4" />
          <p className="mt-3 text-sm text-ink-3">
            {filtro === "no_leidas"
              ? "Todo al día — no tienes notificaciones sin leer."
              : "Sin notificaciones."}
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {Array.from(grupos.entries()).map(([dia, items]) => (
            <section key={dia}>
              <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-ink-3">
                {dia}
              </h2>
              <ul className="space-y-1.5">
                {items.map((n) => (
                  <NotificationItem
                    key={n.id}
                    notif={{
                      id: n.id,
                      tipo: n.tipo,
                      severidad: n.severidad,
                      titulo: n.titulo,
                      mensaje: n.mensaje,
                      url: n.url,
                      leida: n.leida,
                      created_at: n.created_at,
                    }}
                    severidadClass={SEVERIDAD_COLOR[n.severidad] ?? ""}
                  />
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
