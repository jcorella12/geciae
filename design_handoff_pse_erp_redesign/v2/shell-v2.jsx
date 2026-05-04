/* global React, Icons */

// ================================================================
// PSE ERP v2 — Shell (Sidebar navy + Topbar)
// ================================================================

const NAV_V2 = {
  Director: [
    { g: 'PRINCIPAL', items: [
      ['dashboard', 'Dashboard',     'dashboard'],
      ['midia',     'Mi día',        'calendar'],
    ]},
    { g: 'OPERACIÓN', items: [
      ['proyectos', 'Proyectos',     'obras', '12'],
      ['finanzas',  'Finanzas',      'presupuesto'],
      ['comercial', 'Clientes',      'building'],
      ['inventario','Inventario',    'inventario'],
      ['compras',   'Compras',       'oc', '23'],
    ]},
    { g: 'EQUIPO', items: [
      ['personas',  'Personas',      'rrhh'],
      ['proveedores','Proveedores',  'proveedores'],
      ['calidad',   'Calidad',       'check'],
    ]},
    { g: 'CONTROL', items: [
      ['aprobaciones','Aprobaciones','aprobaciones', '12'],
      ['reportes',  'Reportes',      'reportes'],
    ]},
  ],
  Empleado: [
    { g: 'PRINCIPAL', items: [
      ['midia',     'Mi día',        'calendar'],
      ['nomina',    'Mi nómina',     'presupuesto'],
      ['cursos',    'Capacitación',  'cursos'],
      ['vacaciones','Vacaciones',    'calendar'],
      ['gastos',    'Gastos',        'oc'],
    ]},
  ],
};

const EMPRESAS = [
  { id: 'pse',    name: 'PSE Energía',     short: 'PSE',    color: 'var(--c-pse)' },
  { id: 'ciae',   name: 'CIAE Construcción', short: 'CIAE', color: 'var(--c-ciae)' },
  { id: 'ied',    name: 'IED Inmobiliaria', short: 'IED',   color: 'var(--c-ied)' },
  { id: 'limson', name: 'Limson',           short: 'LIMSON',color: 'var(--c-limson)' },
];

const SidebarV2 = ({ role = 'Director', active = 'dashboard', empresa = 'pse', user = { name: 'Roberto Hernández', initials: 'RH', role: 'DIRECTOR GENERAL' } }) => {
  const nav = NAV_V2[role] || NAV_V2.Director;
  const emp = EMPRESAS.find(e => e.id === empresa) || EMPRESAS[0];
  return (
    <aside className="sb">
      <div className="sb-brand">
        <div className="logo">
          <svg viewBox="0 0 32 32" width="100%" height="100%">
            <rect x="2" y="2" width="28" height="28" rx="5" fill="var(--brand)"/>
            <path d="M9 22V10h6.2c2.6 0 4.4 1.6 4.4 4 0 2.5-1.8 4-4.4 4H12v4H9zm3-6.4h2.8c1.2 0 2-.6 2-1.6s-.8-1.6-2-1.6H12v3.2z" fill="white"/>
            <circle cx="22" cy="20" r="2.5" fill="var(--accent)"/>
          </svg>
        </div>
        <div>
          <div className="name">PSE Group</div>
          <div className="sub">ERP · OPERACIÓN</div>
        </div>
      </div>

      <div className="sb-empresa">
        <span className="dot" style={{ background: emp.color }}/>
        <div className="meta">
          <div className="lbl-emp">Empresa activa</div>
          <div className="name-emp">{emp.name}</div>
        </div>
        <svg className="chev" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 9l4-4 4 4M8 15l4 4 4-4"/></svg>
      </div>

      <div className="sb-nav">
        {nav.map(sec => (
          <div className="sb-group" key={sec.g}>
            <div className="sb-glabel">{sec.g}</div>
            {sec.items.map(([id, lbl, icon, count]) => (
              <div key={id} className={`sb-item ${active === id ? 'active' : ''}`}>
                {Icons[icon] || Icons.dashboard}
                <span style={{ flex: 1 }}>{lbl}</span>
                {count && <span className="count">{count}</span>}
              </div>
            ))}
          </div>
        ))}
      </div>

      <div className="sb-foot">
        <div className="av">{user.initials}</div>
        <div style={{ minWidth: 0 }}>
          <div className="name">{user.name}</div>
          <div className="role">{user.role}</div>
        </div>
        <div style={{ marginLeft: 'auto', color: 'oklch(0.75 0.04 252)', cursor: 'pointer' }}>
          {Icons.settings}
        </div>
      </div>
    </aside>
  );
};

const TopbarV2 = ({ crumbs = [], children, withCreate = true, createLabel = 'Crear' }) => (
  <header className="tb">
    <div className="crumbs">
      {crumbs.map((c, i) => (
        <React.Fragment key={i}>
          {i > 0 && <span className="sep">/</span>}
          <span className={i === crumbs.length - 1 ? 'here' : ''}>{c}</span>
        </React.Fragment>
      ))}
    </div>
    <div className="search">
      {Icons.search}
      <span>Buscar proyectos, OC, personas…</span>
      <span className="kbd">⌘K</span>
    </div>
    {children}
    <div className="tb-icon">
      {Icons.bell}
      <span className="pip"/>
    </div>
    {withCreate && (
      <button className="btn primary">
        {Icons.plus} {createLabel}
      </button>
    )}
    <div className="tb-av">RH</div>
  </header>
);

window.SidebarV2 = SidebarV2;
window.TopbarV2 = TopbarV2;
window.EMPRESAS = EMPRESAS;
