import { NextResponse, type NextRequest } from "next/server";

import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export type PeekData = {
  kind: "proyecto" | "oc" | "cliente" | "proveedor" | "vehiculo" | "ticket" | "oportunidad" | "item";
  title: string;
  sub: string | null;
  status: "ok" | "warn" | "danger" | "info" | "neutral";
  statusLabel: string;
  stats: { l: string; v: string; d?: string; dir?: "up" | "down" | "flat" }[];
  sections: { t: string; items: string[] }[];
  actions: { label: string; href: string; primary?: boolean }[];
};

const fmtMxn = (n: number) =>
  new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 0,
  }).format(n);

const fmtFecha = (d: string | null) =>
  d
    ? new Date(d).toLocaleDateString("es-MX", {
        day: "2-digit",
        month: "short",
        year: "2-digit",
      })
    : "—";

/**
 * GET /api/peek/[code]
 *
 * El code puede ser:
 *   - UUID directo de proyecto, OC, cliente, etc.
 *   - Prefijo + UUID: "proyecto:UUID", "oc:UUID", etc.
 *   - Códigos legibles: si match con proyectos.codigo, ordenes_compra.numero, etc.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: { code: string } },
) {
  const code = decodeURIComponent(params.code);
  const supabase = createClient();

  // Detectar tipo por prefijo o UUID
  let kind: PeekData["kind"] | null = null;
  let lookup = code;
  if (code.includes(":")) {
    const [k, rest] = code.split(":", 2);
    kind = k as PeekData["kind"];
    lookup = rest;
  } else if (/^PRY-/i.test(code)) kind = "proyecto";
  else if (/^OC-/i.test(code)) kind = "oc";
  else if (/^TKT-/i.test(code)) kind = "ticket";

  // PROYECTO
  if (kind === "proyecto" || /^PRY-/i.test(lookup)) {
    let q = supabase
      .from("proyectos")
      .select(
        "id, codigo, nombre, estado, semaforo, monto_contratado, monto_facturado, monto_cobrado, presupuesto_costo, fecha_fin_planeado, empresas(codigo), clientes(razon_social)",
      )
      .limit(1);
    if (
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        lookup,
      )
    ) {
      q = q.eq("id", lookup);
    } else {
      q = q.ilike("codigo", lookup);
    }
    const { data } = await q.maybeSingle();
    if (data) {
      const empresa = data.empresas as { codigo: string } | null;
      const cliente = data.clientes as { razon_social: string } | null;
      const contratado = Number(data.monto_contratado ?? 0);
      const facturado = Number(data.monto_facturado ?? 0);
      const cobrado = Number(data.monto_cobrado ?? 0);
      const presupuesto = Number(data.presupuesto_costo ?? 0);
      const avance =
        contratado > 0 ? Math.round((facturado / contratado) * 100) : 0;
      const sem = data.semaforo as string | null;
      const status: PeekData["status"] =
        sem === "rojo" ? "danger" : sem === "amarillo" ? "warn" : "ok";
      const peek: PeekData = {
        kind: "proyecto",
        title: data.nombre,
        sub: `${empresa?.codigo ?? ""} · ${cliente?.razon_social ?? "Sin cliente"} · ${data.codigo}`,
        status,
        statusLabel:
          data.estado?.replaceAll("_", " ") ?? "Activo",
        stats: [
          {
            l: "Avance",
            v: `${avance}%`,
            d: `${fmtMxn(facturado)} fact.`,
            dir: avance >= 80 ? "up" : avance >= 50 ? "flat" : "down",
          },
          {
            l: "Contratado",
            v: fmtMxn(contratado),
            d: `cobrado ${fmtMxn(cobrado)}`,
          },
          {
            l: "Presupuesto",
            v: fmtMxn(presupuesto),
          },
          {
            l: "Fin plan",
            v: fmtFecha(data.fecha_fin_planeado as string | null),
          },
        ],
        sections: [
          {
            t: "Datos",
            items: [
              `Cliente: ${cliente?.razon_social ?? "—"}`,
              `Empresa: ${empresa?.codigo ?? "—"}`,
              `Estado: ${data.estado?.replaceAll("_", " ") ?? "—"}`,
            ],
          },
        ],
        actions: [
          {
            label: "Abrir proyecto",
            href: `/proyectos/${data.id}`,
            primary: true,
          },
          { label: "Ver costos", href: `/proyectos/${data.id}` },
        ],
      };
      return NextResponse.json(peek);
    }
  }

  // OC
  if (kind === "oc" || /^OC-/i.test(lookup)) {
    let q = supabase
      .from("ordenes_compra")
      .select(
        "id, numero, fecha_emision, total, estado, comentarios, empresas(codigo), proveedores(razon_social, rfc)",
      )
      .limit(1);
    if (
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        lookup,
      )
    ) {
      q = q.eq("id", lookup);
    } else {
      q = q.ilike("numero", lookup);
    }
    const { data } = await q.maybeSingle();
    if (data) {
      const empresa = data.empresas as { codigo: string } | null;
      const prov = data.proveedores as
        | { razon_social: string; rfc: string }
        | null;
      const status: PeekData["status"] =
        data.estado === "pendiente_aprobacion"
          ? "warn"
          : ["recibida", "pagada"].includes(data.estado ?? "")
            ? "ok"
            : "info";
      const peek: PeekData = {
        kind: "oc",
        title: `${data.numero} · ${prov?.razon_social ?? "Proveedor"}`,
        sub: `${empresa?.codigo} · ${fmtFecha(data.fecha_emision as string | null)} · ${prov?.rfc ?? ""}`,
        status,
        statusLabel: data.estado?.replaceAll("_", " ") ?? "—",
        stats: [
          { l: "Total", v: fmtMxn(Number(data.total ?? 0)) },
          { l: "Estado", v: data.estado?.replaceAll("_", " ") ?? "—" },
          { l: "Empresa", v: empresa?.codigo ?? "—" },
          {
            l: "Emitida",
            v: fmtFecha(data.fecha_emision as string | null),
          },
        ],
        sections: data.comentarios
          ? [
              {
                t: "Comentarios",
                items: [data.comentarios as string],
              },
            ]
          : [],
        actions: [
          {
            label: "Abrir OC",
            href: `/finanzas/oc/${data.id}`,
            primary: true,
          },
          {
            label: "Ver proveedor",
            href: `/finanzas/proveedores`,
          },
        ],
      };
      return NextResponse.json(peek);
    }
  }

  // TICKET
  if (kind === "ticket" || /^TKT-/i.test(lookup)) {
    let q = supabase
      .from("tickets_soporte")
      .select(
        "id, numero, asunto, prioridad, estado, created_at, empresas(codigo), clientes(razon_social)",
      )
      .limit(1);
    if (
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        lookup,
      )
    ) {
      q = q.eq("id", lookup);
    } else {
      q = q.ilike("numero", lookup);
    }
    const { data } = await q.maybeSingle();
    if (data) {
      const empresa = data.empresas as { codigo: string } | null;
      const cliente = data.clientes as { razon_social: string } | null;
      const status: PeekData["status"] =
        data.prioridad === "critica"
          ? "danger"
          : data.prioridad === "alta"
            ? "warn"
            : "info";
      const peek: PeekData = {
        kind: "ticket",
        title: data.asunto,
        sub: `${data.numero} · ${empresa?.codigo} · ${cliente?.razon_social ?? "—"}`,
        status,
        statusLabel: data.estado?.replaceAll("_", " ") ?? "—",
        stats: [
          { l: "Prioridad", v: data.prioridad ?? "—" },
          { l: "Estado", v: data.estado?.replaceAll("_", " ") ?? "—" },
          { l: "Empresa", v: empresa?.codigo ?? "—" },
          {
            l: "Creado",
            v: fmtFecha(data.created_at as string),
          },
        ],
        sections: [],
        actions: [
          {
            label: "Abrir ticket",
            href: `/soporte/tickets/${data.id}`,
            primary: true,
          },
        ],
      };
      return NextResponse.json(peek);
    }
  }

  // CLIENTE
  if (kind === "cliente") {
    const { data } = await supabase
      .from("clientes")
      .select("id, razon_social, rfc, nombre_comercial, riesgo, score_pago")
      .eq("id", lookup)
      .maybeSingle();
    if (data) {
      const peek: PeekData = {
        kind: "cliente",
        title: data.razon_social,
        sub: `${data.rfc}${data.nombre_comercial ? ` · ${data.nombre_comercial}` : ""}`,
        status:
          data.riesgo === "alto"
            ? "danger"
            : data.riesgo === "medio"
              ? "warn"
              : "ok",
        statusLabel: `Riesgo ${data.riesgo ?? "bajo"}`,
        stats: [
          {
            l: "Score pago",
            v: `${Math.round(Number(data.score_pago ?? 0.5) * 100)}%`,
          },
          { l: "RFC", v: data.rfc },
        ],
        sections: [],
        actions: [
          {
            label: "Abrir cliente",
            href: `/clientes/${data.id}`,
            primary: true,
          },
        ],
      };
      return NextResponse.json(peek);
    }
  }

  // VEHICULO
  if (kind === "vehiculo") {
    const { data } = await supabase
      .from("vehiculos")
      .select(
        "id, placa, marca, modelo, anio, estatus, km_actual, fecha_vencimiento_seguro",
      )
      .eq("id", lookup)
      .maybeSingle();
    if (data) {
      const peek: PeekData = {
        kind: "vehiculo",
        title: `${data.marca} ${data.modelo} ${data.anio ?? ""}`,
        sub: data.placa,
        status:
          data.estatus === "activo"
            ? "ok"
            : data.estatus === "mantenimiento" ||
                data.estatus === "reparacion"
              ? "warn"
              : "danger",
        statusLabel: data.estatus ?? "—",
        stats: [
          {
            l: "Km actual",
            v: data.km_actual?.toLocaleString("es-MX") ?? "—",
          },
          {
            l: "Vence seguro",
            v: fmtFecha(data.fecha_vencimiento_seguro as string | null),
          },
        ],
        sections: [],
        actions: [
          {
            label: "Abrir vehículo",
            href: `/activos/vehiculos/${data.id}`,
            primary: true,
          },
        ],
      };
      return NextResponse.json(peek);
    }
  }

  return NextResponse.json(
    { error: "No se encontró la entidad", code },
    { status: 404 },
  );
}
