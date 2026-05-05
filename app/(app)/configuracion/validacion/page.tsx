import Link from "next/link";
import { redirect } from "next/navigation";

import { esCEO, obtenerVinculos } from "@/lib/auth/permisos";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * Sprint 7.2 — Validación end-to-end del modelo multi-empresa.
 * Página interna (solo CEO) que ejecuta una serie de checks sobre la base
 * para verificar que la arquitectura PSE/CIAE/IED/Limson + centros + marca
 * visible está consistente. Útil después de cambios de schema o seed.
 */

type Check = {
  nombre: string;
  descripcion: string;
  resultado: "ok" | "warn" | "fail";
  detalle: string;
  empresa?: string;
};

export default async function ValidacionPage() {
  const v = await obtenerVinculos();
  if (!esCEO(v)) redirect("/mi-dia");

  const supabase = createClient();

  const checks: Check[] = [];

  // ===== 1. Empresas básicas existen =====
  const { data: empresas } = await supabase
    .from("empresas")
    .select("id, codigo, razon_social, rfc")
    .eq("activa", true);
  const codigosEsperados = ["PSE", "CIAE", "IED", "LIMSON"];
  for (const cod of codigosEsperados) {
    const e = (empresas ?? []).find((x) => x.codigo === cod);
    checks.push({
      nombre: `Empresa ${cod}`,
      descripcion: "Existe activa con RFC",
      resultado: e ? "ok" : "fail",
      detalle: e ? `${e.razon_social} · RFC ${e.rfc}` : "No existe",
      empresa: cod,
    });
  }

  // ===== 2. Centros básicos por empresa =====
  for (const cod of codigosEsperados) {
    const emp = (empresas ?? []).find((x) => x.codigo === cod);
    if (!emp) continue;
    const { count } = await supabase
      .from("centros")
      .select("id", { count: "exact", head: true })
      .eq("empresa_id", emp.id)
      .eq("activo", true);
    checks.push({
      nombre: `Centros activos ${cod}`,
      descripcion: "Al menos 1 CC operativo",
      resultado:
        (count ?? 0) > 0 ? "ok" : (count === 0 ? "warn" : "fail"),
      detalle: `${count ?? 0} centros activos`,
      empresa: cod,
    });
  }

  // ===== 3. Tarifas internas para que cálculo de levantamiento funcione =====
  for (const cod of ["PSE", "CIAE"]) {
    const emp = (empresas ?? []).find((x) => x.codigo === cod);
    if (!emp) continue;
    const { count } = await supabase
      .from("tarifas_internas")
      .select("id", { count: "exact", head: true })
      .eq("empresa_id", emp.id)
      .eq("activa", true)
      .eq("concepto", "hora_ingeniero");
    checks.push({
      nombre: `Tarifa hora_ingeniero ${cod}`,
      descripcion: "Para cálculo automático costo levantamiento",
      resultado: (count ?? 0) > 0 ? "ok" : "warn",
      detalle:
        (count ?? 0) > 0
          ? "Configurada"
          : "Falta — el costo de levantamientos quedará en $0",
      empresa: cod,
    });
  }

  // ===== 4. Plantillas seed presentes =====
  const { count: plantillasCount } = await supabase
    .from("plantillas_proyecto")
    .select("codigo", { count: "exact", head: true });
  checks.push({
    nombre: "Plantillas de proyecto",
    descripcion: "PSE solar res/com/ind + Limson contractual/puntual/externa + otras",
    resultado: (plantillasCount ?? 0) >= 9 ? "ok" : "warn",
    detalle: `${plantillasCount ?? 0} plantillas (esperadas ≥ 9)`,
  });

  // ===== 5. Etapas + documentos seed =====
  const { count: etapasCount } = await supabase
    .from("plantilla_etapas")
    .select("id", { count: "exact", head: true });
  checks.push({
    nombre: "Etapas de plantillas",
    descripcion: "Seed Sprint 6 detallado",
    resultado: (etapasCount ?? 0) >= 20 ? "ok" : "warn",
    detalle: `${etapasCount ?? 0} etapas registradas`,
  });

  const { count: docsCount } = await supabase
    .from("plantilla_documentos")
    .select("id", { count: "exact", head: true });
  checks.push({
    nombre: "Documentos requeridos por plantilla",
    descripcion: "Para alimentar proyecto_expediente al crear proyectos",
    resultado: (docsCount ?? 0) >= 20 ? "ok" : "warn",
    detalle: `${docsCount ?? 0} docs registrados`,
  });

  // ===== 6. SGC documentos =====
  const { count: sgcCount } = await supabase
    .from("sgc_documentos")
    .select("id", { count: "exact", head: true });
  checks.push({
    nombre: "Documentos SGC",
    descripcion: "Codificación FP/FO/MA/PO",
    resultado: (sgcCount ?? 0) >= 8 ? "ok" : "warn",
    detalle: `${sgcCount ?? 0} documentos SGC`,
  });

  // ===== 7. Marca visible — proyectos con marca distinta =====
  const { data: proyectosCrossMarca } = await supabase
    .from("v_proyectos_marca_diferente")
    .select("id, nombre, marca_codigo, empresa_operativa_codigo")
    .limit(5);
  checks.push({
    nombre: "Cross-marca (proyectos)",
    descripcion: "Proyectos donde marca_visible difiere de empresa operativa",
    resultado: "ok",
    detalle: `${proyectosCrossMarca?.length ?? 0} ejemplos${
      (proyectosCrossMarca?.length ?? 0) > 0
        ? ": " +
          proyectosCrossMarca!
            .map(
              (p) =>
                `${p.empresa_operativa_codigo}→${p.marca_codigo}`,
            )
            .join(", ")
        : ""
    }`,
  });

  // ===== 8. Triggers críticos activos =====
  const triggersCriticos = [
    "tr_proyecto_aplicar_plantilla",
    "tr_proyecto_validar_expediente",
    "tr_oportunidad_hereda_lev",
    "tr_levantamiento_crear_pasos",
    "trg_vb_km",
  ];
  // Como Supabase JS no expone pg_trigger directamente, dejamos esta nota
  checks.push({
    nombre: "Triggers críticos (manual)",
    descripcion: "tr_proyecto_aplicar_plantilla, tr_validar_expediente, tr_oportunidad_hereda_lev, tr_levantamiento_crear_pasos, trg_vb_km",
    resultado: "ok",
    detalle: `Verifica en Supabase SQL Editor: SELECT tgname FROM pg_trigger WHERE tgname IN (${triggersCriticos.map((t) => `'${t}'`).join(",")})`,
  });

  // ===== 9. RLS de clientes_empresas (separación CRM PSE/Limson) =====
  // Solo informativo: muestra # clientes vinculados a Limson vs PSE
  const empPse = (empresas ?? []).find((x) => x.codigo === "PSE");
  const empLimson = (empresas ?? []).find((x) => x.codigo === "LIMSON");
  if (empPse && empLimson) {
    const [{ count: clPse }, { count: clLimson }] = await Promise.all([
      supabase
        .from("clientes_empresas")
        .select("cliente_id", { count: "exact", head: true })
        .eq("empresa_id", empPse.id)
        .eq("activo", true),
      supabase
        .from("clientes_empresas")
        .select("cliente_id", { count: "exact", head: true })
        .eq("empresa_id", empLimson.id)
        .eq("activo", true),
    ]);
    checks.push({
      nombre: "Separación CRM PSE / Limson",
      descripcion: "Clientes vinculados a cada empresa via clientes_empresas",
      resultado: "ok",
      detalle: `PSE: ${clPse ?? 0} clientes · Limson: ${clLimson ?? 0} clientes`,
    });
  }

  // ===== Resumen =====
  const ok = checks.filter((c) => c.resultado === "ok").length;
  const warn = checks.filter((c) => c.resultado === "warn").length;
  const fail = checks.filter((c) => c.resultado === "fail").length;

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/configuracion"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Configuración
        </Link>
        <h1 className="mt-2 text-2xl font-semibold leading-tight">
          Validación end-to-end
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Sprint 7.2 — Verifica que la arquitectura multi-empresa + centros +
          marca visible + plantillas está consistente. Útil después de seed o
          cambios de schema.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Stat label="OK" value={String(ok)} tone="ok" />
        <Stat label="Warnings" value={String(warn)} tone={warn > 0 ? "warn" : "ok"} />
        <Stat label="Errores" value={String(fail)} tone={fail > 0 ? "bad" : "ok"} />
      </div>

      <div className="overflow-x-auto rounded-lg border border-border bg-card shadow-sm">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-secondary/50">
            <tr className="text-left">
              <th className="px-4 py-2 font-medium">Check</th>
              <th className="px-4 py-2 font-medium">Empresa</th>
              <th className="px-4 py-2 font-medium">Estado</th>
              <th className="px-4 py-2 font-medium">Detalle</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {checks.map((c, i) => (
              <tr key={i}>
                <td className="px-4 py-2">
                  <span className="font-medium">{c.nombre}</span>
                  <p className="text-xs text-muted-foreground">{c.descripcion}</p>
                </td>
                <td className="px-4 py-2 text-xs text-muted-foreground">
                  {c.empresa ?? "—"}
                </td>
                <td className="px-4 py-2">
                  <Badge resultado={c.resultado} />
                </td>
                <td className="px-4 py-2 text-xs">{c.detalle}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-muted-foreground">
        Tip: re-ejecuta esta página después de configurar centros, capturar
        tarifas o crear el primer proyecto Limson para confirmar que todo
        cuadra.
      </p>
    </div>
  );
}

function Badge({ resultado }: { resultado: "ok" | "warn" | "fail" }) {
  if (resultado === "ok")
    return (
      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-700">
        ✓ OK
      </span>
    );
  if (resultado === "warn")
    return (
      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-700">
        ⚠ Warning
      </span>
    );
  return (
    <span className="rounded-full bg-rose-100 px-2 py-0.5 text-xs text-rose-700">
      ✗ Fail
    </span>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "ok" | "warn" | "bad";
}) {
  const cl =
    tone === "ok"
      ? "text-emerald-700"
      : tone === "warn"
        ? "text-amber-700"
        : "text-rose-700";
  return (
    <div className="rounded-lg border border-border bg-card px-4 py-3 shadow-sm">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className={`mt-1 font-mono text-2xl font-semibold tabular-nums ${cl}`}>
        {value}
      </p>
    </div>
  );
}
