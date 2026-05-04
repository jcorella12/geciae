import Link from "next/link";

import {
  empresasDondeCreaOC,
  obtenerVinculos,
} from "@/lib/auth/permisos";

import { ImportOCForm } from "./import-form";

export const dynamic = "force-dynamic";

export default async function ImportOCPage() {
  const v = await obtenerVinculos();
  const puede = empresasDondeCreaOC(v).length > 0;

  if (!puede) {
    return (
      <div className="mx-auto w-full max-w-2xl px-8 py-12 text-center">
        <h1 className="text-xl font-semibold">Sin permiso</h1>
        <p className="mt-2 text-[13px] text-ink-3">
          No tienes permiso para crear OCs en ninguna empresa del grupo.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-8 py-7">
      <div className="mb-6">
        <Link
          href="/finanzas/oc"
          className="text-[12px] text-ink-3 hover:text-ink-1"
        >
          ← Órdenes de compra
        </Link>
        <h1 className="mt-2 text-[28px] font-semibold leading-tight tracking-[-0.02em]">
          Importación masiva de OCs
        </h1>
        <p className="mt-1 text-[13px] text-ink-3">
          Sube un CSV/TSV con OCs históricas. El sistema valida empresa,
          proveedor (por RFC) y proyecto, e ignora duplicados por número.
        </p>
      </div>

      <ImportOCForm />
    </div>
  );
}
