import { Shield } from "lucide-react";
import Link from "next/link";

import { esCEO, obtenerVinculos } from "@/lib/auth/permisos";
import { createAdminClient } from "@/lib/supabase/admin";

import { UmbralesTabla, type AprobadorFila } from "./tabla";

export const dynamic = "force-dynamic";

export default async function UmbralesPage() {
  const vinculos = await obtenerVinculos();
  if (!esCEO(vinculos)) {
    return (
      <div className="rounded-md border border-amber-300 bg-amber-50 p-4 text-sm">
        Solo el CEO puede ver y modificar la matriz de umbrales de
        aprobación.
      </div>
    );
  }

  const admin = createAdminClient();

  // Cargar TODOS los vínculos activos con atributo aprobador_financiero,
  // junto con datos del usuario y de la empresa.
  const { data: rows, error } = await admin
    .from("usuarios_empresas")
    .select(
      "usuario_id, empresa_id, rol, atributos, configuracion_atributos, puesto, empresas(codigo, nombre_comercial)",
    )
    .eq("activo", true);

  if (error) {
    return (
      <div className="rounded-md border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
        Error cargando umbrales: {error.message}
      </div>
    );
  }

  // Filtrar a aprobadores. CEO se incluye (siempre aprueba sin umbral) pero
  // se muestra al final con nota — útil de saber para la lista pero no
  // editable.
  const aprobadores = (rows ?? []).filter(
    (r) =>
      r.rol === "ceo" || (r.atributos ?? []).includes("aprobador_financiero"),
  );

  // Resolver emails vía admin.listUsers (no se puede join directo desde
  // usuarios_empresas hacia auth.users).
  const userIds = Array.from(new Set(aprobadores.map((r) => r.usuario_id)));
  const { data: usersData } = await admin.auth.admin.listUsers({
    perPage: 1000,
  });
  const emailByUserId = new Map<string, string>();
  for (const u of usersData.users) {
    if (userIds.includes(u.id)) {
      emailByUserId.set(u.id, u.email ?? "(sin correo)");
    }
  }

  const filas: AprobadorFila[] = aprobadores
    .map((r) => {
      const cfg =
        (r.configuracion_atributos as {
          aprobador_financiero?: {
            umbral_max_mxn_oc?: number | null;
            umbral_max_mxn_ot?: number | null;
            umbral_max_mxn_prestamo?: number | null;
          };
        } | null) ?? {};
      const umb = cfg.aprobador_financiero ?? {};
      return {
        usuarioId: r.usuario_id,
        email: emailByUserId.get(r.usuario_id) ?? "—",
        empresaId: r.empresa_id,
        empresaCodigo: r.empresas?.codigo ?? "?",
        empresaNombre:
          r.empresas?.nombre_comercial ?? r.empresas?.codigo ?? "?",
        rol: r.rol,
        puesto: r.puesto,
        esCeo: r.rol === "ceo",
        umbralOc: umb.umbral_max_mxn_oc ?? null,
        umbralOt: umb.umbral_max_mxn_ot ?? null,
        umbralPrestamo: umb.umbral_max_mxn_prestamo ?? null,
      };
    })
    .sort((a, b) => {
      // CEOs al final
      if (a.esCeo !== b.esCeo) return a.esCeo ? 1 : -1;
      // Por empresa, luego por email
      if (a.empresaCodigo !== b.empresaCodigo) {
        return a.empresaCodigo.localeCompare(b.empresaCodigo);
      }
      return a.email.localeCompare(b.email);
    });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-semibold">
            <Shield className="h-5 w-5" />
            Umbrales de aprobación financiera
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Quién puede aprobar qué hasta qué monto, por empresa. Vista
            consolidada para revisar y ajustar topes sin entrar usuario por
            usuario.
          </p>
        </div>
        <Link
          href="/configuracion/usuarios"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Usuarios
        </Link>
      </div>

      <div className="rounded-md border border-info/30 bg-info/10 p-3 text-[12.5px]">
        <p>
          <strong>Cómo funciona:</strong> al crear una OC / OT inter-co /
          préstamo inter-co, el sistema busca quién en la empresa puede
          aprobar ese monto. Un umbral vacío = sin límite. CEO siempre
          aprueba sin tope. Para asignar/quitar el atributo{" "}
          <code className="font-mono">aprobador_financiero</code> a alguien,
          edítalo desde su{" "}
          <Link
            href="/configuracion/usuarios"
            className="text-brand hover:underline"
          >
            ficha de usuario
          </Link>
          .
        </p>
      </div>

      <UmbralesTabla filas={filas} />
    </div>
  );
}
