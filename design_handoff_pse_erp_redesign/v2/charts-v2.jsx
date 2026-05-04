/* global React, Icons, Sparkline, BarChart, LineChart, Donut */

// ================================================================
// Shared chart helpers v2 — usa los del archivo shared.jsx ya existente
// y añade utilidades nuevas para el dashboard ejecutivo.
// ================================================================

// Mini KPI con sparkline integrado
const KpiV2 = ({ label, value, unit, delta, sub, trend, featured, accent }) => (
  <div className={`kpi ${featured ? 'feat' : ''}`}>
    <div className="head">
      <div className="label">{label}</div>
      {trend && <Sparkline data={trend} w={70} h={22}
        color={featured ? 'rgba(255,255,255,0.85)' : (accent || 'var(--brand)')} fill />}
    </div>
    <div className="value">{value}{unit && <span className="unit">{unit}</span>}</div>
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
      {delta && (
        <span className={`delta ${delta.dir}`}>
          {delta.dir === 'up' ? '▲' : delta.dir === 'down' ? '▼' : '→'} {delta.text}
        </span>
      )}
      {sub && <span className="sub">{sub}</span>}
    </div>
  </div>
);

// Barra dual: planned vs actual (estilo curva-S simplificada)
const DualBar = ({ planned, actual, max, height = 20 }) => {
  const pp = Math.min(100, (planned / max) * 100);
  const ap = Math.min(100, (actual / max) * 100);
  const over = actual > planned;
  return (
    <div style={{ position: 'relative', height, background: 'var(--bg-3)', borderRadius: 4, overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0, width: `${pp}%`, background: 'var(--ink-5)' }}/>
      <div style={{ position: 'absolute', inset: 0, width: `${ap}%`,
        background: over ? 'var(--danger)' : 'var(--brand)',
        opacity: 0.92 }}/>
    </div>
  );
};

// Bloque "stat con etiqueta" para usar en filas de cards
const Stat = ({ label, value, sub, color = 'var(--ink-1)' }) => (
  <div>
    <div style={{ fontSize: 10.5, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>{label}</div>
    <div style={{ fontSize: 18, fontWeight: 600, fontVariantNumeric: 'tabular-nums', color, marginTop: 4, letterSpacing: '-0.02em' }}>{value}</div>
    {sub && <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 2 }}>{sub}</div>}
  </div>
);

// Heatmap simple 7×N (para asistencia/avance)
const HeatGrid = ({ rows, cols, getCell, w = 16, gap = 3 }) => (
  <div style={{ display: 'inline-grid',
    gridTemplateColumns: `repeat(${cols}, ${w}px)`,
    gap }}>
    {Array.from({ length: rows * cols }).map((_, i) => {
      const row = Math.floor(i / cols), col = i % cols;
      const { color, title } = getCell(row, col);
      return <div key={i} title={title} style={{ width: w, height: w, borderRadius: 3, background: color }}/>;
    })}
  </div>
);

window.KpiV2 = KpiV2;
window.DualBar = DualBar;
window.Stat = Stat;
window.HeatGrid = HeatGrid;
