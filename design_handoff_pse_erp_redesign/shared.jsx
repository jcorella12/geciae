/* global React, Icons */
// ================================================================
// Componentes compartidos del ERP
// Sidebar, Topbar, KPIs, Charts SVG, paneles
// ================================================================

// ---------- Mini sparkline (SVG, ligero) ----------
const Sparkline = ({ data, w = 80, h = 24, color = "currentColor", fill = false }) => {
  const min = Math.min(...data), max = Math.max(...data);
  const range = max - min || 1;
  const stepX = w / (data.length - 1);
  const points = data.map((v, i) => `${i * stepX},${h - ((v - min) / range) * (h - 2) - 1}`);
  const d = "M" + points.join(" L");
  const fillD = fill ? `${d} L${w},${h} L0,${h} Z` : null;
  return (
    <svg width={w} height={h} style={{ display: 'block' }}>
      {fill && <path d={fillD} fill={color} fillOpacity="0.12" />}
      <path d={d} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};

// ---------- Bar chart simple (SVG) ----------
const BarChart = ({ data, w = 560, h = 180, paired = false }) => {
  // data: [{ label, planned, actual }] si paired, [{ label, value }] si no
  const max = Math.max(...data.flatMap(d => paired ? [d.planned, d.actual] : [d.value]));
  const padL = 36, padB = 24, padT = 8, padR = 8;
  const cw = w - padL - padR;
  const ch = h - padT - padB;
  const groupW = cw / data.length;
  const barW = paired ? Math.min(18, groupW * 0.32) : Math.min(28, groupW * 0.55);

  // gridlines
  const gridLines = [0, 0.25, 0.5, 0.75, 1];
  return (
    <svg width="100%" viewBox={`0 0 ${w} ${h}`} style={{ display: 'block' }}>
      {gridLines.map((g, i) => (
        <line key={i} x1={padL} x2={w - padR} y1={padT + ch * (1 - g)} y2={padT + ch * (1 - g)}
          stroke="var(--divider)" strokeWidth="1" />
      ))}
      {gridLines.map((g, i) => (
        <text key={`l${i}`} x={padL - 6} y={padT + ch * (1 - g) + 3} textAnchor="end"
          fontSize="9" fill="var(--ink-4)" fontFamily="var(--font-mono)">
          {Math.round(max * g / 1000)}k
        </text>
      ))}
      {data.map((d, i) => {
        const cx = padL + groupW * i + groupW / 2;
        if (paired) {
          const ph = (d.planned / max) * ch;
          const ah = (d.actual / max) * ch;
          return (
            <g key={i}>
              <rect x={cx - barW - 1} y={padT + ch - ph} width={barW} height={ph} fill="var(--ink-5)" rx="1" />
              <rect x={cx + 1} y={padT + ch - ah} width={barW} height={ah}
                fill={d.actual > d.planned ? "var(--danger)" : "var(--accent)"} rx="1" />
              <text x={cx} y={h - 8} textAnchor="middle" fontSize="10" fill="var(--ink-3)">{d.label}</text>
            </g>
          );
        }
        const bh = (d.value / max) * ch;
        return (
          <g key={i}>
            <rect x={cx - barW / 2} y={padT + ch - bh} width={barW} height={bh} fill="var(--accent)" rx="1" />
            <text x={cx} y={h - 8} textAnchor="middle" fontSize="10" fill="var(--ink-3)">{d.label}</text>
          </g>
        );
      })}
    </svg>
  );
};

// ---------- Line chart (cash flow) ----------
const LineChart = ({ series, w = 560, h = 180, labels = [] }) => {
  // series: [{ name, color, data: [...] }]
  const all = series.flatMap(s => s.data);
  const min = Math.min(...all, 0);
  const max = Math.max(...all);
  const range = max - min || 1;
  const padL = 40, padR = 8, padB = 24, padT = 8;
  const cw = w - padL - padR;
  const ch = h - padT - padB;
  const n = series[0].data.length;
  const stepX = cw / (n - 1);
  const yFor = v => padT + ch - ((v - min) / range) * ch;

  return (
    <svg width="100%" viewBox={`0 0 ${w} ${h}`} style={{ display: 'block' }}>
      {[0, 0.25, 0.5, 0.75, 1].map((g, i) => (
        <line key={i} x1={padL} x2={w - padR} y1={padT + ch * g} y2={padT + ch * g}
          stroke="var(--divider)" />
      ))}
      {[0, 0.25, 0.5, 0.75, 1].map((g, i) => {
        const v = max - (max - min) * g;
        return (
          <text key={`y${i}`} x={padL - 6} y={padT + ch * g + 3} textAnchor="end"
            fontSize="9" fill="var(--ink-4)" fontFamily="var(--font-mono)">
            {Math.round(v / 1000)}k
          </text>
        );
      })}
      {labels.map((l, i) => (
        <text key={`x${i}`} x={padL + stepX * i} y={h - 8} textAnchor="middle"
          fontSize="10" fill="var(--ink-3)">{l}</text>
      ))}
      {series.map((s, si) => {
        const pts = s.data.map((v, i) => `${padL + stepX * i},${yFor(v)}`).join(" L");
        return (
          <g key={si}>
            <path d={`M${pts}`} fill="none" stroke={s.color} strokeWidth="1.75"
              strokeLinecap="round" strokeLinejoin="round"
              strokeDasharray={s.dashed ? "4 3" : ""} />
            {s.data.map((v, i) => (
              <circle key={i} cx={padL + stepX * i} cy={yFor(v)} r="2" fill={s.color} />
            ))}
          </g>
        );
      })}
    </svg>
  );
};

// ---------- Donut ----------
const Donut = ({ segments, size = 120, thickness = 16 }) => {
  const total = segments.reduce((s, x) => s + x.value, 0);
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;
  let offset = 0;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--bg-3)" strokeWidth={thickness} />
      {segments.map((s, i) => {
        const len = (s.value / total) * c;
        const dash = `${len} ${c - len}`;
        const el = (
          <circle key={i} cx={size / 2} cy={size / 2} r={r} fill="none"
            stroke={s.color} strokeWidth={thickness}
            strokeDasharray={dash} strokeDashoffset={-offset}
            transform={`rotate(-90 ${size/2} ${size/2})`} />
        );
        offset += len;
        return el;
      })}
    </svg>
  );
};

// ---------- Sidebar ----------
const Sidebar = ({ role = "Director", active = "dashboard", compact = false }) => {
  const NAV = {
    Director: [
      { group: "Resumen", items: [
        { id: "dashboard", label: "Dashboard", icon: "dashboard" },
        { id: "reportes", label: "Reportes", icon: "reportes" },
      ]},
      { group: "Operación", items: [
        { id: "obras", label: "Obras", icon: "obras", count: 7 },
        { id: "presupuesto", label: "Presupuestos", icon: "presupuesto" },
        { id: "oc", label: "Órdenes de compra", icon: "oc", count: 23 },
        { id: "ot", label: "Órdenes de trabajo", icon: "ot" },
        { id: "inventario", label: "Inventario", icon: "inventario" },
      ]},
      { group: "Personas", items: [
        { id: "rrhh", label: "Recursos humanos", icon: "rrhh" },
        { id: "proveedores", label: "Proveedores", icon: "proveedores" },
      ]},
      { group: "Aprobaciones", items: [
        { id: "aprobaciones", label: "Pendientes", icon: "aprobaciones", count: 12 },
      ]},
    ],
    Empleado: [
      { group: "Personal", items: [
        { id: "dashboard", label: "Mi panel", icon: "dashboard" },
        { id: "nomina", label: "Nómina", icon: "presupuesto" },
        { id: "cursos", label: "Capacitación", icon: "cursos" },
        { id: "vacaciones", label: "Vacaciones", icon: "calendar" },
      ]},
    ],
  };
  const sections = NAV[role] || NAV.Director;
  return (
    <aside className="sidebar">
      <div className="sb-brand">
        <div className="logo"><img src="assets/logo-ciae.png" alt="CIAE"/></div>
        <span>CIAE · Obra</span>
      </div>
      {sections.map(sec => (
        <div className="sb-section" key={sec.group}>
          <div className="sb-label">{sec.group}</div>
          {sec.items.map(it => (
            <div key={it.id} className={`sb-item ${active === it.id ? 'active' : ''}`}>
              {Icons[it.icon]}
              <span>{it.label}</span>
              {it.count != null && <span className="count">{it.count}</span>}
            </div>
          ))}
        </div>
      ))}
      <div className="sb-user">
        <div className="av">RH</div>
        <div className="meta">
          <div className="name">Roberto Hernández</div>
          <div className="role">{role}</div>
        </div>
      </div>
    </aside>
  );
};

// ---------- Topbar ----------
const Topbar = ({ active = "Dashboard", role = "Director" }) => {
  const items = ["Dashboard", "Obras", "Presupuestos", "Compras", "Personas", "Reportes"];
  return (
    <header className="topbar">
      <div className="brand">
        <img src="assets/logo-ciae.png" alt="CIAE" style={{ width: 26, height: 26, objectFit: 'contain' }}/>
        CIAE
      </div>
      <nav>
        {items.map(it => (
          <a key={it} className={active === it ? 'active' : ''}>{it}</a>
        ))}
      </nav>
      <div className="search">
        {Icons.search}
        <span>Buscar obras, OC, empleados…</span>
        <span style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--ink-4)',
          fontFamily: 'var(--font-mono)' }}>⌘K</span>
      </div>
      <button className="btn ghost" style={{ width: 32, padding: 0, justifyContent: 'center' }}>
        {Icons.bell}
      </button>
      <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--accent)',
        color: 'white', display: 'grid', placeItems: 'center', fontSize: 11, fontWeight: 600 }}>RH</div>
    </header>
  );
};

// ---------- KPI ----------
const Kpi = ({ label, value, delta, trend, sparkColor = "var(--accent)", sub }) => (
  <div className="kpi">
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
      <div className="label">{label}</div>
      {trend && <Sparkline data={trend} color={sparkColor} fill />}
    </div>
    <div className="value">{value}</div>
    {delta && (
      <div className={`delta ${delta.dir}`}>
        {delta.dir === 'up' ? Icons.arrowUp : delta.dir === 'down' ? Icons.arrowDown : null}
        {delta.text}
        {sub && <span className="muted" style={{ marginLeft: 4 }}>· {sub}</span>}
      </div>
    )}
  </div>
);

// expose
Object.assign(window, { Sparkline, BarChart, LineChart, Donut, Sidebar, Topbar, Kpi });
