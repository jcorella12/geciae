import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import {
  esCEO,
  esRolEn,
  obtenerVinculos,
} from "@/lib/auth/permisos";
import {
  COLOR_TIPO_BONO,
  ETIQUETA_TIPO_BONO,
  type TipoBonoManual,
} from "@/lib/portal-empleado/state";
import { createClient } from "@/lib/supabase/server";

import { NuevoBonoForm } from "./nuevo-bono-form";

export const dynamic = "force-dynamic";

function fmt(n: number) {
  return `$${Number(n).toLocaleString("es-MX", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export default async function BonosEmpleadoPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();
  const v = await obtenerVinculos();

  const { data: empleado } = await supabase
    .from("empleados")
    .select("id, empresa_id, nombre_completo, numero_empleado, puesto, usuario_id")
    .eq("id", params.id)
    .maybeSingle();
  if (!empleado) notFound();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const esDuenio = user && empleado.usuario_id === user.id;
  const puedeVer =
    esDuenio || esCEO(v) || esRolEn(v, empleado.empresa_id, "director");
  if (!puedeVer) redirect("/mi-dia");

  const puedeEditar = esCEO(v) || esRolEn(v, empleado.empresa_id, "director");

  const { data: bonos } = await supabase
    .from("empleado_bonos_manuales")
    .select(
      "id, fecha_pago, tipo, concepto, monto, motivo, timbrado, comprobante_url, autorizado_por",
    )
    .eq("empleado_id", params.id)
    .order("fecha_pago", { ascending: false });

  const lista = bonos ?? [];
  const total = lista.reduce((a, b) => a + Number(b.monto), 0);
  const anioActual = new Date().getFullYear();
  const totalAnioActual = lista
    .filter((b) => (b.fecha_pago ?? "").startsWith(`${anioActual}-`))
    .reduce((a, b) => a + Number(b.monto), 0);

  return (
    <div className="mx-auto w-full max-w-4xl px-6 py-8 space-y-6">
      <div>
        <Link
          href={`/personas/${params.id}`}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← {empleado.nombre_completo}
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">
          Bonos manuales — {empleado.nombre_completo}
        </h1>
        <p className="text-sm text-muted-foreground">
          Bonos en efectivo NO timbrados. Visibles para el empleado en su
          portal.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Stat label={`Total ${anioActual}`} value={fmt(totalAnioActual)} />
        <Stat label="Total histórico" value={fmt(total)} />
        <Stat label="Cantidad bonos" value={String(lista.length)} />
      </div>

      {puedeEditar && <NuevoBonoForm empleadoId={params.id} />}

      <section>
        <h2 className="mb-3 text-base font-semibold">
          Histórico ({lista.length})
        </h2>
        <div className="overflow-x-auto rounded-lg border border-border bg-card shadow-sm">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-secondary/50">
              <tr className="text-left">
                <th className="px-4 py-2 font-medium">Fecha</th>
                <th className="px-4 py-2 font-medium">Tipo</th>
                <th className="px-4 py-2 font-medium">Concepto</th>
                <th className="px-4 py-2 text-right font-medium">Monto</th>
                <th className="px-4 py-2 font-medium">Timbrado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {lista.map((b) => {
                const tipo = b.tipo as TipoBonoManual;
                return (
                  <tr key={b.id} className="hover:bg-secondary/30">
                    <td className="px-4 py-2 font-mono text-xs">
                      {b.fecha_pago}
                    </td>
                    <td className="px-4 py-2">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs ${COLOR_TIPO_BONO[tipo]}`}
                      >
                        {ETIQUETA_TIPO_BONO[tipo]}
                      </span>
                    </td>
                    <td className="px-4 py-2">
                      {b.concepto}
                      {b.motivo && (
                        <p className="text-xs text-muted-foreground">
                          {b.motivo}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-2 text-right font-mono tabular-nums">
                      {fmt(Number(b.monto))}
                    </td>
                    <td className="px-4 py-2 text-xs">
                      {b.timbrado ? (
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-emerald-700">
                          Sí
                        </span>
                      ) : (
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-amber-700">
                          No
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {lista.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-8 text-center text-sm text-muted-foreground"
                  >
                    Sin bonos.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-card px-4 py-3 shadow-sm">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 font-mono text-lg font-semibold tabular-nums">
        {value}
      </p>
    </div>
  );
}
