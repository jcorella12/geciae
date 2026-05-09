"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

export function SelectorEmpresa({
  empresas,
  valor,
}: {
  empresas: Array<{ id: string; codigo: string; nombre_comercial: string | null }>;
  valor: string | undefined;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  function update(v: string) {
    const next = new URLSearchParams(sp.toString());
    if (v) next.set("empresa_id", v);
    else next.delete("empresa_id");
    const qs = next.toString();
    router.push(`${pathname}${qs ? `?${qs}` : ""}`);
  }

  return (
    <select
      value={valor ?? ""}
      onChange={(e) => update(e.target.value)}
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
