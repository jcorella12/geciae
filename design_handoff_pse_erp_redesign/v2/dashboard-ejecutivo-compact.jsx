/* global React, Icons, KpiV2, DualBar, Stat, Sparkline, LineChart, BarChart, Donut */

// ================================================================
// Dashboard EJECUTIVO v2 — variante COMPACTA
// Misma información, 30% menos altura. Power-user oriented.
// ================================================================

const PROY_C = [
  { code: 'PRY-031', name: 'Torre Polanco · Etapa 2',     pm: 'AM', avance: 68, plan: 72, presup: 48.2, ejer: 32.6, riesgo: 'warning', dso: 12 },
  { code: 'PRY-028', name: 'Bodega Industrial Querétaro', pm: 'MR', avance: 92, plan: 90, presup: 28.4, ejer: 26.1, riesgo: 'success', dso: 5 },
  { code: 'PRY-035', name: 'Centro Comercial Pachuca',    pm: 'LT', avance: 41, plan: 55, presup: 91.0, ejer: 58.7, riesgo: 'danger',  dso: 22 },
  { code: 'PRY-039', name: 'Remodel. Of. Corporativas',   pm: 'PV', avance: 22, plan: 25, presup: 12.6, ejer: 3.1,  riesgo: 'success', dso: 0  },
  { code: 'PRY-041', name: 'Planta Tlalnepantla',         pm: 'JS', avance: 8,  plan: 12, presup: 64.5, ejer: 5.2,  riesgo: 'warning', dso: 0  },
  { code: 'PRY-027', name: 'Edificio Reforma Sur',        pm: 'AM', avance: 78, plan: 80, presup: 36.0, ejer: 28.3, riesgo: 'success', dso: 0  },
  { code: 'PRY-033', name: 'Hospital Cuajimalpa Fase 1',  pm: 'CR', avance: 52, plan: 60, presup: 124.0,ejer: 64.5, riesgo: 'warning', dso: 8  },
];

function DashboardEjecutivoCompactoV2() {
  return (
    <div className="app-v2" data-empresa="pse" data-density="compact" style={{ height: '100%' }}>
      <div className="shell">
        <SidebarV2 active="dashboard"/>
        <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <TopbarV2 crumbs={['Inicio', 'Dashboard ejecutivo']} createLabel="Crear"/>
          <div className="page" style={{ padding: '16px 20px' }}>
            {/* HEADER compacto */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
                <div style={{ fontSize: 18, fontWeight: 600, letterSpacing: '-0.02em' }}>Dashboard ejecutivo</div>
                <span className="muted tiny">Mié 15 may · 4 empresas · MXN 17.42</span>
              </div>
              <div className="row">
                <button className="btn sm">{Icons.calendar} May 2024</button>
                <button className="btn sm">{Icons.filter} Filtros</button>
                <button className="btn sm">{Icons.download}</button>
              </div>
            </div>

            {/* Banner compacto: 8 KPIs en una fila */}
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: 1,
              background: 'var(--border)', border: '1px solid var(--border)',
              borderRadius: 10, overflow: 'hidden', marginBottom: 14
            }}>
              {[
                ['Ingresos mes', '$74.3M', '+25%', 'up',   'var(--brand)'],
                ['Margen op.',   '22.4%',  '+1.8pp', 'up', 'var(--success)'],
                ['Cash',         '$48.6M', '-6.2%', 'down','var(--accent)'],
                ['CxC',          '$92.1M', 'DSO 47','flat','var(--warning)'],
                ['Proy. activos','12',    '1 riesgo','flat','var(--ink-2)'],
                ['Avance pond.', '58.4%',  '-2.1pp','down','var(--brand)'],
                ['OC pend.',     '23',     '12 urg','flat','var(--accent)'],
                ['Headcount',    '284',    '92% asist','flat','var(--ink-2)'],
              ].map(([lbl, val, dlt, dir, col], i) => (
                <div key={i} style={{ background: 'white', padding: '10px 12px' }}>
                  <div style={{ fontSize: 9.5, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>{lbl}</div>
                  <div style={{ fontSize: 18, fontWeight: 600, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em', marginTop: 3 }}>{val}</div>
                  <div style={{ fontSize: 10.5, marginTop: 3,
                    color: dir === 'up' ? 'var(--success-deep)' : dir === 'down' ? 'var(--danger-deep)' : 'var(--ink-3)',
                    fontVariantNumeric: 'tabular-nums', fontWeight: 500 }}>
                    {dir === 'up' ? '▲' : dir === 'down' ? '▼' : '→'} {dlt}
                  </div>
                </div>
              ))}
            </div>

            {/* FILA principal: 3 cols */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
              {/* Cashflow */}
              <div className="panel">
                <div className="panel-head" style={{ padding: '10px 14px' }}>
                  <h3 style={{ fontSize: 13 }}>Flujo de efectivo · 6 meses</h3>
                  <div className="tabs">
                    <span className="tab">3M</span>
                    <span className="tab active">6M</span>
                    <span className="tab">YTD</span>
                  </div>
                </div>
                <div className="panel-body" style={{ padding: 12 }}>
                  <LineChart w={580} h={170} labels={['Dic','Ene','Feb','Mar','Abr','May']}
                    series={[
                      { name: 'Ingresos', color: 'var(--brand)', data: [4200,5100,4800,6300,5900,7400] },
                      { name: 'Egresos',  color: 'var(--accent)', data: [3800,4400,4900,5100,5400,5800], dashed: true },
                    ]}/>
                </div>
              </div>

              {/* Empresas */}
              <div className="panel">
                <div className="panel-head" style={{ padding: '10px 14px' }}>
                  <h3 style={{ fontSize: 13 }}>Por empresa</h3>
                  <span className="muted tiny">may</span>
                </div>
                <div className="panel-body" style={{ padding: 12 }}>
                  {[
                    ['PSE Energía',     38, 'var(--c-pse)',    '$28.2M', '+12%'],
                    ['CIAE Construcc.', 24, 'var(--c-ciae)',   '$17.8M', '+8%'],
                    ['IED Inmob.',      16, 'var(--c-ied)',    '$11.9M', '-3%'],
                    ['Limson',          22, 'var(--c-limson)', '$16.4M', '+18%'],
                  ].map(([n, p, c, m, d]) => (
                    <div key={n} style={{ marginBottom: 10 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, fontSize: 12 }}>
                        <span style={{ width: 7, height: 7, borderRadius: 2, background: c }}/>
                        <span style={{ flex: 1, fontWeight: 500 }}>{n}</span>
                        <span className="mono">{m}</span>
                        <span className="mono" style={{ color: d.startsWith('-') ? 'var(--danger-deep)' : 'var(--success-deep)', fontSize: 10.5 }}>{d}</span>
                      </div>
                      <div className="bar" style={{ height: 4 }}><span style={{ width: `${p*2}%`, background: c }}/></div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Alertas compactas */}
              <div className="panel">
                <div className="panel-head" style={{ padding: '10px 14px' }}>
                  <h3 style={{ fontSize: 13 }}>Alertas · 24h</h3>
                  <span className="badge danger" style={{ height: 18, fontSize: 10.5 }}>5 nuevas</span>
                </div>
                <div className="panel-body" style={{ padding: 0 }}>
                  {[
                    ['danger',  'Sobrecosto >8% en CC Pachuca',    '2h'],
                    ['warning', '3 OC esperan VoBo >48h',            '4h'],
                    ['warning', 'Curva-S Polanco -4 pts vs plan',     '6h'],
                    ['danger',  'Stock crítico: cemento Pachuca',    '8h'],
                    ['info',    'Cobro confirmado · $2.4M Granada',  '12h'],
                  ].map(([sev, txt, t], i) => (
                    <div key={i} style={{ padding: '7px 14px', borderBottom: '1px solid var(--divider)',
                      display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 12 }}>
                      <span className={`status-dot ${sev}`} style={{ marginTop: 5 }}/>
                      <span style={{ flex: 1, lineHeight: 1.35 }}>{txt}</span>
                      <span className="muted" style={{ fontSize: 10.5 }}>{t}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Tabla compacta: proyectos */}
            <div className="panel" style={{ marginBottom: 12 }}>
              <div className="panel-head" style={{ padding: '10px 14px' }}>
                <h3 style={{ fontSize: 13 }}>Proyectos activos · 12</h3>
                <div className="row">
                  <span className="badge brand" style={{ height: 18, fontSize: 10.5 }}>Todos</span>
                  <span className="badge" style={{ height: 18, fontSize: 10.5 }}>Riesgo</span>
                  <span className="badge" style={{ height: 18, fontSize: 10.5 }}>Atrasados</span>
                </div>
              </div>
              <div className="panel-body flush">
                <table className="tbl">
                  <thead>
                    <tr>
                      <th style={{ width: 28 }}></th>
                      <th>Proyecto</th>
                      <th>PM</th>
                      <th style={{ width: 180 }}>Avance / plan</th>
                      <th className="num">Presup.</th>
                      <th className="num">Ejerc.</th>
                      <th className="num">% Ejerc.</th>
                      <th className="num">CxC vencido</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {PROY_C.map(p => (
                      <tr key={p.code}>
                        <td><span className={`status-dot ${p.riesgo}`}/></td>
                        <td>
                          <span style={{ fontWeight: 500 }}>{p.name}</span>
                          <span className="mono muted" style={{ marginLeft: 8, fontSize: 10.5 }}>{p.code}</span>
                        </td>
                        <td>
                          <span style={{ display: 'inline-flex', width: 20, height: 20, borderRadius: '50%',
                            background: 'var(--bg-3)', fontSize: 9, fontWeight: 600,
                            alignItems: 'center', justifyContent: 'center', color: 'var(--ink-2)' }}>{p.pm}</span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <DualBar planned={p.plan} actual={p.avance} max={100} height={14}/>
                            <span className="mono tnum" style={{ fontSize: 11, minWidth: 56,
                              color: p.avance < p.plan ? 'var(--danger-deep)' : 'var(--ink-2)' }}>
                              {p.avance}/{p.plan}
                            </span>
                          </div>
                        </td>
                        <td className="num mono">${p.presup.toFixed(1)}M</td>
                        <td className="num mono">${p.ejer.toFixed(1)}M</td>
                        <td className="num mono" style={{ color: p.ejer/p.presup > p.avance/100 ? 'var(--danger-deep)' : 'var(--ink-2)' }}>
                          {Math.round(p.ejer/p.presup*100)}%
                        </td>
                        <td className="num mono" style={{ color: p.dso > 15 ? 'var(--danger-deep)' : p.dso > 0 ? 'var(--warning-deep)' : 'var(--ink-3)' }}>
                          {p.dso > 0 ? `${p.dso}d` : '—'}
                        </td>
                        <td><button className="btn ghost sm">{Icons.arrowRight}</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* FILA bottom: 4 mini-paneles */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
              <div className="panel">
                <div className="panel-head" style={{ padding: '10px 14px' }}><h3 style={{ fontSize: 13 }}>Inventario crítico</h3></div>
                <div className="panel-body" style={{ padding: 0 }}>
                  {[
                    ['Cemento CPC 30R', 12, 80,  'sacos', 'danger'],
                    ['Cable THW Cal.12', 8, 25,  'rollos','danger'],
                    ['Varilla #4',     84, 200, 'pzas',  'warning'],
                    ['Block 12×20×40',320, 500, 'pzas',  'warning'],
                  ].map(([n, s, m, u, sev]) => (
                    <div key={n} style={{ padding: '8px 14px', borderBottom: '1px solid var(--divider)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, marginBottom: 4 }}>
                        <span style={{ fontWeight: 500 }}>{n}</span>
                        <span className={sev === 'danger' ? 'mono' : 'mono'} style={{ color: sev === 'danger' ? 'var(--danger-deep)' : 'var(--warning-deep)' }}>{s}/{m}</span>
                      </div>
                      <div className={`bar ${sev}`} style={{ height: 4 }}><span style={{ width: `${(s/m)*100}%` }}/></div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="panel">
                <div className="panel-head" style={{ padding: '10px 14px' }}><h3 style={{ fontSize: 13 }}>Top clientes YTD</h3></div>
                <div className="panel-body" style={{ padding: 0 }}>
                  {[
                    ['Inmob. Granada',   68.4, 'success'],
                    ['Grupo MZ',         54.2, 'warning'],
                    ['Logística Bajío',  41.7, 'success'],
                    ['Banca Norte',      28.1, 'success'],
                  ].map(([n, v, s]) => (
                    <div key={n} style={{ padding: '8px 14px', borderBottom: '1px solid var(--divider)',
                      display: 'flex', alignItems: 'center', gap: 8, fontSize: 11.5 }}>
                      <span className={`status-dot ${s}`}/>
                      <span style={{ flex: 1, fontWeight: 500 }}>{n}</span>
                      <span className="mono">${v.toFixed(1)}M</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="panel">
                <div className="panel-head" style={{ padding: '10px 14px' }}><h3 style={{ fontSize: 13 }}>Cobros 30d</h3></div>
                <div className="panel-body" style={{ padding: 12 }}>
                  <div style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>$42.6M</div>
                  <div className="muted tiny" style={{ marginBottom: 10 }}>14 facturas · 8 clientes</div>
                  <BarChart w={300} h={90} data={[
                    { label: 'S1', value: 8400 }, { label: 'S2', value: 12100 },
                    { label: 'S3', value: 14800 }, { label: 'S4', value: 7300 },
                  ]}/>
                </div>
              </div>

              <div className="panel">
                <div className="panel-head" style={{ padding: '10px 14px' }}><h3 style={{ fontSize: 13 }}>Capex 2024</h3></div>
                <div className="panel-body" style={{ padding: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
                    <div style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.02em' }}>$168M</div>
                    <span className="mono muted tiny">de $245M</span>
                  </div>
                  <div className="bar thick" style={{ marginBottom: 10 }}><span style={{ width: '68.6%' }}/></div>
                  {[
                    ['Equipo',     38, 'var(--brand)'],
                    ['Materiales', 52, 'var(--accent)'],
                    ['Subcontr.',  42, 'var(--c-ciae)'],
                    ['Otros',      36, 'var(--ink-4)'],
                  ].map(([n, p, c]) => (
                    <div key={n} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '2px 0', fontSize: 11 }}>
                      <span style={{ width: 6, height: 6, borderRadius: 2, background: c }}/>
                      <span style={{ flex: 1 }}>{n}</span>
                      <span className="mono">${p}M</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div style={{ height: 16 }}/>
          </div>
        </div>
      </div>
    </div>
  );
}

window.DashboardEjecutivoCompactoV2 = DashboardEjecutivoCompactoV2;
