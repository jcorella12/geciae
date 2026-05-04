import Link from "next/link";

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
  agrupar?: string; // "1" o "0"
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
  const agrupar = searchParams?.agrupar === "1";

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
      )
      .order("banco"),
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
  if (agrupar) {
    // Ordena por empresa code (asc) y luego por banco
    const codigoPorId = new Map(
      (empresas ?? []).map((e) => [e.id, e.codigo] as const),
    );
    cuentasFiltradas = [...cuentasFiltradas].sort((a, b) => {
      const ca = codigoPorId.get(a.empresa_id) ?? "";
      const cb = codigoPorId.get(b.empresa_id) ?? "";
      if (ca !== cb) return ca.localeCompare(cb);
      return a.banco.localeCompare(b.banco);
    });
  }

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
      <div className="mb-6">
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

      {/* Filtros */}
      <CuentasFilters
        empresas={(empresas ?? []).map((e) => ({
          codigo: e.codigo,
          nombre: e.nombre_comercial ?? e.razon_social,
        }))}
        empresaFiltro={empresaFiltro}
        agrupar={agrupar}
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
            Filtro
          </p>
          <p className="mt-0.5 text-sm font-medium">
            {empresaFiltro === "all"
              ? "Todas las empresas"
              : empresaFiltro.toUpperCase()}
            {agrupar && " · agrupado"}
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
