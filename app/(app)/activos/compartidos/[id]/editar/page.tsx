import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import { esCEO, obtenerVinculos } from "@/lib/auth/permisos";
import { createClient } from "@/lib/supabase/server";

import { actualizarActivo } from "../../actions";
import { ActivoFields, type ActivoDefaults } from "../../activo-fields";

export const metadata = { title: "Editar activo compartido · PSE ERP" };

export default async function EditarActivoPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();
  const v = await obtenerVinculos();

  // Cargar el activo de la tabla base (todas las columnas editables; la vista
  // enriquecida no las trae todas).
  const { data: activo } = (await supabase
    .from("activos_grupo" as never)
    .select("*")
    .eq("id", params.id)
    .maybeSingle()) as unknown as { data: (ActivoDefaults & {
    empresa_propietaria_id: string;
  }) | null };
  if (!activo) notFound();

  // Gate: CEO, director o contralor de la empresa propietaria.
  const puede =
    esCEO(v) ||
    v.some(
      (vi) =>
        vi.empresa_id === activo.empresa_propietaria_id &&
        (vi.rol === "director" || (vi.atributos ?? []).includes("contralor")),
    );
  if (!puede) redirect(`/activos/compartidos/${params.id}`);

  // Empresas donde el usuario puede ubicar el activo (para el selector).
  const empresasIds = Array.from(new Set(v.map((x) => x.empresa_id)));
  const { data: empresas } = await supabase
    .from("empresas")
    .select("id, codigo, razon_social, nombre_comercial")
    .in("id", empresasIds)
    .eq("activa", true)
    .order("codigo");

  async function action(formData: FormData) {
    "use server";
    const r = await actualizarActivo(params.id, formData);
    if (r.ok) redirect(`/activos/compartidos/${params.id}`);
    if (r.error) throw new Error(r.error);
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-8">
      <div className="mb-6">
        <Link
          href={`/activos/compartidos/${params.id}`}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← {activo.codigo} · {activo.nombre}
        </Link>
        <h1 className="mt-2 text-2xl font-semibold leading-tight">
          Editar activo compartido
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          La tarifa se recalcula automáticamente al guardar. El costo de
          adquisición solo lo puede cambiar el CEO.
        </p>
      </div>

      <form action={action} className="space-y-6">
        <ActivoFields empresas={empresas ?? []} defaults={activo} />

        <div className="flex justify-end gap-2">
          <Link href={`/activos/compartidos/${params.id}`}>
            <Button type="button" variant="outline">
              Cancelar
            </Button>
          </Link>
          <Button type="submit">Guardar cambios</Button>
        </div>
      </form>
    </div>
  );
}
