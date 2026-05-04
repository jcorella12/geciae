import {
  AlertTriangle,
  ClipboardCheck,
  FileBadge,
  FolderOpen,
  Gauge,
  ShieldCheck,
  Target,
} from "lucide-react";
import Link from "next/link";

import { KpiCard } from "@/components/ui/kpi-card";
import { Stat } from "@/components/ui/stat";
import { StatusDot } from "@/components/ui/status-dot";
import {
  obtenerVinculos,
  puedeAccederCalidad,
} from "@/lib/auth/permisos";

export const metadata = { title: "Calidad" };

const modulos = [
  {
    href: "#",
    label: "Mapa de procesos",
    desc: "Procesos del grupo + específicos por unidad de negocio.",
    icon: Target,
    sprint: "Sprint 10",
  },
  {
    href: "#",
    label: "Repositorio documental",
    desc: "Procedimientos con versionado, aprobación electrónica y confirmación de lectura.",
    icon: FolderOpen,
    sprint: "Sprint 10",
  },
  {
    href: "#",
    label: "Indicadores",
    desc: "KPIs por proceso con captura automática + manual y semáforo.",
    icon: Gauge,
    sprint: "Sprint 11",
  },
  {
    href: "#",
    label: "Auditorías internas",
    desc: "Programación, ejecución, hallazgos y seguimiento.",
    icon: ClipboardCheck,
    sprint: "Sprint 12",
  },
  {
    href: "#",
    label: "No conformidades",
    desc: "Registro, análisis causa-raíz, acciones correctivas, cierre.",
    icon: AlertTriangle,
    sprint: "Sprint 12",
  },
  {
    href: "#",
    label: "Revisión por la dirección",
    desc: "Acta semestral con indicadores, no conformidades y plan.",
    icon: FileBadge,
    sprint: "Sprint 13",
  },
] as const;

export default async function CalidadPage() {
  const v = await obtenerVinculos();
  const puede = puedeAccederCalidad(v);

  if (!puede) {
    return (
      <div className="mx-auto w-full max-w-2xl px-8 py-12 text-center">
        <ShieldCheck className="mx-auto h-10 w-10 text-ink-4" />
        <h1 className="mt-4 text-xl font-semibold">Sin acceso</h1>
        <p className="mt-2 text-[13px] text-ink-3">
          El espacio de Calidad es visible para CEO, coordinador de calidad y
          auditor interno. Contacta al administrador si necesitas acceso.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[1480px] px-8 py-7">
      <div className="mb-7">
        <p className="lbl-mini">Calidad y Cumplimiento</p>
        <h1 className="mt-1.5 text-[28px] font-semibold leading-tight tracking-[-0.02em]">
          Sistema de Gestión de Calidad
        </h1>
        <p className="mt-1 text-[13px] text-ink-3">
          Camino hacia la certificación ISO 9001:2015 · alcance:
          PSENERGIA Levantamiento Técnico y Diseño.
        </p>
      </div>

      {/* KPIs (placeholder hasta Fase 1.5) */}
      <div className="mb-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Procesos definidos" value="0" sub="Mapa pendiente" />
        <KpiCard label="Procedimientos" value="0" sub="Repositorio vacío" />
        <KpiCard label="Auditorías programadas" value="0" sub="Sin plan" />
        <KpiCard
          label="No conformidades"
          value="0"
          sub="Sin registros"
          accent="ok"
        />
      </div>

      {/* Estado del SGC */}
      <div className="mb-6 rounded-md border border-info/30 bg-info-soft/30 p-5">
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-info" />
          <div className="flex-1">
            <h2 className="text-[14px] font-semibold">
              SGC en preparación · Fase 1.5
            </h2>
            <p className="mt-1 text-[12.5px] text-ink-3">
              El sistema de gestión de calidad llega después del MVP de
              operaciones (Fase 1: Sprints 1-8). En Fase 1.5 (Sprints 10-15) se
              construye el SGC completo y se prepara la pre-auditoría externa.
            </p>
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <Stat label="Norma" value="ISO 9001:2015" mono={false} />
              <Stat
                label="Casa certificadora"
                value="Por definir"
                mono={false}
              />
              <Stat
                label="Fecha objetivo"
                value="Mes 6"
                sub="Auditoría externa"
                mono={false}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Módulos */}
      <h2 className="mb-3 text-[13.5px] font-semibold">Módulos del SGC</h2>
      <ul className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {modulos.map((m) => {
          const Icon = m.icon;
          return (
            <li key={m.label}>
              <div className="flex h-full items-start gap-3 rounded-md border border-border bg-card p-5 shadow-xs">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-bg-2 text-ink-2">
                  <Icon className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-[14px] font-semibold">{m.label}</p>
                    <StatusDot status="idle" />
                  </div>
                  <p className="mt-1 text-[12px] text-ink-3">{m.desc}</p>
                  <p className="mt-2 inline-block rounded bg-bg-2 px-1.5 py-0.5 font-mono text-[10px] text-ink-3">
                    {m.sprint}
                  </p>
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      <div className="mt-8 text-center">
        <Link
          href="/finanzas"
          className="text-[13px] text-ink-3 hover:text-brand"
        >
          Volver a Finanzas →
        </Link>
      </div>
    </div>
  );
}
