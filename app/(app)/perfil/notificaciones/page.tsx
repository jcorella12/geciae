import Link from "next/link";

import {
  ETIQUETAS_CATEGORIA,
  TIPOS_NOTIFICACION,
  type CategoriaNotificacion,
} from "@/lib/notificaciones/catalogo";
import { createClient } from "@/lib/supabase/server";

import { TogglePreferencia } from "./toggle-preferencia";

export const dynamic = "force-dynamic";

export default async function NotificacionesPreferenciasPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return <div className="p-8">Sin sesión.</div>;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase as any)
    .from("notificaciones_preferencias")
    .select("tipo, recibir, email")
    .eq("usuario_id", user.id);

  const prefMap = new Map<string, { recibir: boolean; email: boolean }>();
  for (const p of (data ?? []) as Array<{
    tipo: string;
    recibir: boolean;
    email: boolean;
  }>) {
    prefMap.set(p.tipo, { recibir: p.recibir, email: p.email });
  }

  // Agrupar tipos por categoría
  const porCategoria = new Map<CategoriaNotificacion, typeof TIPOS_NOTIFICACION>();
  for (const t of TIPOS_NOTIFICACION) {
    const arr = porCategoria.get(t.categoria) ?? [];
    arr.push(t);
    porCategoria.set(t.categoria, arr);
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-8">
      <div className="mb-6">
        <Link
          href="/perfil"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Mi perfil
        </Link>
        <h1 className="mt-2 text-2xl font-semibold leading-tight">
          Preferencias de notificaciones
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Decide qué tipos de notificaciones quieres recibir. Por default todo
          está activo. Las desactivadas no entrarán a tu bandeja.
        </p>
      </div>

      <div className="space-y-5">
        {Array.from(porCategoria.entries()).map(([cat, tipos]) => (
          <section
            key={cat}
            className="rounded-lg border border-border bg-card p-5 shadow-sm"
          >
            <h2 className="mb-3 text-base font-semibold">
              {ETIQUETAS_CATEGORIA[cat]}
            </h2>
            <div className="space-y-2">
              {tipos.map((t) => {
                const pref = prefMap.get(t.tipo);
                const recibir = pref?.recibir ?? true;
                return (
                  <div
                    key={t.tipo}
                    className="flex items-start justify-between gap-3 border-b border-border/50 py-2 last:border-b-0"
                  >
                    <div className="flex-1">
                      <p className="text-[13px] font-medium">{t.nombre}</p>
                      <p className="text-[11.5px] text-ink-3">{t.descripcion}</p>
                    </div>
                    <TogglePreferencia tipo={t.tipo} initialRecibir={recibir} />
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </div>

      <p className="mt-6 text-center text-[11.5px] text-ink-3">
        Las notificaciones críticas de seguridad siempre se entregan, sin
        importar tu configuración.
      </p>
    </div>
  );
}
