import { ArrowRight } from "lucide-react";
import Link from "next/link";

const modulos = [
  {
    href: "/finanzas/oc",
    label: "Compras (OC)",
    sprint: "Sprint 4",
    desc: "Órdenes de compra con flujo completo: creación, aprobación por umbrales, validación con CFDI recibido, cierre con pago.",
  },
  {
    href: "/finanzas/ot",
    label: "OT inter-compañías",
    sprint: "Sprint 5",
    desc: "Órdenes de trabajo entre empresas del grupo con margen 15% automático y doble confirmación.",
  },
  {
    href: "/finanzas/tesoreria",
    label: "Tesorería",
    sprint: "Sprint 5",
    desc: "Posición consolidada del grupo, créditos revolventes inter-compañías, intereses diarios con TIIE, matriz mensual.",
  },
  {
    href: "/finanzas/cfdi",
    label: "CFDI",
    sprint: "Sprint 6",
    desc: "Timbrado vía PAC, complementos de pago, cancelación con motivos SAT, recepción de CFDI de proveedores.",
  },
  {
    href: "/finanzas/proveedores",
    label: "Proveedores",
    sprint: "Sprint 2 + Sprint 4",
    desc: "Catálogo de proveedores con expediente robusto, niveles de cumplimiento (verde/amarillo/rojo/negro) y bloqueo automático.",
  },
] as const;

export default function FinanzasIndexPage() {
  return (
    <div className="mx-auto w-full max-w-4xl px-6 py-10">
      <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
        Administración y Finanzas
      </p>
      <h1 className="mt-1 text-2xl font-semibold leading-tight">
        Módulos financieros
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Foco principal de Fase 1: cerrar el dolor inter-compañías y CFDI.
      </p>

      <ul className="mt-8 space-y-3">
        {modulos.map((m) => (
          <li key={m.href}>
            <Link
              href={m.href}
              className="flex items-start justify-between gap-4 rounded-lg border border-border bg-card p-4 shadow-sm transition-colors hover:border-primary/40 hover:bg-card/80"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold">{m.label}</p>
                  <span className="rounded-full bg-secondary px-2 py-0.5 text-xs text-secondary-foreground">
                    {m.sprint}
                  </span>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{m.desc}</p>
              </div>
              <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
