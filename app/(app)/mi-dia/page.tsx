import { createClient } from "@/lib/supabase/server";
import { obtenerVinculosConEmpresa } from "@/lib/auth/permisos";

export const dynamic = "force-dynamic";

const codigoColor: Record<string, string> = {
  PSE: "bg-pse",
  CIAE: "bg-ciae",
  IED: "bg-ied",
  LIMSON: "bg-limson",
};

export default async function MiDiaPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const vinculos = await obtenerVinculosConEmpresa();
  const sinAcceso = vinculos.length === 0;

  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-10">
      <div className="mb-8">
        <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
          Mi día
        </p>
        <h1 className="mt-1 text-2xl font-semibold leading-tight">
          Hola{user?.email ? `, ${user.email.split("@")[0]}` : ""}.
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          ERP de GECIAE (Grupo Empresarial CIAE). Sprint 1 — la pantalla
          personalizada por rol llega cuando configuremos permisos. Por ahora
          ves tus empresas asignadas y datos básicos.
        </p>
      </div>

      {sinAcceso ? (
        <div className="rounded-lg border border-warning/40 bg-warning/10 p-4 text-sm">
          <p className="font-medium">No tienes empresas asignadas todavía.</p>
          <p className="mt-1 text-muted-foreground">
            Si eres el primer usuario, corre el bootstrap SQL del documento{" "}
            <code className="rounded bg-card px-1.5 py-0.5">
              docs/sprint-1-bootstrap.md
            </code>{" "}
            para asignarte rol CEO en las 4 empresas.
          </p>
        </div>
      ) : (
        <section>
          <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-muted-foreground">
            Tus empresas
          </h2>
          <ul className="grid gap-3 sm:grid-cols-2">
            {vinculos.map((v) => {
              const e = v.empresa;
              if (!e) return null;
              return (
                <li
                  key={v.empresa_id}
                  className="rounded-lg border border-border bg-card p-4 shadow-sm"
                >
                  <div className="flex items-start gap-3">
                    <span
                      className={`mt-1 inline-block h-3 w-3 shrink-0 rounded-full ${codigoColor[e.codigo] ?? "bg-muted-foreground"}`}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">
                        {e.nombre_comercial ?? e.razon_social}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {e.codigo} · {v.rol}
                        {v.puesto ? ` · ${v.puesto}` : ""}
                      </p>
                      {v.atributos.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {v.atributos.map((a) => (
                            <span
                              key={a}
                              className="rounded-full bg-secondary px-2 py-0.5 text-xs text-secondary-foreground"
                            >
                              {a}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}
