import { Plus, Warehouse } from "lucide-react";
import { cookies } from "next/headers";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableSurface,
} from "@/components/ui/table";
import { obtenerVinculos } from "@/lib/auth/permisos";
import {
  EMPRESA_COOKIE,
  puedeVerConsolidado,
  resolverEmpresasFiltro,
} from "@/lib/empresa-activa";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const empresaCodigoColor: Record<string, string> = {
  PSE: "bg-pse",
  CIAE: "bg-ciae",
  IED: "bg-ied",
  LIMSON: "bg-limson",
};

const TIPO_LABEL: Record<string, string> = {
  principal: "Principal",
  obra: "Obra",
  virtual_cuadrilla: "Virtual (cuadrilla)",
  otro: "Otro",
};

const TIPO_COLOR: Record<string, string> = {
  principal: "bg-blue-100 text-blue-800",
  obra: "bg-amber-100 text-amber-800",
  virtual_cuadrilla: "bg-violet-100 text-violet-800",
  otro: "bg-gray-100 text-gray-700",
};

export default async function AlmacenesPage() {
  const supabase = createClient();
  const v = await obtenerVinculos();
  const filtro = resolverEmpresasFiltro({
    cookieValue: cookies().get(EMPRESA_COOKIE)?.value ?? null,
    empresasUsuario: v.map((x) => x.empresa_id),
    puedeConsolidado: puedeVerConsolidado(v),
  });

  // Mostramos: 1) compartidos del grupo, 2) propios de las empresas filtradas.
  // RLS ya garantiza que el usuario sólo ve los compartidos + los de sus
  // empresas, así que aquí filtramos en cliente para no excluir los compartidos.
  const { data: almacenes } = await supabase
    .from("almacenes")
    .select(
      "id, empresa_id, codigo, nombre, tipo, activo, compartido, empresas(codigo, nombre_comercial)" as never,
    )
    .order("compartido", { ascending: false })
    .order("activo", { ascending: false })
    .order("codigo");

  const todos = (almacenes ?? []) as unknown as Array<{
    id: string;
    empresa_id: string | null;
    codigo: string;
    nombre: string;
    tipo: string | null;
    activo: boolean;
    compartido: boolean;
    empresas: { codigo: string; nombre_comercial: string | null } | null;
  }>;
  const lista = todos.filter(
    (a) => a.compartido || filtro.empresasIds.includes(a.empresa_id ?? ""),
  );

  const activos = lista.filter((a) => a.activo).length;
  const inactivos = lista.length - activos;

  return (
    <div className="mx-auto w-full max-w-[1200px] px-8 py-7">
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <p className="lbl-mini">Operación · Inventario</p>
          <h1 className="mt-1.5 text-[28px] font-semibold leading-tight tracking-[-0.02em]">
            Almacenes
          </h1>
          <p className="mt-1 text-[13px] text-ink-3">
            Define dónde se guarda y se mueve el stock. Cada movimiento de
            inventario se hace contra un almacén.
          </p>
          <p className="mt-2 text-[12.5px] text-ink-3">
            <span className="font-medium text-ink-1">{activos}</span> activos
            {inactivos > 0 && (
              <>
                {" "}
                ·{" "}
                <span className="font-medium text-ink-3">{inactivos}</span>{" "}
                inactivos
              </>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="outline">
            <Link href="/inventario">← Volver a inventario</Link>
          </Button>
          <Button asChild>
            <Link href="/inventario/almacenes/nuevo">
              <Plus className="h-4 w-4" />
              Nuevo almacén
            </Link>
          </Button>
        </div>
      </div>

      {lista.length === 0 ? (
        <div className="rounded-md border border-dashed border-border bg-card p-12 text-center">
          <Warehouse className="mx-auto h-8 w-8 text-ink-4" />
          <p className="mt-3 text-sm text-ink-3">
            Todavía no hay almacenes.
          </p>
          <Link
            href="/inventario/almacenes/nuevo"
            className="mt-2 inline-flex text-sm text-brand hover:underline"
          >
            Crear el primero →
          </Link>
        </div>
      ) : (
        <TableSurface>
          <Table>
            <TableHeader>
              <TableRow interactive={false}>
                <TableHead>Empresa</TableHead>
                <TableHead>Código</TableHead>
                <TableHead>Nombre</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lista.map((a) => {
                const codEmp = a.empresas?.codigo ?? "—";
                const tipo = a.tipo ?? "otro";
                return (
                  <TableRow
                    key={a.id}
                    href={`/inventario/almacenes/${a.id}`}
                    linkLabel={`Editar almacén ${a.codigo}`}
                  >
                    <TableCell>
                      {a.compartido ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-violet-100 px-2 py-0.5 text-[10.5px] font-medium text-violet-800">
                          Compartido
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-xs">
                          <span
                            className={`inline-block h-2 w-2 rounded-full ${
                              empresaCodigoColor[codEmp] ?? "bg-muted-foreground"
                            }`}
                          />
                          {codEmp}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {a.codigo}
                    </TableCell>
                    <TableCell className="text-sm font-medium">
                      {a.nombre}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                          TIPO_COLOR[tipo] ?? TIPO_COLOR.otro
                        }`}
                      >
                        {TIPO_LABEL[tipo] ?? tipo}
                      </span>
                    </TableCell>
                    <TableCell>
                      {a.activo ? (
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-800">
                          Activo
                        </span>
                      ) : (
                        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-600">
                          Inactivo
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableSurface>
      )}
    </div>
  );
}
