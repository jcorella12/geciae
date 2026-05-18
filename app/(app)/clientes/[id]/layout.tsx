import { Pencil } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { BotonFavorito } from "@/components/ui/boton-favorito";
import { Button } from "@/components/ui/button";
import { obtenerVinculos, puedeGestionarClientes } from "@/lib/auth/permisos";
import { createClient } from "@/lib/supabase/server";

import { ClienteTabs } from "./tabs";
import { ToggleActivoButton } from "./toggle-activo";

export const dynamic = "force-dynamic";

const empresaCodigoColor: Record<string, string> = {
  PSE: "bg-pse",
  CIAE: "bg-ciae",
  IED: "bg-ied",
  LIMSON: "bg-limson",
};

const riesgoBadge: Record<string, string> = {
  bajo: "bg-success/15 text-success",
  medio: "bg-warning/15 text-foreground",
  alto: "bg-destructive/15 text-destructive",
};

/**
 * Layout compartido para todas las sub-rutas de `/clientes/[id]/*`.
 *
 * Renderiza el header (nombre, badges, acciones) y el nav de tabs.
 * El contenido específico (General, Contactos, Documentos, CFDI) vive
 * en `page.tsx` de cada sub-ruta.
 */
export default async function ClienteLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { id: string };
}) {
  const supabase = createClient();
  const vinculos = await obtenerVinculos();
  const puedeGestionar = puedeGestionarClientes(vinculos);

  // Carga ligera del cliente — solo los campos del header.
  const { data: cliente } = await supabase
    .from("clientes")
    .select(
      "id, razon_social, nombre_comercial, rfc, tipo, riesgo, activo",
    )
    .eq("id", params.id)
    .maybeSingle();

  if (!cliente) notFound();

  // Empresas que lo atienden — chip horizontal en el header.
  const { data: vinculosEmp } = await supabase
    .from("clientes_empresas")
    .select("empresa_id, empresas(codigo, razon_social, nombre_comercial)")
    .eq("cliente_id", params.id)
    .eq("activo", true);

  // Conteos para los badges de los tabs (carga liviana).
  const [contactosCount, cfdiCount, contratosCount] = await Promise.all([
    supabase
      .from("contactos_cliente")
      .select("id", { count: "exact", head: true })
      .eq("cliente_id", params.id)
      .eq("activo", true),
    supabase
      .from("cfdi")
      .select("id", { count: "exact", head: true })
      .eq("cliente_id", params.id),
    supabase
      .from("contratos_cliente")
      .select("id", { count: "exact", head: true })
      .eq("cliente_id", params.id),
  ]);

  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-8">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link
            href="/clientes"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            ← Clientes
          </Link>
          <h1 className="mt-2 flex items-center gap-2 text-2xl font-semibold leading-tight">
            <BotonFavorito
              entidadTipo="cliente"
              entidadId={cliente.id}
              esFavoritoInicial={false}
              etiqueta={cliente.razon_social}
            />
            {cliente.razon_social}
            {!cliente.activo && (
              <span className="ml-1 rounded-full bg-secondary px-2 py-0.5 align-middle text-xs">
                Inactivo
              </span>
            )}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {cliente.nombre_comercial ?? "Sin nombre comercial"} ·{" "}
            <span className="font-mono">{cliente.rfc ?? "Sin RFC"}</span>
            {cliente.tipo && <> · {cliente.tipo}</>}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={`rounded-full px-2 py-0.5 text-xs capitalize ${
              riesgoBadge[cliente.riesgo ?? "bajo"] ?? "bg-secondary"
            }`}
          >
            Riesgo {cliente.riesgo ?? "bajo"}
          </span>
          {puedeGestionar && (
            <>
              <Button variant="outline" size="sm" asChild>
                <Link href={`/clientes/${cliente.id}/edit`}>
                  <Pencil className="h-4 w-4" /> Editar
                </Link>
              </Button>
              <ToggleActivoButton
                clienteId={cliente.id}
                activo={cliente.activo ?? true}
              />
            </>
          )}
        </div>
      </div>

      {/* Empresas que lo atienden */}
      {vinculosEmp && vinculosEmp.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-2">
          {vinculosEmp.map((v, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs"
            >
              <span
                className={`inline-block h-2 w-2 rounded-full ${
                  empresaCodigoColor[v.empresas?.codigo ?? ""] ??
                  "bg-muted-foreground"
                }`}
              />
              {v.empresas?.nombre_comercial ?? v.empresas?.razon_social}
            </span>
          ))}
        </div>
      )}

      {/* Tabs */}
      <ClienteTabs
        clienteId={cliente.id}
        counts={{
          contactos: contactosCount.count ?? 0,
          documentos: contratosCount.count ?? 0,
          cfdi: cfdiCount.count ?? 0,
        }}
      />

      {children}
    </div>
  );
}
