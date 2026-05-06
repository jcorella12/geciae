"use client";

import { useRouter } from "next/navigation";

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
          ? `/finanzas/vista-real?empresa_id=${e.target.value}`
          : "/finanzas/vista-real";
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
