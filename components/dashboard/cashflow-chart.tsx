"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const fmtMxnShort = (n: number) => {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}k`;
  return `$${n.toFixed(0)}`;
};

const fmtMxn = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
  maximumFractionDigits: 0,
});

export type CashflowPoint = {
  /** Etiqueta corta del mes — e.g. "May" */
  mes: string;
  ingresos: number;
  egresos: number;
  margen: number;
};

export function CashflowChart({ data }: { data: CashflowPoint[] }) {
  if (data.length === 0 || data.every((d) => d.ingresos === 0 && d.egresos === 0)) {
    return (
      <div className="flex h-[220px] items-center justify-center text-sm text-ink-3">
        Aún no hay suficientes datos para graficar.
      </div>
    );
  }
  return (
    <div style={{ width: "100%", height: 220 }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 8, bottom: 4, left: 0 }}>
          <defs>
            <linearGradient id="ingreso-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--brand)" stopOpacity={0.18} />
              <stop offset="100%" stopColor="var(--brand)" stopOpacity={0.02} />
            </linearGradient>
            <linearGradient id="egreso-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--accent-token)" stopOpacity={0.14} />
              <stop offset="100%" stopColor="var(--accent-token)" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="var(--divider)" strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="mes"
            stroke="var(--ink-4)"
            fontSize={11}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            stroke="var(--ink-4)"
            fontSize={10}
            tickLine={false}
            axisLine={false}
            tickFormatter={fmtMxnShort}
            width={50}
          />
          <Tooltip
            contentStyle={{
              background: "var(--surface)",
              border: "1px solid var(--border-token)",
              borderRadius: 8,
              fontSize: 12,
              boxShadow: "var(--shadow-md)",
            }}
            labelStyle={{
              fontSize: 11,
              color: "var(--ink-3)",
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              marginBottom: 4,
            }}
            itemStyle={{
              fontFamily: "var(--font-mono-stack)",
              padding: "2px 0",
            }}
            formatter={(value: number, name: string) => [
              fmtMxn.format(value),
              name === "ingresos"
                ? "Ingresos"
                : name === "egresos"
                  ? "Egresos"
                  : "Margen",
            ]}
          />
          <Area
            type="monotone"
            dataKey="ingresos"
            name="ingresos"
            stroke="var(--brand)"
            strokeWidth={2}
            fill="url(#ingreso-fill)"
            dot={{ r: 3, fill: "var(--brand)", strokeWidth: 0 }}
            activeDot={{ r: 5, fill: "var(--brand)", strokeWidth: 2, stroke: "var(--surface)" }}
          />
          <Area
            type="monotone"
            dataKey="egresos"
            name="egresos"
            stroke="var(--accent-token)"
            strokeWidth={2}
            strokeDasharray="4 3"
            fill="url(#egreso-fill)"
            dot={{ r: 3, fill: "var(--accent-token)", strokeWidth: 0 }}
            activeDot={{ r: 5, fill: "var(--accent-token)", strokeWidth: 2, stroke: "var(--surface)" }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function CashflowLegend({
  margenMes,
}: {
  margenMes: number;
}) {
  return (
    <div className="mt-3 flex items-center gap-5 text-[12px]">
      <span className="flex items-center gap-2">
        <span className="inline-block h-0.5 w-3 bg-brand" />
        Ingresos
      </span>
      <span className="flex items-center gap-2">
        <span
          className="inline-block h-0.5 w-3"
          style={{
            backgroundImage:
              "repeating-linear-gradient(to right, var(--accent-token), var(--accent-token) 3px, transparent 3px, transparent 6px)",
          }}
        />
        Egresos
      </span>
      <span className="ml-auto text-ink-3">
        Margen mes actual:{" "}
        <strong
          className={margenMes >= 0 ? "text-ok-deep" : "text-danger-deep"}
        >
          {margenMes >= 0 ? "+" : ""}
          {fmtMxn.format(margenMes)}
        </strong>
      </span>
    </div>
  );
}
