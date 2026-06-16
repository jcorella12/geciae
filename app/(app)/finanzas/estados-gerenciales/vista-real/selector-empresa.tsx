"use client";

import { useRouter } from "next/navigation";

const BASE = "/finanzas/estados-gerenciales/vista-real";

export function SelectorEmpresa({
  empresas,
  valor,
}: {
  empresas: Array<{ id: string; codigo: string; nombre_comercial: string | null }>;
  valor: string | undefined;
}) {
  const router = useRouter();

  return (
    <select
      value={valor ?? ""}
      onChange={(e) => {
        const url = e.target.value
          ? `${BASE}?empresa_id=${e.target.value}`
          : BASE;
        router.push(url);
      }}
      className="rounded-md border border-border bg-card px-3 py-1.5 text-[12.5px]"
    >
      <option value="">Consolidado del grupo</option>
      {empresas.map((e) => (
        <option key={e.id} value={e.id}>
          {e.codigo} — {e.nombre_comercial}
        </option>
      ))}
    </select>
  );
}
