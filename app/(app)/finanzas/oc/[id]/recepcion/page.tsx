import Link from "next/link";
import { notFound } from "next/navigation";

import {
  obtenerVinculos,
  puedeCrearOCEn,
} from "@/lib/auth/permisos";
import { ESTADOS_OC } from "@/lib/oc/state";
import { createClient } from "@/lib/supabase/server";

import { RecepcionForm } from "./recepcion-form";

export default async function RecepcionOCPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();
  const vinculos = await obtenerVinculos();

  const { data: oc } = await supabase
    .from("ordenes_compra")
    .select(
      "id, numero, estado, empresa_id, total, proveedores(razon_social), empresas(codigo, nombre_comercial), fecha_emision, fecha_entrega_esperada, fecha_entrega_real",
    )
    .eq("id", params.id)
    .maybeSingle();
  if (!oc) notFound();

  const puedeRecibir = puedeCrearOCEn(vinculos, oc.empresa_id);

  const { data: conceptos } = await supabase
    .from("ordenes_compra_conceptos")
    .select(
      "id, orden, descripcion, cantidad, cantidad_recibida, unidad_sat, precio_unitario",
    )
    .eq("oc_id", params.id)
    .order("orden");

  const conceptosNorm = (conceptos ?? []).map((c) => ({
    id: c.id,
    orden: c.orden,
    descripcion: c.descripcion,
    cantidad: Number(c.cantidad),
    cantidad_recibida: Number(c.cantidad_recibida ?? 0),
    unidad_sat: c.unidad_sat,
    precio_unitario: Number(c.precio_unitario),
  }));

  const estadoOc = oc.estado ?? "borrador";
  const estado = ESTADOS_OC.find((s) => s.value === estadoOc) ?? ESTADOS_OC[0];

  const yaCerrada = estadoOc === "pagada" || estadoOc === "cancelada";
  const noAprobadaAun =
    estadoOc === "borrador" || estadoOc === "pendiente_aprobacion";

  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-8">
      <div className="mb-6">
        <Link
          href={`/finanzas/oc/${oc.id}`}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← {oc.numero}
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold leading-tight">
            Recepción de mercancía
          </h1>
          <span
            className={`rounded-full px-3 py-0.5 text-xs ${estado.color}`}
          >
            {estado.label}
          </span>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          {oc.proveedores?.razon_social} · {oc.empresas?.codigo}
          {oc.fecha_entrega_esperada && (
            <>
              {" · "}Entrega esperada{" "}
              {new Date(oc.fecha_entrega_esperada).toLocaleDateString("es-MX")}
            </>
          )}
          {oc.fecha_entrega_real && (
            <>
              {" · "}
              <strong>
                Recibida{" "}
                {new Date(oc.fecha_entrega_real).toLocaleDateString("es-MX")}
              </strong>
            </>
          )}
        </p>
      </div>

      {noAprobadaAun ? (
        <div className="rounded-lg border border-warning/40 bg-warning/10 p-4 text-sm">
          <p className="font-medium">OC en estado {estado.label}.</p>
          <p className="mt-1 text-muted-foreground">
            La recepción se habilita cuando la OC esté <strong>aprobada</strong>{" "}
            o enviada al proveedor.
          </p>
        </div>
      ) : !puedeRecibir ? (
        <div className="rounded-lg border border-warning/40 bg-warning/10 p-4 text-sm">
          <p className="font-medium">Sin permiso para registrar recepción.</p>
          <p className="mt-1 text-muted-foreground">
            Requiere rol CEO, Director u Operativo en la empresa solicitante.
          </p>
        </div>
      ) : (
        <RecepcionForm
          ocId={oc.id}
          conceptos={conceptosNorm}
          puedeEditar={!yaCerrada}
        />
      )}
    </div>
  );
}
