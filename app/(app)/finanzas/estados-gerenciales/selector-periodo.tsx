"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

const MESES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

export function SelectorPeriodoMensual({
  anio,
  mes,
}: {
  anio: number;
  mes: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  function update(nuevoAnio: number, nuevoMes: number) {
    const next = new URLSearchParams(sp.toString());
    next.set("anio", String(nuevoAnio));
    next.set("mes", String(nuevoMes));
    router.push(`${pathname}?${next.toString()}`);
  }

  const ahora = new Date();
  const anios = [
    ahora.getFullYear() - 2,
    ahora.getFullYear() - 1,
    ahora.getFullYear(),
  ];

  return (
    <div className="flex items-center gap-2">
      <select
        value={anio}
        onChange={(e) => update(Number(e.target.value), mes)}
        className="rounded-md border border-border bg-card px-2.5 py-1.5 text-[12.5px]"
      >
        {anios.map((a) => (
          <option key={a} value={a}>
            {a}
          </option>
        ))}
      </select>
      <select
        value={mes}
        onChange={(e) => update(anio, Number(e.target.value))}
        className="rounded-md border border-border bg-card px-2.5 py-1.5 text-[12.5px]"
      >
        {MESES.map((m, idx) => (
          <option key={m} value={idx + 1}>
            {m}
          </option>
        ))}
      </select>
    </div>
  );
}
