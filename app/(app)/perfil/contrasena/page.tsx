import { KeyRound, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

import { CambiarContrasenaForm } from "./cambiar-contrasena-form";

export const dynamic = "force-dynamic";

export default async function CambiarContrasenaPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-6 py-8 space-y-6">
      <div>
        <Link
          href="/perfil"
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          ← Volver a mi perfil
        </Link>
        <h1 className="mt-2 flex items-center gap-2 text-2xl font-semibold leading-tight">
          <KeyRound className="h-6 w-6" />
          Restablecer contraseña
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Cambia tu contraseña de acceso al ERP. La nueva contraseña debe tener
          al menos 8 caracteres.
        </p>
      </div>

      <section className="rounded-lg border border-border bg-card p-5 shadow-sm">
        <CambiarContrasenaForm email={user.email ?? ""} />
      </section>

      <section className="rounded-md border border-info/30 bg-info/10 p-4 text-xs">
        <p className="flex items-center gap-1.5 font-medium">
          <ShieldCheck className="h-3.5 w-3.5" />
          Recomendaciones de seguridad
        </p>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-muted-foreground">
          <li>
            Usa al menos 12 caracteres, combinando mayúsculas, minúsculas,
            números y símbolos.
          </li>
          <li>
            No reutilices contraseñas de otros sistemas (correo personal, banca,
            etc.).
          </li>
          <li>
            Si tienes acceso a roles sensibles (CEO, tesorero, aprobador
            financiero), activa MFA en tu perfil.
          </li>
        </ul>
      </section>
    </div>
  );
}
