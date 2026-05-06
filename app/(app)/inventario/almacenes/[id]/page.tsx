import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { esCEO, esRolEn, obtenerVinculos } from "@/lib/auth/permisos";
import { createClient } from "@/lib/supabase/server";

import { AlmacenForm } from "../almacen-form";

export const dynamic = "force-dynamic";

export default async function EditarAlmacenPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();
  const v = await obtenerVinculos();

  const { data: alm } = await supabase
    .from("almacenes")
    .select("*")
    .eq("id", params.id)
    .maybeSingle();

  if (!alm) notFound();

  const puede =
    esCEO(v) || esRolEn(v, alm.empresa_id, ["director", "operativo"]);
  if (!puede) redirect("/inventario/almacenes");

  const empresasIds = Array.from(new Set(v.map((x) => x.empresa_id)));

  const [{ data: empresas }, { data: usuarios }, { data: stockSummary }] =
    await Promise.all([
      supabase
        .from("empresas")
        .select("id, codigo, razon_social, nombre_comercial")
        .in("id", empresasIds)
        .eq("activa", true)
        .order("codigo"),
      supabase
        .from("empleados")
        .select("usuario_id, nombre_completo")
        .in("empresa_id", empresasIds)
        .eq("activo", true)
        .not("usuario_id", "is", null)
        .order("nombre_completo"),
      supabase
        .from("inventario")
        .select("producto_id", { count: "exact", head: true })
        .eq("almacen_id", params.id),
    ]);

  const responsables = (usuarios ?? [])
    .filter((u) => u.usuario_id)
    .map((u) => ({
      id: u.usuario_id as string,
      nombre: u.nombre_completo as string,
    }));

  // Direccion JSONB → campos
  const dir = (alm.direccion ?? {}) as {
    calle?: string;
    ciudad?: string;
    estado?: string;
    cp?: string;
  };

  const productosCount = (stockSummary as unknown as { count?: number })?.count ?? 0;

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-8">
      <div className="mb-6">
        <Link
          href="/inventario/almacenes"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Almacenes
        </Link>
        <div className="mt-2 flex items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold leading-tight">
              <span className="font-mono text-[18px] text-ink-3">
                {alm.codigo as string}
              </span>{" "}
              · {alm.nombre as string}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {productosCount > 0
                ? `${productosCount} producto${productosCount === 1 ? "" : "s"} con stock en este almacén.`
                : "Sin productos con stock todavía."}
            </p>
          </div>
        </div>
      </div>

      <AlmacenForm
        empresas={empresas ?? []}
        responsables={responsables}
        almacenId={params.id}
        defaults={{
          empresa_id: alm.empresa_id as string,
          codigo: alm.codigo as string,
          nombre: alm.nombre as string,
          tipo: (alm.tipo as string) ?? "principal",
          responsable_id: (alm.responsable_id as string | null) ?? null,
          direccion_calle: dir.calle ?? null,
          direccion_ciudad: dir.ciudad ?? null,
          direccion_estado: dir.estado ?? null,
          direccion_cp: dir.cp ?? null,
          activo: Boolean(alm.activo),
        }}
      />
    </div>
  );
}
