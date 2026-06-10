import Link from "next/link";
import { redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  esCEO,
  obtenerVinculos,
} from "@/lib/auth/permisos";
import { createClient } from "@/lib/supabase/server";

import { crearActivo } from "../actions";
import { ActivoFields } from "../activo-fields";

export default async function NuevoActivoPage() {
  const supabase = createClient();
  const v = await obtenerVinculos();
  const puede =
    esCEO(v) ||
    v.some(
      (vi) =>
        
        (vi.rol === "director" || (vi.atributos ?? []).includes("contralor")),
    );
  if (!puede) redirect("/activos/compartidos");

  const empresasIds = Array.from(new Set(v.map((x) => x.empresa_id)));
  const { data: empresas } = await supabase
    .from("empresas")
    .select("id, codigo, razon_social, nombre_comercial")
    .in("id", empresasIds)
    .eq("activa", true)
    .order("codigo");

  async function action(formData: FormData) {
    "use server";
    const r = await crearActivo({ ok: false, id: null, error: null }, formData);
    if (r.ok && r.id) redirect(`/activos/compartidos/${r.id}`);
    if (r.error) throw new Error(r.error);
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-8">
      <div className="mb-6">
        <Link href="/activos/compartidos" className="text-sm text-muted-foreground hover:text-foreground">
          ← Activos compartidos
        </Link>
        <h1 className="mt-2 text-2xl font-semibold leading-tight">Nuevo activo compartido</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          La tarifa se calcula automáticamente: depreciación + mantenimiento + 12% admin / uso anual.
        </p>
      </div>

      <form action={action} className="space-y-6">
        <ActivoFields empresas={empresas ?? []} />

        <div className="flex justify-end gap-2">
          <Link href="/activos/compartidos">
            <Button type="button" variant="outline">
              Cancelar
            </Button>
          </Link>
          <Button type="submit">Crear activo</Button>
        </div>
      </form>
    </div>
  );
}
