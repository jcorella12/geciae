import Link from "next/link";
import { notFound } from "next/navigation";

import {
  obtenerVinculos,
  puedeGestionarProveedores,
} from "@/lib/auth/permisos";
import { TIPOS_DOCUMENTO_PROVEEDOR } from "@/lib/proveedores/docs";
import { createClient } from "@/lib/supabase/server";

import { DocRow, type DocItem } from "./doc-row";
import { DocUploader } from "./doc-uploader";
import { Validador69B } from "./validador-69b";

const semaforoBadge: Record<string, string> = {
  verde: "bg-success/15 text-success",
  amarillo: "bg-warning/15 text-foreground",
  rojo: "bg-destructive/15 text-destructive",
  negro: "bg-foreground/10 text-foreground",
};

export default async function DocumentacionProveedorPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();
  const vinculos = await obtenerVinculos();
  const puedeGestionar = puedeGestionarProveedores(vinculos);

  const { data: prov } = await supabase
    .from("proveedores")
    .select("id, razon_social, rfc, semaforo, requiere_repse, activo")
    .eq("id", params.id)
    .maybeSingle();

  if (!prov) notFound();

  const { data: docs } = await supabase
    .from("proveedores_documentacion")
    .select(
      "id, tipo_documento, url_archivo, fecha_emision, fecha_vencimiento, numero_referencia, observaciones, fecha_validacion, created_at, activo",
    )
    .eq("proveedor_id", params.id)
    .eq("activo", true)
    .order("created_at", { ascending: false });

  // Estado por tipo: ¿qué tipos requeridos faltan?
  const tiposCargados = new Set(
    (docs ?? []).map((d) => d.tipo_documento),
  );
  const requeridos = TIPOS_DOCUMENTO_PROVEEDOR.filter(
    (t) =>
      t.value !== "otro" &&
      t.value !== "lista_69b" &&
      (t.general || prov.requiere_repse),
  );
  const faltantes = requeridos.filter((t) => !tiposCargados.has(t.value));

  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-8">
      <div className="mb-6">
        <Link
          href={`/finanzas/proveedores/${prov.id}`}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← {prov.razon_social}
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold leading-tight">
            Documentación
          </h1>
          <span
            className={`rounded-full px-3 py-0.5 text-xs ${
              semaforoBadge[prov.semaforo ?? "verde"] ?? "bg-secondary"
            }`}
          >
            Semáforo: {prov.semaforo ?? "verde"}
          </span>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Sube los documentos del proveedor con sus fechas de vencimiento. El
          semáforo se calcula automáticamente: <strong>rojo</strong> si algún
          doc está vencido, <strong>amarillo</strong> si vence en 30 días o
          menos, <strong>verde</strong> si todo está al día.
        </p>
      </div>

      {faltantes.length > 0 && (
        <section className="mb-6 rounded-lg border border-warning/40 bg-warning/5 p-4 text-sm">
          <p className="font-medium">
            Faltan {faltantes.length} documento{faltantes.length === 1 ? "" : "s"} requerido{faltantes.length === 1 ? "" : "s"}:
          </p>
          <ul className="mt-1 list-disc pl-5 text-muted-foreground">
            {faltantes.map((t) => (
              <li key={t.value}>{t.label}</li>
            ))}
          </ul>
        </section>
      )}

      <section className="mb-6">
        <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-muted-foreground">
          Documentos cargados ({docs?.length ?? 0})
        </h2>
        {!docs || docs.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">
            Sin documentos. Sube el primero abajo.
          </div>
        ) : (
          <ul className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
            {docs.map((d) => (
              <DocRow
                key={d.id}
                doc={d as DocItem}
                proveedorId={prov.id}
                puedeGestionar={puedeGestionar}
              />
            ))}
          </ul>
        )}
      </section>

      {puedeGestionar && (
        <div className="space-y-4">
          <Validador69B proveedorId={prov.id} />
          <DocUploader
            proveedorId={prov.id}
            requiereRepse={prov.requiere_repse ?? false}
          />
        </div>
      )}
    </div>
  );
}
