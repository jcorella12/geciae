"use client";
// app/(app)/ayuda/[[...slug]]/ayuda-search.tsx

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { Search } from "lucide-react";

type SearchableItem = {
  href: string;
  title: string;
  section: string;
  keywords: string[];
};

// Lista de items buscables. Aquí se mantienen sincronizados con el contenido.
// Si agregas archivos al manual, agrégalos aquí también.
const SEARCHABLE_ITEMS: SearchableItem[] = [
  {
    href: "/ayuda",
    title: "Inicio",
    section: "General",
    keywords: ["inicio", "bienvenida", "manual", "ayuda"],
  },
  {
    href: "/ayuda/audiencias/vendedor",
    title: "Para Vendedores",
    section: "Audiencias",
    keywords: [
      "vendedor",
      "ventas",
      "oportunidad",
      "cotización",
      "levantamiento",
      "comisión",
    ],
  },
  {
    href: "/ayuda/audiencias/pm-operativo",
    title: "Para Líderes de Proyecto",
    section: "Audiencias",
    keywords: [
      "pm",
      "líder",
      "lider",
      "proyecto",
      "operativo",
      "supervisor",
      "kanban",
      "tareas",
    ],
  },
  {
    href: "/ayuda/audiencias/empleado-campo",
    title: "Para Empleado de Campo",
    section: "Audiencias",
    keywords: [
      "empleado",
      "campo",
      "obra",
      "técnico",
      "tecnico",
      "instalador",
      "modo simple",
      "celular",
      "móvil",
      "movil",
    ],
  },
  {
    href: "/ayuda/audiencias/director",
    title: "Para Directores",
    section: "Audiencias",
    keywords: [
      "director",
      "aprobación",
      "aprobacion",
      "dashboard",
      "reportes",
    ],
  },
  {
    href: "/ayuda/audiencias/ceo-contralor",
    title: "Para CEO y Contralor",
    section: "Audiencias",
    keywords: [
      "ceo",
      "contralor",
      "consolidado",
      "cumplimiento",
      "tesorería",
      "tesoreria",
      "cierre",
    ],
  },
  {
    href: "/ayuda/audiencias/rh",
    title: "Para Recursos Humanos",
    section: "Audiencias",
    keywords: [
      "rh",
      "recursos humanos",
      "nómina",
      "nomina",
      "xml",
      "empleados",
      "bonos",
      "capacitación",
      "capacitacion",
    ],
  },
  {
    href: "/ayuda/flujos/capturar-presupuesto-proyecto",
    title: "Capturar presupuesto inicial del proyecto",
    section: "Flujos",
    keywords: [
      "presupuesto",
      "proyecto",
      "p&l",
      "pnl",
      "rentabilidad",
      "objetivo",
      "garantía",
      "garantia",
    ],
  },
  {
    href: "/ayuda/flujos/cargar-nomina-xml",
    title: "Cargar XMLs de nómina",
    section: "Flujos",
    keywords: [
      "nómina",
      "nomina",
      "xml",
      "cfdi",
      "recibo",
      "subir",
      "cargar",
      "rh",
    ],
  },
  {
    href: "/ayuda/flujos/solicitar-prestamo-activo",
    title: "Solicitar préstamo de activo",
    section: "Flujos",
    keywords: [
      "préstamo",
      "prestamo",
      "activo",
      "grúa",
      "grua",
      "montacargas",
      "ttr",
      "tijera",
    ],
  },
  {
    href: "/ayuda/flujos/aprobar-oc",
    title: "Aprobar Orden de Compra",
    section: "Flujos",
    keywords: ["oc", "orden", "compra", "aprobar", "proveedor", "69-b"],
  },
  {
    href: "/ayuda/flujos/registrar-horas",
    title: "Registrar horas trabajadas",
    section: "Flujos",
    keywords: [
      "horas",
      "tiempo",
      "ingeniería",
      "ingenieria",
      "cuadrilla",
      "tarifa",
    ],
  },
  {
    href: "/ayuda/glosario",
    title: "Glosario",
    section: "Recursos",
    keywords: [
      "cfdi",
      "rfc",
      "curp",
      "rls",
      "dc-3",
      "imss",
      "infonavit",
      "isr",
      "iva",
      "repse",
      "isn",
      "csf",
      "uvie",
      "definición",
      "definicion",
    ],
  },
  {
    href: "/ayuda/faq",
    title: "Preguntas frecuentes",
    section: "Recursos",
    keywords: [
      "faq",
      "frecuentes",
      "contraseña",
      "contrasena",
      "olvidé",
      "olvide",
      "acceso",
      "permiso",
      "lento",
      "exportar",
    ],
  },
];

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function AyudaSearch() {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const results = useMemo(() => {
    if (query.length < 2) return [];

    const q = normalize(query);
    return SEARCHABLE_ITEMS.filter((item) => {
      const haystack = normalize(
        `${item.title} ${item.section} ${item.keywords.join(" ")}`
      );
      return haystack.includes(q);
    }).slice(0, 8);
  }, [query]);

  // Cerrar con Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        setQuery("");
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-2 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder="Buscar en el manual..."
          className="w-full pl-8 pr-3 py-2 text-sm border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      {open && results.length > 0 && (
        <div className="absolute z-50 mt-1 w-full max-h-96 overflow-y-auto bg-popover border rounded-md shadow-lg">
          {results.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => {
                setOpen(false);
                setQuery("");
              }}
              className="block px-3 py-2 text-sm hover:bg-muted border-b last:border-b-0"
            >
              <div className="font-medium">{item.title}</div>
              <div className="text-xs text-muted-foreground">
                {item.section}
              </div>
            </Link>
          ))}
        </div>
      )}

      {open && query.length >= 2 && results.length === 0 && (
        <div className="absolute z-50 mt-1 w-full bg-popover border rounded-md shadow-lg p-3 text-sm text-muted-foreground">
          Sin resultados para &quot;{query}&quot;
        </div>
      )}
    </div>
  );
}
