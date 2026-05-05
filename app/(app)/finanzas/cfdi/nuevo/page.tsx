import Link from "next/link";

import { obtenerVinculos } from "@/lib/auth/permisos";
import { listarCentrosActivos } from "@/lib/centros/listar";
import { createClient } from "@/lib/supabase/server";

import { UploadCfdiForm } from "./upload-form";

export default async function NuevoCfdiPage() {
  const supabase = createClient();
  const v = await obtenerVinculos();
  const empresasUser = v.map((vi) => vi.empresa_id);
  const centros = await listarCentrosActivos();

  const [
    { data: empresas },
    { data: proveedores },
    { data: clientes },
    { data: ocs },
    { data: ots },
  ] = await Promise.all([
    supabase
      .from("empresas")
      .select("id, codigo, rfc, razon_social, nombre_comercial")
      .eq("activa", true)
      .in("id", empresasUser.length > 0 ? empresasUser : ["00000000-0000-0000-0000-000000000000"])
      .order("codigo"),
    supabase
      .from("proveedores")
      .select("id, rfc, razon_social")
      .eq("activo", true)
      .order("razon_social"),
    supabase
      .from("clientes")
      .select("id, rfc, razon_social")
      .eq("activo", true)
      .order("razon_social"),
    supabase
      .from("ordenes_compra")
      .select("id, numero, empresa_id, total, proveedor_id")
      .in("estado", ["aprobada", "enviada", "parcial_recibida", "recibida"])
      .order("fecha_emision", { ascending: false })
      .limit(200),
    supabase
      .from("ordenes_trabajo_inter_co")
      .select("id, numero, empresa_origen_id, empresa_destino_id, total")
      .in("estado", [
        "completada_origen",
        "confirmada_destino",
        "lista_cobrar",
        "facturada",
      ])
      .order("fecha_solicitud", { ascending: false })
      .limit(200),
  ]);

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-8">
      <div className="mb-6">
        <Link
          href="/finanzas/cfdi"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← CFDI
        </Link>
        <h1 className="mt-2 text-2xl font-semibold leading-tight">
          Registrar CFDI
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Sube el XML que el SAT timbró (desde tu PAC actual) y el sistema
          extrae automáticamente todos los datos. Más adelante se integrará el
          timbrado directo.
        </p>
      </div>

      <UploadCfdiForm
        empresas={(empresas ?? []) as never}
        proveedores={(proveedores ?? []).filter((p) => p.rfc) as never}
        clientes={(clientes ?? []) as never}
        ocs={(ocs ?? []) as never}
        ots={(ots ?? []) as never}
        centros={centros}
      />
    </div>
  );
}
