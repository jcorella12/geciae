import Link from "next/link";
import { notFound } from "next/navigation";

import { Button } from "@/components/ui/button";
import { esCEO, obtenerVinculos } from "@/lib/auth/permisos";
import { createAdminClient } from "@/lib/supabase/admin";

import { AgregarVinculoForm } from "./agregar-form";
import { VinculoCard, type VinculoEditable } from "./vinculo-card";

export const dynamic = "force-dynamic";

export default async function EditUsuarioPage({
  params,
}: {
  params: { id: string };
}) {
  // Layout ya gate'a CEO, doble check.
  const callerVinculos = await obtenerVinculos();
  if (!esCEO(callerVinculos)) return null;

  const admin = createAdminClient();

  const { data: userResp, error: userErr } =
    await admin.auth.admin.getUserById(params.id);
  if (userErr || !userResp.user) notFound();
  const user = userResp.user;

  // Vínculos activos del usuario, con empresa.
  const { data: vinculos } = await admin
    .from("usuarios_empresas")
    .select(
      "empresa_id, rol, atributos, configuracion_atributos, puesto, activo, empresas(id, codigo, razon_social, nombre_comercial)",
    )
    .eq("usuario_id", params.id)
    .eq("activo", true)
    .order("empresas(codigo)" as never, { ascending: true });

  // Empresas no vinculadas (para "agregar otro vínculo").
  const { data: todasEmpresas } = await admin
    .from("empresas")
    .select("id, codigo, razon_social, nombre_comercial")
    .eq("activa", true)
    .order("codigo");

  const idsVinculadas = new Set((vinculos ?? []).map((v) => v.empresa_id));
  const empresasDisponibles = (todasEmpresas ?? []).filter(
    (e) => !idsVinculadas.has(e.id),
  );

  const vinculosUI: VinculoEditable[] = (vinculos ?? []).map((v) => ({
    usuarioId: params.id,
    empresaId: v.empresa_id,
    empresaCodigo: v.empresas?.codigo ?? "?",
    empresaNombre:
      v.empresas?.nombre_comercial ?? v.empresas?.razon_social ?? "?",
    rol: v.rol,
    atributos: v.atributos ?? [],
    puesto: v.puesto ?? null,
    configuracion_atributos:
      (v.configuracion_atributos as Record<string, unknown>) ?? {},
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link
            href="/configuracion/usuarios"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            ← Usuarios
          </Link>
          <h2 className="mt-2 text-xl font-semibold">{user.email}</h2>
          <p className="text-xs text-muted-foreground">
            ID:{" "}
            <code className="font-mono">{user.id}</code>
            {" · "}Creado: {new Date(user.created_at).toLocaleDateString("es-MX")}
            {" · "}Último login:{" "}
            {user.last_sign_in_at
              ? new Date(user.last_sign_in_at).toLocaleDateString("es-MX")
              : "Nunca"}
          </p>
        </div>

        <Button variant="outline" size="sm" asChild>
          <Link href="/configuracion/usuarios">Cerrar</Link>
        </Button>
      </div>

      <section>
        <h3 className="mb-3 text-sm font-medium uppercase tracking-wide text-muted-foreground">
          Vínculos activos ({vinculosUI.length})
        </h3>

        {vinculosUI.length === 0 ? (
          <p className="rounded-md border border-warning/40 bg-warning/10 p-4 text-sm">
            Este usuario no tiene vínculos activos. Vincúlalo a una empresa
            abajo para que pueda usar el sistema.
          </p>
        ) : (
          <div className="space-y-3">
            {vinculosUI.map((v) => (
              <VinculoCard key={v.empresaId} vinculo={v} />
            ))}
          </div>
        )}
      </section>

      <section>
        <AgregarVinculoForm
          usuarioId={params.id}
          empresasDisponibles={empresasDisponibles}
        />
      </section>
    </div>
  );
}
