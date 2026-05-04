import Link from "next/link";

import { obtenerVinculos } from "@/lib/auth/permisos";
import { createClient } from "@/lib/supabase/server";

import { TicketForm } from "./ticket-form";

export default async function NuevoTicketPage() {
  const supabase = createClient();
  const v = await obtenerVinculos();
  const empresasIds = Array.from(new Set(v.map((x) => x.empresa_id)));

  const [{ data: empresas }, { data: clientes }, { data: proyectos }] =
    await Promise.all([
      supabase
        .from("empresas")
        .select("id, codigo, razon_social, nombre_comercial")
        .in("id", empresasIds)
        .eq("activa", true)
        .order("codigo"),
      supabase
        .from("clientes")
        .select("id, razon_social, rfc, nombre_comercial")
        .eq("activo", true)
        .order("razon_social")
        .limit(200),
      supabase
        .from("proyectos")
        .select("id, codigo, nombre, empresa_id")
        .in("empresa_id", empresasIds)
        .eq("activo", true)
        .order("codigo"),
    ]);

  // Empleados con cuenta de auth
  const { data: candidatosRaw } = await supabase
    .from("empleados")
    .select("usuario_id, nombre_completo, puesto, empresa_id")
    .not("usuario_id", "is", null)
    .eq("activo", true)
    .order("nombre_completo");
  // usuario_id ya está garantizado not null por el .not(...) above; lo narramos en TS.
  const candidatos = (candidatosRaw ?? []).filter(
    (c): c is typeof c & { usuario_id: string } => c.usuario_id !== null,
  );

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-8">
      <div className="mb-6">
        <Link
          href="/soporte/tickets"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Tickets
        </Link>
        <h1 className="mt-2 text-2xl font-semibold leading-tight">
          Nuevo ticket
        </h1>
      </div>
      <TicketForm
        empresas={empresas ?? []}
        clientes={clientes ?? []}
        proyectos={proyectos ?? []}
        candidatos={candidatos}
      />
    </div>
  );
}
