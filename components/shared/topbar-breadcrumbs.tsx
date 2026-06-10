"use client";

import { usePathname } from "next/navigation";

import { Breadcrumbs, type BreadcrumbItem } from "@/components/ui/breadcrumbs";

// Mapa de slugs a labels legibles (lo que no esté aquí se capitaliza por default)
const SLUG_LABELS: Record<string, string> = {
  "mi-dia": "Mi día",
  finanzas: "Finanzas",
  oc: "Compras",
  ot: "OT inter-co",
  cfdi: "CFDI",
  tesoreria: "Tesorería",
  proveedores: "Proveedores",
  servicios: "Servicios",
  creditos: "Créditos inter-co",
  prestamos: "Préstamos",
  cuentas: "Cuentas bancarias",
  matriz: "Matriz inter-co",
  tiie: "TIIE",
  proyectos: "Proyectos",
  clientes: "Clientes",
  personas: "Personas",
  reportes: "Reportes",
  configuracion: "Configuración",
  ayuda: "Ayuda",
  perfil: "Mi perfil",
  ia: "IA",
  usuarios: "Usuarios",
  documentacion: "Documentación",
  recepcion: "Recepción",
  nuevo: "Nuevo",
  nueva: "Nueva",
  edit: "Editar",
  dashboard: "Dashboard",
};

function humanize(slug: string): string {
  if (SLUG_LABELS[slug]) return SLUG_LABELS[slug];
  // UUID heurística — si parece UUID o tiene >20 chars con guiones
  if (/^[0-9a-f]{8}-/i.test(slug)) return "Detalle";
  return slug
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function TopbarBreadcrumbs() {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);

  if (segments.length === 0) {
    return <Breadcrumbs items={[{ label: "Inicio" }]} />;
  }

  const items: BreadcrumbItem[] = [{ label: "Inicio", href: "/mi-dia" }];
  let current = "";
  for (let i = 0; i < segments.length; i++) {
    current += `/${segments[i]}`;
    items.push({
      label: humanize(segments[i]),
      href: i < segments.length - 1 ? current : undefined,
    });
  }

  return <Breadcrumbs items={items} />;
}
