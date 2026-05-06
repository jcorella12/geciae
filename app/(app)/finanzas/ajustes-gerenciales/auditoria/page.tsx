import Link from "next/link";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

const ACCION_LABEL: Record<string, string> = {
  visualizacion_lista: "Vio lista",
  visualizacion_detalle: "Vio detalle",
  visualizacion_dual: "Vio vista dual",
  crear: "Creó ajuste",
  actualizar: "Actualizó",
  cancelar: "Canceló",
  regularizar: "Regularizó",
  agregar_documento: "Subió documento",
  eliminar_documento: "Eliminó documento",
  exportar_excel: "Exportó Excel",
};

const ACCION_COLOR: Record<string, string> = {
  visualizacion_lista: "bg-bg-2 text-ink-2",
  visualizacion_detalle: "bg-bg-2 text-ink-2",
  visualizacion_dual: "bg-bg-2 text-ink-2",
  crear: "bg-emerald-100 text-emerald-800",
  actualizar: "bg-sky-100 text-sky-800",
  cancelar: "bg-red-100 text-red-800",
  regularizar: "bg-blue-100 text-blue-800",
  agregar_documento: "bg-emerald-50 text-emerald-700",
  eliminar_documento: "bg-red-50 text-red-700",
  exportar_excel: "bg-amber-100 text-amber-800",
};

export const dynamic = "force-dynamic";
export const metadata = { title: "Auditoría - Ajustes gerenciales" };

type AuditRow = {
  id: string;
  usuario_id: string;
  accion: string;
  ajuste_id: string | null;
  detalles: Record<string, unknown> | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
};

type EmailRow = { id: string; email: string | null };

export default async function AuditoriaPage() {
  const supabase = createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: esCeoData } = await (supabase as any).rpc("usuario_es_ceo");
  if (!esCeoData) redirect("/finanzas/ajustes-gerenciales");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: rows } = (await (supabase as any)
    .from("ajustes_gerenciales_audit")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200)) as unknown as { data: AuditRow[] | null };

  const usuarios = Array.from(new Set((rows ?? []).map((r) => r.usuario_id)));
  let emailsRaw: EmailRow[] | null = null;
  if (usuarios.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const r = (await (supabase as any)
      .schema("auth")
      .from("users")
      .select("id, email")
      .in("id", usuarios)) as unknown as { data: EmailRow[] | null };
    emailsRaw = r.data;
  }
  const emails = new Map(
    (emailsRaw ?? []).map((u) => [u.id, u.email ?? "?"]),
  );

  return (
    <div className="mx-auto w-full max-w-[1100px] px-8 py-7">
      <div className="mb-2">
        <Link
          href="/finanzas/ajustes-gerenciales"
          className="text-[12px] text-ink-3 hover:underline"
        >
          ← Volver a Ajustes gerenciales
        </Link>
      </div>
      <h1 className="text-[24px] font-semibold leading-tight">
        Auditoría — Ajustes gerenciales
      </h1>
      <p className="mt-1 text-[13px] text-ink-3">
        Visible solo para CEO. Últimas {(rows ?? []).length} entradas.
      </p>

      <div className="mt-6 overflow-x-auto rounded-md border border-border bg-card">
        <table className="w-full text-[12px]">
          <thead className="bg-bg-2 text-[10.5px] uppercase tracking-wide text-ink-3">
            <tr>
              <th className="px-3 py-2.5 text-left font-medium">Fecha</th>
              <th className="px-3 py-2.5 text-left font-medium">Usuario</th>
              <th className="px-3 py-2.5 text-left font-medium">Acción</th>
              <th className="px-3 py-2.5 text-left font-medium">Ajuste</th>
              <th className="px-3 py-2.5 text-left font-medium">IP</th>
            </tr>
          </thead>
          <tbody>
            {(rows ?? []).length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="p-12 text-center text-[13px] text-ink-3"
                >
                  Sin entradas en el log.
                </td>
              </tr>
            ) : (
              (rows ?? []).map((r) => (
                <tr key={r.id} className="border-t border-border hover:bg-bg-2/40">
                  <td className="px-3 py-2 font-mono text-[10.5px]">
                    {new Date(r.created_at).toLocaleString("es-MX")}
                  </td>
                  <td className="px-3 py-2 text-[11.5px]">
                    {emails.get(r.usuario_id) ?? r.usuario_id.slice(0, 8)}
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10.5px] font-medium ${
                        ACCION_COLOR[r.accion] ?? "bg-bg-2 text-ink-2"
                      }`}
                    >
                      {ACCION_LABEL[r.accion] ?? r.accion}
                    </span>
                  </td>
                  <td className="px-3 py-2 font-mono text-[10.5px] text-ink-2">
                    {r.ajuste_id ? (
                      <Link
                        href={`/finanzas/ajustes-gerenciales/${r.ajuste_id}`}
                        className="text-brand hover:underline"
                      >
                        {r.ajuste_id.slice(0, 8)}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-3 py-2 font-mono text-[10.5px] text-ink-3">
                    {r.ip_address ?? "—"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
