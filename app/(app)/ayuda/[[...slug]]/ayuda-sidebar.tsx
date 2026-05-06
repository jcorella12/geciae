// app/(app)/ayuda/[[...slug]]/ayuda-sidebar.tsx

import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  Home,
  Users,
  HardHat,
  Briefcase,
  Shield,
  UserCircle,
  HeartHandshake,
  Workflow,
  BookOpen,
  HelpCircle,
} from "lucide-react";

type SidebarItem = {
  href: string;
  label: string;
  icon?: React.ReactNode;
};

type SidebarSection = {
  title: string;
  items: SidebarItem[];
};

const SECTIONS: SidebarSection[] = [
  {
    title: "Inicio",
    items: [{ href: "/ayuda", label: "Inicio", icon: <Home className="size-4" /> }],
  },
  {
    title: "Por audiencia",
    items: [
      {
        href: "/ayuda/audiencias/vendedor",
        label: "Vendedor",
        icon: <Users className="size-4" />,
      },
      {
        href: "/ayuda/audiencias/pm-operativo",
        label: "Líder de proyecto / Operativo",
        icon: <Briefcase className="size-4" />,
      },
      {
        href: "/ayuda/audiencias/empleado-campo",
        label: "Empleado de campo",
        icon: <HardHat className="size-4" />,
      },
      {
        href: "/ayuda/audiencias/director",
        label: "Director",
        icon: <Shield className="size-4" />,
      },
      {
        href: "/ayuda/audiencias/ceo-contralor",
        label: "CEO / Contralor",
        icon: <UserCircle className="size-4" />,
      },
      {
        href: "/ayuda/audiencias/rh",
        label: "Recursos Humanos",
        icon: <HeartHandshake className="size-4" />,
      },
    ],
  },
  {
    title: "Flujos comunes",
    items: [
      {
        href: "/ayuda/flujos/capturar-presupuesto-proyecto",
        label: "Capturar presupuesto",
      },
      {
        href: "/ayuda/flujos/registrar-horas",
        label: "Registrar horas",
      },
      {
        href: "/ayuda/flujos/aprobar-oc",
        label: "Aprobar OC",
      },
      {
        href: "/ayuda/flujos/cargar-nomina-xml",
        label: "Cargar XMLs nómina",
      },
      {
        href: "/ayuda/flujos/solicitar-prestamo-activo",
        label: "Préstamo de activo",
      },
    ],
  },
  {
    title: "Recursos",
    items: [
      {
        href: "/ayuda/glosario",
        label: "Glosario",
        icon: <BookOpen className="size-4" />,
      },
      {
        href: "/ayuda/faq",
        label: "Preguntas frecuentes",
        icon: <HelpCircle className="size-4" />,
      },
    ],
  },
];

export function AyudaSidebar({ currentSlug }: { currentSlug: string }) {
  return (
    <nav className="space-y-6 px-4 pb-6">
      {SECTIONS.map((section) => (
        <div key={section.title}>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
            {section.title}
          </h3>
          <ul className="space-y-1">
            {section.items.map((item) => {
              const isActive =
                item.href === "/ayuda"
                  ? currentSlug === ""
                  : item.href === `/ayuda/${currentSlug}`;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={cn(
                      "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors",
                      isActive
                        ? "bg-primary/10 text-primary font-medium"
                        : "hover:bg-muted text-foreground/80"
                    )}
                  >
                    {item.icon}
                    <span>{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}
