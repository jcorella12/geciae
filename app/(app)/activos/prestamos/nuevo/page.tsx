import Link from "next/link";
import { redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { obtenerVinculos } from "@/lib/auth/permisos";
import { createClient } from "@/lib/supabase/server";

import { solicitarPrestamo } from "../actions";

export default async function NuevoPrestamoPage() {
  const supabase = createClient();
  const v = await obtenerVinculos();
  const empresasUsuario = Array.from(new Set(v.map((vi) => vi.empresa_id)));

  const { data: empresas } = await supabase
    .from("empresas")
    .select("id, codigo, razon_social, nombre_comercial")
    .in("id", empresasUsuario)
    .eq("activa", true)
    .order("codigo");

  const { data: activos } = (await supabase
    .from("v_activos_grupo_enriquecido" as never)
    .select("id, codigo, nombre, tipo, tarifa_vigente, unidad_uso, empresa_propietaria_codigo, estado")
    .eq("estado", "disponible")
    .order("codigo")) as unknown as {
    data: Array<{
      id: string;
      codigo: string;
      nombre: string;
      tipo: string;
      tarifa_vigente: number;
      unidad_uso: string;
      empresa_propietaria_codigo: string;
    }> | null;
  };

  async function action(formData: FormData) {
    "use server";
    const r = await solicitarPrestamo(formData);
    if (r.ok && r.id) redirect(`/activos/prestamos/${r.id}`);
    if (r.error) throw new Error(r.error);
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-8">
      <div className="mb-6">
        <Link href="/activos/prestamos" className="text-sm text-muted-foreground hover:text-foreground">
          ← Préstamos
        </Link>
        <h1 className="mt-2 text-2xl font-semibold leading-tight">Nueva solicitud de préstamo</h1>
      </div>

      <form action={action} className="space-y-5">
        <section className="rounded-lg border border-border bg-card p-5 shadow-sm">
          <h2 className="mb-3 text-base font-semibold">1. Empresa solicitante</h2>
          <select
            name="empresa_solicitante_id"
            required
            className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="">— Selecciona —</option>
            {(empresas ?? []).map((e) => (
              <option key={e.id} value={e.id}>
                {e.codigo} · {e.nombre_comercial ?? e.razon_social}
              </option>
            ))}
          </select>
        </section>

        <section className="rounded-lg border border-border bg-card p-5 shadow-sm">
          <h2 className="mb-3 text-base font-semibold">2. Activo a solicitar</h2>
          <select
            name="activo_id"
            required
            className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="">— Selecciona —</option>
            {(activos ?? []).map((a) => (
              <option key={a.id} value={a.id}>
                {a.codigo} · {a.nombre} · ({a.empresa_propietaria_codigo}) · ${Number(a.tarifa_vigente).toLocaleString("es-MX")}/{a.unidad_uso}
              </option>
            ))}
          </select>
        </section>

        <section className="rounded-lg border border-border bg-card p-5 shadow-sm">
          <h2 className="mb-3 text-base font-semibold">3. Datos del préstamo</h2>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-sm">Recogida prevista *</Label>
              <Input name="fecha_recogida_prevista" type="date" required />
            </div>
            <div>
              <Label className="text-sm">Devolución prevista *</Label>
              <Input name="fecha_devolucion_prevista" type="date" required />
            </div>
            <div className="col-span-2">
              <Label className="text-sm">Uso estimado (horas/días/etc.)</Label>
              <Input name="uso_estimado" type="number" step="0.01" min="0" />
            </div>
            <div className="col-span-2">
              <Label className="text-sm">Motivo *</Label>
              <textarea
                name="motivo"
                required
                rows={3}
                placeholder="Ej. Levantamiento de planta solar Cliente X, semana del 10 al 15 mayo"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
          </div>
        </section>

        <div className="flex justify-end gap-2">
          <Link href="/activos/prestamos">
            <Button type="button" variant="outline">Cancelar</Button>
          </Link>
          <Button type="submit">Solicitar préstamo</Button>
        </div>
      </form>
    </div>
  );
}
