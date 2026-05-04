"use client";

import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const MESES_LABEL = [
  "Ene",
  "Feb",
  "Mar",
  "Abr",
  "May",
  "Jun",
  "Jul",
  "Ago",
  "Sep",
  "Oct",
  "Nov",
  "Dic",
];

const fmtMxnShort = (n: number) =>
  new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(n);

/**
 * Gráficas Recharts del tab "Estados Financieros" del dashboard de
 * cumplimiento. 12 meses en eje X.
 */
export function CumplimientoCharts({
  data,
}: {
  data: Array<{
    mes: number;
    utilidad: number;
    ingresos: number;
    egresos: number;
    iva_trasladado: number;
    iva_acreditable: number;
  }>;
}) {
  // Construye 12 puntos (un mes por entrada). Si no hay registro, valores 0.
  const series = Array.from({ length: 12 }, (_, i) => {
    const mes = i + 1;
    const r = data.find((d) => d.mes === mes);
    return {
      mes: MESES_LABEL[i],
      utilidad: r?.utilidad ?? 0,
      ingresos: r?.ingresos ?? 0,
      egresos: r?.egresos ?? 0,
      iva_trasladado: r?.iva_trasladado ?? 0,
      iva_acreditable: r?.iva_acreditable ?? 0,
    };
  });

  return (
    <div className="space-y-4">
      <ChartCard title="Utilidad neta mes a mes">
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={series}>
            <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" />
            <XAxis
              dataKey="mes"
              tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
            />
            <YAxis
              tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
              tickFormatter={(v) => fmtMxnShort(v)}
            />
            <Tooltip formatter={(v: number) => fmtMxnShort(v)} />
            <Line
              type="monotone"
              dataKey="utilidad"
              name="Utilidad"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              dot={{ r: 3 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Ingresos vs Egresos">
        <ResponsiveContainer width="100%" height={260}>
          <ComposedChart data={series}>
            <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" />
            <XAxis
              dataKey="mes"
              tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
            />
            <YAxis
              tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
              tickFormatter={(v) => fmtMxnShort(v)}
            />
            <Tooltip formatter={(v: number) => fmtMxnShort(v)} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar dataKey="ingresos" name="Ingresos" fill="#10b981" />
            <Bar dataKey="egresos" name="Egresos" fill="#f97316" />
            <Line
              type="monotone"
              dataKey="utilidad"
              name="Utilidad"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              dot={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="IVA Trasladado vs Acreditable">
        <ResponsiveContainer width="100%" height={220}>
          <ComposedChart data={series}>
            <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" />
            <XAxis
              dataKey="mes"
              tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
            />
            <YAxis
              tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
              tickFormatter={(v) => fmtMxnShort(v)}
            />
            <Tooltip formatter={(v: number) => fmtMxnShort(v)} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar dataKey="iva_trasladado" name="IVA trasladado" fill="#3b82f6" />
            <Bar dataKey="iva_acreditable" name="IVA acreditable" fill="#a855f7" />
          </ComposedChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  );
}

function ChartCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border border-border bg-card p-4 shadow-sm">
      <h3 className="mb-3 text-[13.5px] font-semibold">{title}</h3>
      {children}
    </section>
  );
}
