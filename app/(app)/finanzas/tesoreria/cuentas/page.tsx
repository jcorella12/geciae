import { Upload } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  esCEO,
  esRolEn,
  obtenerVinculos,
  tieneAtributo,
} from "@/lib/auth/permisos";
import { createClient } from "@/lib/supabase/server";

import { CuentaForm } from "./cuenta-form";
import { CuentasFilters } from "./cuentas-filters";
import { CuentasList } from "./cuentas-list";

const fmtMxnShort = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
  maximumFractionDigits: 0,
});

type SearchParams = {
  empresa?: string; // codigo de empresa, "all" o ausente = todas
  agrupar?: string; // "1" (default) o "0"
  orden?: string; // "empresa" (default) | "banco" | "saldo_desc" | "saldo_asc"
};

export default async function TesoreriaCuentasPage({
  searchParams,
}: {
  searchParams?: SearchParams;
}) {
  const supabase = createClient();
  const vinculos = await obtenerVinculos();
  const ceo = esCEO(vinculos);
  const tesorero = tieneAtributo(vinculos, "tesorero_corporativo");

  // Empresas donde puede gestionar bancos: ceo o tesorero ven todas; director ve la suya.
  const todasIds = (
    await supabase.from("empresas").select("id").eq("activa", true)
  ).data?.map((e) => e.id) ?? [];

  const empresasGestionables = ceo || tesorero
    ? todasIds
    : todasIds.filter((id) => esRolEn(vinculos, id, "director"));

  const empresaFiltro = (searchParams?.empresa ?? "all").toLowerCase();
  // Default: agrupado por empresa (el listado por banco mezcla empresas y mete ruido).
  const agrupar = searchParams?.agrupar !== "0";
  const ordenRaw = searchParams?.orden;
  const orden: "empresa" | "banco" | "saldo_desc" | "saldo_asc" =
    ordenRaw === "banco" ||
    ordenRaw === "saldo_desc" ||
    ordenRaw === "saldo_asc"
      ? ordenRaw
      : "empresa";

  const [{ data: empresas }, { data: cuentas }] = await Promise.all([
    supabase
      .from("empresas")
      .select("id, codigo, razon_social, nombre_comercial")
      .eq("activa", true)
      .order("codigo"),
    supabase
      .from("bancos_cuentas")
      .select(
        "id, empresa_id, banco, numero_cuenta, clabe, alias, tipo, saldo_actual, fecha_actualizacion_saldo, activa, empresas(codigo)",
      ),
  ]);

  const empresasGestionablesObj = (empresas ?? []).filter((e) =>
    empresasGestionables.includes(e.id),
  );

  // Resolver codigo → empresa_id para filtrar (lo hicimos client-side porque
  // necesitamos los empresas cargadas; barato porque son 4-5 empresas).
  let cuentasFiltradas = cuentas ?? [];
  if (empresaFiltro !== "all") {
    const target = (empresas ?? []).find(
      (e) => e.codigo.toLowerCase() === empresaFiltro,
    );
    if (target) {
      cuentasFiltradas = cuentasFiltradas.filter(
        (c) => c.empresa_id === target.id,
      );
    }
  }
  // Aplicar orden — dentro de cada grupo (si agrupar) o globalmente.
  const codigoPorId = new Map(
    (empresas ?? []).map((e) => [e.id, e.codigo] as const),
  );
  // Para "saldo": activa neto (positivo) primero. Crédito es pasivo (negativo).
  const saldoNeto = (c: (typeof cuentasFiltradas)[number]) => {
    const v = Number(c.saldo_actual ?? 0);
    return c.tipo === "credito" ? -v : v;
  };
  const cmpDentroGrupo = (
    a: (typeof cuentasFiltradas)[number],
    b: (typeof cuentasFiltradas)[number],
  ) => {
    if (orden === "saldo_desc") return saldoNeto(b) - saldoNeto(a);
    if (orden === "saldo_asc") return saldoNeto(a) - saldoNeto(b);
    if (orden === "banco") return a.banco.localeCompare(b.banco);
    // "empresa": dentro del grupo (mismo empresa_id) ordena por saldo desc
    // — el grupo lo da el agrupado o el order global por empresa.
    return saldoNeto(b) - saldoNeto(a);
  };
  cuentasFiltradas = [...cuentasFiltradas].sort((a, b) => {
    // Cuando agrupar=1, siempre primero por empresa para mantener bloques.
    // Cuando agrupar=0 y orden="empresa", igual.
    if (agrupar || orden === "empresa") {
      const ca = codigoPorId.get(a.empresa_id) ?? "";
      const cb = codigoPorId.get(b.empresa_id) ?? "";
      if (ca !== cb) return ca.localeCompare(cb);
    }
    return cmpDentroGrupo(a, b);
  });

  // KPIs respetan el filtro
  const totalCuentas = cuentasFiltradas.length;
  const sumaSaldos = cuentasFiltradas.reduce((acc, c) => {
    const v = Number(c.saldo_actual ?? 0);
    // Crédito es pasivo: resta del saldo neto
    if (c.tipo === "credito") return acc - v;
    return acc + v;
  }, 0);

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-8">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link
            href="/finanzas/tesoreria"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            ← Tesorería
          </Link>
          <h1 className="mt-2 text-2xl font-semibold leading-tight">
            Cuentas bancarias
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Saldos manuales por ahora. La integración con Belvo (sincronización
            automática) llega en Fase 3.
          </p>
        </div>
        {empresasGestionablesObj.length > 0 && (
          <Button variant="outline" size="sm" asChild>
            <Link href="/finanzas/tesoreria/cuentas/importar">
              <Upload className="h-4 w-4" />
              Importar estados de cuenta
            </Link>
          </Button>
        )}
      </div>

      {/* Filtros */}
      <CuentasFilters
        empresas={(empresas ?? []).map((e) => ({
          codigo: e.codigo,
          nombre: e.nombre_comercial ?? e.razon_social,
        }))}
        empresaFiltro={empresaFiltro}
        agrupar={agrupar}
        orden={orden}
      />

      {/* KPIs */}
      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="rounded-md border border-border bg-card px-4 py-3">
          <p className="text-[10.5px] uppercase tracking-wider text-ink-3">
            Cuentas
          </p>
          <p className="mt-0.5 text-lg font-semibold tnum">{totalCuentas}</p>
        </div>
        <div className="rounded-md border border-border bg-card px-4 py-3">
          <p className="text-[10.5px] uppercase tracking-wider text-ink-3">
            Saldo neto
          </p>
          <p
            className={`mt-0.5 text-lg font-semibold tnum ${
              sumaSaldos < 0 ? "text-red-700" : ""
            }`}
          >
            {fmtMxnShort.format(sumaSaldos)}
          </p>
        </div>
        <div className="rounded-md border border-border bg-card px-4 py-3 sm:block hidden">
          <p className="text-[10.5px] uppercase tracking-wider text-ink-3">
            Vista
          </p>
          <p className="mt-0.5 text-sm font-medium">
            {empresaFiltro === "all"
              ? "Todas las empresas"
              : empresaFiltro.toUpperCase()}
            {agrupar && " · agrupado"}
            {" · "}
            {orden === "empresa" && "por empresa"}
            {orden === "banco" && "por banco"}
            {orden === "saldo_desc" && "saldo ↓"}
            {orden === "saldo_asc" && "saldo ↑"}
          </p>
        </div>
      </div>

      {empresasGestionablesObj.length > 0 && (
        <CuentaForm empresas={empresasGestionablesObj} />
      )}

      <CuentasList
        cuentas={cuentasFiltradas}
        empresasGestionables={empresasGestionables}
        agrupar={agrupar}
      />
    </div>
  );
}
