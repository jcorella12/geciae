import { Folder } from "lucide-react";
import Link from "next/link";

import { createClient } from "@/lib/supabase/server";

export async function HeroMisProyectos() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = (await (supabase as any)
    .from("proyectos")
    .select("id, codigo, nombre, estado, fecha_fin_planeado")
    .eq("pm_id", user.id)
    .in("estado", ["planeacion", "en_ejecucion", "en_cierre"])
    .order("fecha_fin_planeado", { ascending: true })
    .limit(8)) as unknown as {
    data:
      | {
          id: string;
          codigo: string;
          nombre: string;
          estado: string;
          fecha_fin_planeado: string | null;
        }[]
      | null;
  };

  const proyectos = data ?? [];

  return (
    <div>
      <div className="flex items-center gap-1.5">
        <Folder className="h-3.5 w-3.5 text-ink-3" />
        <span className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-ink-3">
          Mis proyectos activos
        </span>
        <span className="ml-auto font-mono text-[11px] text-ink-3 tnum">
          {proyectos.length}
        </span>
      </div>
      {proyectos.length === 0 ? (
        <p className="mt-3 text-[12.5px] text-ink-3">
          No tienes proyectos asignados.
        </p>
      ) : (
        <ul className="mt-2 space-y-1">
          {proyectos.map((p) => (
            <li key={p.id}>
              <Link
                href={`/proyectos/${p.id}`}
                className="flex items-center justify-between gap-2 rounded px-2 py-1.5 hover:bg-bg-2"
              >
                <div className="min-w-0 flex-1">
                  <span className="font-mono text-[10.5px] text-ink-3">{p.codigo}</span>{" "}
                  <span className="truncate text-[11.5px] font-medium">{p.nombre}</span>
                </div>
                <span className="flex-shrink-0 text-[10.5px] text-ink-3">
                  {p.fecha_fin_planeado ?? "—"}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
