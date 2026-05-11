import Link from "next/link";

import {
  esCEO,
  obtenerVinculos,
  puedeRestablecerContrasenas,
} from "@/lib/auth/permisos";
import { createAdminClient } from "@/lib/supabase/admin";

import { InvitarForm } from "./invitar-form";
import { ResetPasswordDialog } from "./reset-password-dialog";

export const dynamic = "force-dynamic";

const codigoColor: Record<string, string> = {
  PSE: "bg-pse",
  CIAE: "bg-ciae",
  IED: "bg-ied",
  LIMSON: "bg-limson",
};

export default async function UsuariosPage() {
  // CEO ve todo; contralor entra solo para restablecer contraseñas.
  const vinculosCaller = await obtenerVinculos();
  const esCeo = esCEO(vinculosCaller);
  const puedeReset = puedeRestablecerContrasenas(vinculosCaller);
  if (!esCeo && !puedeReset) {
    return null;
  }

  const admin = createAdminClient();

  // Cargar todos los auth.users.
  const { data: usersData, error: usersErr } =
    await admin.auth.admin.listUsers({ perPage: 1000 });
  if (usersErr) {
    return (
      <div className="rounded-md border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
        Error cargando usuarios: {usersErr.message}
      </div>
    );
  }

  // Cargar todas las empresas (admin bypassea RLS, OK).
  const { data: empresas } = await admin
    .from("empresas")
    .select("id, codigo, razon_social, nombre_comercial")
    .eq("activa", true)
    .order("codigo");

  // Cargar todos los vínculos activos con empresa.
  const { data: vinculos } = await admin
    .from("usuarios_empresas")
    .select(
      "usuario_id, rol, atributos, puesto, activo, empresas(codigo, razon_social, nombre_comercial)",
    )
    .eq("activo", true);

  // Agrupar vínculos por usuario_id.
  const vinculosPorUsuario = new Map<string, typeof vinculos>();
  for (const v of vinculos ?? []) {
    const existing = vinculosPorUsuario.get(v.usuario_id) ?? [];
    existing.push(v);
    vinculosPorUsuario.set(v.usuario_id, existing);
  }

  const filas = usersData.users
    .map((u) => ({
      id: u.id,
      email: u.email ?? "(sin correo)",
      created_at: u.created_at,
      last_sign_in_at: u.last_sign_in_at ?? null,
      vinculos: vinculosPorUsuario.get(u.id) ?? [],
    }))
    .sort((a, b) => a.email.localeCompare(b.email));

  return (
    <div className="space-y-8">
      {esCeo ? (
        <InvitarForm empresas={empresas ?? []} />
      ) : (
        <div className="rounded-md border border-info/30 bg-info/10 px-4 py-3 text-[12.5px] text-foreground">
          Como <span className="font-medium">contralor</span>, puedes
          restablecer contraseñas de cualquier usuario para resolver problemas
          de acceso. Las altas, vínculos y desactivaciones siguen siendo
          responsabilidad del CEO.
        </div>
      )}

      <section>
        <h2 className="mb-3 text-base font-semibold">
          Usuarios del sistema ({filas.length})
        </h2>

        <div className="overflow-x-auto rounded-lg border border-border bg-card shadow-sm">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-secondary/50">
              <tr className="text-left">
                <th className="px-4 py-2 font-medium">Correo</th>
                <th className="px-4 py-2 font-medium">Empresas y rol</th>
                <th className="px-4 py-2 font-medium">Atributos</th>
                <th className="px-4 py-2 font-medium">Último login</th>
                {puedeReset && (
                  <th className="px-4 py-2 text-right font-medium">Acciones</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filas.map((u) => {
                const todosAtributos = Array.from(
                  new Set(
                    (u.vinculos ?? []).flatMap((v) => v.atributos ?? []),
                  ),
                );
                return (
                  <tr key={u.id} className="align-top hover:bg-secondary/30">
                    <td className="px-4 py-3 font-medium">
                      {esCeo ? (
                        <Link
                          href={`/configuracion/usuarios/${u.id}/edit`}
                          className="hover:text-primary hover:underline"
                        >
                          {u.email}
                        </Link>
                      ) : (
                        <span>{u.email}</span>
                      )}
                      {u.vinculos?.length === 0 && (
                        <span className="ml-2 rounded-full bg-warning/20 px-2 py-0.5 text-xs text-foreground">
                          sin vínculos
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {u.vinculos && u.vinculos.length > 0 ? (
                        <ul className="space-y-1">
                          {u.vinculos.map((v, i) => (
                            <li
                              key={i}
                              className="flex items-center gap-2 text-xs"
                            >
                              <span
                                className={`inline-block h-2 w-2 rounded-full ${
                                  codigoColor[v.empresas?.codigo ?? ""] ??
                                  "bg-muted-foreground"
                                }`}
                              />
                              <span className="font-medium">
                                {v.empresas?.codigo}
                              </span>
                              <span className="text-muted-foreground">
                                · {v.rol}
                                {v.puesto ? ` · ${v.puesto}` : ""}
                              </span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          —
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {todosAtributos.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {todosAtributos.map((a) => (
                            <span
                              key={a}
                              className="rounded-full bg-secondary px-2 py-0.5 text-xs"
                            >
                              {a}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          —
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {u.last_sign_in_at
                        ? new Date(u.last_sign_in_at).toLocaleString("es-MX")
                        : "Nunca"}
                    </td>
                    {puedeReset && (
                      <td className="px-4 py-3 text-right">
                        <ResetPasswordDialog
                          usuarioId={u.id}
                          email={u.email}
                        />
                      </td>
                    )}
                  </tr>
                );
              })}
              {filas.length === 0 && (
                <tr>
                  <td
                    colSpan={puedeReset ? 5 : 4}
                    className="px-4 py-6 text-center text-sm text-muted-foreground"
                  >
                    Sin usuarios.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
