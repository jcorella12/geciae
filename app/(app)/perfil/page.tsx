import { createClient } from "@/lib/supabase/server";

import { MfaSection } from "./mfa-section";

export const dynamic = "force-dynamic";

export default async function PerfilPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: factorsData } = await supabase.auth.mfa.listFactors();
  const totpFactor = factorsData?.totp?.[0] ?? null;

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-8">
      <div className="mb-6">
        <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
          Mi perfil
        </p>
        <h1 className="mt-1 text-2xl font-semibold leading-tight">
          {user.email}
        </h1>
      </div>

      <section className="rounded-lg border border-border bg-card p-5 shadow-sm">
        <h2 className="text-base font-semibold">Cuenta</h2>
        <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <dt className="text-muted-foreground">Correo</dt>
          <dd className="font-medium">{user.email}</dd>
          <dt className="text-muted-foreground">ID</dt>
          <dd className="font-mono text-xs">{user.id}</dd>
          <dt className="text-muted-foreground">Creado</dt>
          <dd>{new Date(user.created_at).toLocaleString("es-MX")}</dd>
          <dt className="text-muted-foreground">Último login</dt>
          <dd>
            {user.last_sign_in_at
              ? new Date(user.last_sign_in_at).toLocaleString("es-MX")
              : "—"}
          </dd>
        </dl>
      </section>

      <MfaSection
        existingFactor={
          totpFactor
            ? {
                id: totpFactor.id,
                friendlyName: totpFactor.friendly_name ?? null,
                status: totpFactor.status,
              }
            : null
        }
      />
    </div>
  );
}
