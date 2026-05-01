import { ExternalLink } from "lucide-react";

export default function AyudaPage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-10">
      <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
        Ayuda
      </p>
      <h1 className="mt-1 text-2xl font-semibold leading-tight">
        Cómo usar el sistema
      </h1>

      <p className="mt-3 text-sm text-muted-foreground">
        El ERP del GECIAE está en construcción por fases. Estás viendo
        el estado del <strong>Sprint 1</strong> (meses 1 a 3 de Fase 1).
      </p>

      <section className="mt-8 space-y-3">
        <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
          Lo que ya funciona
        </h2>
        <ul className="space-y-2 text-sm">
          <li className="flex gap-2">
            <span className="text-success">✓</span>
            <span>Login con email + contraseña, magic link y MFA opcional.</span>
          </li>
          <li className="flex gap-2">
            <span className="text-success">✓</span>
            <span>
              Selector de empresa activa en el topbar. CEO y tesorero
              corporativo ven la «Vista consolidada del grupo».
            </span>
          </li>
          <li className="flex gap-2">
            <span className="text-success">✓</span>
            <span>
              Banda de color arriba que indica visualmente en qué empresa estás
              operando (verde PSE / verde oscuro CIAE / naranja oscuro IED /
              verde claro Limson).
            </span>
          </li>
          <li className="flex gap-2">
            <span className="text-success">✓</span>
            <span>
              Configuración → Usuarios: invitar, editar rol, atributos y
              umbrales financieros, desactivar vínculos. Solo CEO accede.
            </span>
          </li>
          <li className="flex gap-2">
            <span className="text-success">✓</span>
            <span>Mi perfil: activar/desactivar MFA con TOTP.</span>
          </li>
        </ul>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
          Lo que viene
        </h2>
        <p className="text-sm text-muted-foreground">
          Cada espacio en el sidebar (Proyectos, Comercial, Finanzas, Personas,
          Calidad, Reportes) muestra una pantalla de «En construcción» con el
          sprint en que se entrega y las funcionalidades planeadas.
        </p>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
          Documentación técnica
        </h2>
        <ul className="space-y-2 text-sm">
          <li>
            <span className="font-medium">Especificación completa</span> en{" "}
            <code className="rounded bg-secondary px-1.5 py-0.5 text-xs">
              ../pse-erp-package/
            </code>
            . Empezar por{" "}
            <code className="rounded bg-secondary px-1.5 py-0.5 text-xs">
              00-vision/01-resumen-ejecutivo.md
            </code>
            .
          </li>
          <li>
            <span className="font-medium">Plan de fases</span> en{" "}
            <code className="rounded bg-secondary px-1.5 py-0.5 text-xs">
              06-fases/01-fase-1-mvp.md
            </code>
            .
          </li>
          <li>
            <span className="font-medium">Arquitectura</span> (multi-tenancy,
            roles, stack) en{" "}
            <code className="rounded bg-secondary px-1.5 py-0.5 text-xs">
              01-arquitectura/
            </code>
            .
          </li>
        </ul>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
          Soporte
        </h2>
        <p className="text-sm text-muted-foreground">
          ¿Algo no funciona? Reporta el detalle (qué hiciste, qué esperabas, qué
          pasó) en un mensaje al equipo de desarrollo.
        </p>
        <a
          href="https://supabase.com/dashboard/project/dtmcqjtqykbkapzebbik"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
        >
          Dashboard Supabase del proyecto
          <ExternalLink className="h-3 w-3" />
        </a>
      </section>
    </div>
  );
}
