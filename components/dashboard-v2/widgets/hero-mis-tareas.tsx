import { ListChecks } from "lucide-react";
import Link from "next/link";

import { createClient } from "@/lib/supabase/server";

export async function HeroMisTareas() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const hoy = new Date().toISOString().slice(0, 10);
  const en7 = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, count } = (await (supabase as any)
    .from("proyecto_tareas")
    .select("id, titulo, fecha_fin_planeada, proyecto_id", { count: "exact" })
    .eq("asignado_a", user.id)
    .in("estado", ["pendiente", "en_curso"])
    .lte("fecha_fin_planeada", en7)
    .order("fecha_fin_planeada", { ascending: true })
    .limit(8)) as unknown as {
    data:
      | {
          id: string;
          titulo: string;
          fecha_fin_planeada: string | null;
          proyecto_id: string;
        }[]
      | null;
    count: number | null;
  };

  const tareas = data ?? [];
  const atrasadas = tareas.filter(
    (t) => t.fecha_fin_planeada && t.fecha_fin_planeada < hoy,
  ).length;

  return (
    <div>
      <div className="flex items-center gap-1.5">
        <ListChecks className="h-3.5 w-3.5 text-ink-3" />
        <span className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-ink-3">
          Mis tareas pendientes
        </span>
      </div>
      <div className="mt-3 flex items-baseline gap-2">
        <span className="font-mono text-[28px] font-semibold leading-none tracking-[-0.02em] tnum">
          {count ?? 0}
        </span>
        <span className="text-[12px] font-medium text-ink-3">próximos 7 días</span>
      </div>
      {atrasadas > 0 && (
        <p className="mt-2 text-[11px] text-danger-deep">
          ⚠ {atrasadas} atrasada{atrasadas === 1 ? "" : "s"}
        </p>
      )}
      {tareas.length > 0 && (
        <ul className="mt-3 space-y-1 border-t border-border pt-2">
          {tareas.slice(0, 3).map((t) => (
            <li key={t.id}>
              <Link
                href={`/proyectos/${t.proyecto_id}?tab=tareas`}
                className="flex items-center justify-between gap-2 rounded px-1.5 py-1 hover:bg-bg-2"
              >
                <span className="line-clamp-1 text-[11px]">{t.titulo}</span>
                <span className="flex-shrink-0 text-[10.5px] text-ink-3">
                  {t.fecha_fin_planeada ?? "—"}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
