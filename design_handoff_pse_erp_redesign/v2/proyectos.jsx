/* global React, Icons, DualBar, Stat, Sparkline, BarChart */

// ================================================================
// Módulo Proyectos v2 — lista + detalle
// ================================================================

const PRY_LIST = [
  { code: 'PRY-2024-031', name: 'Torre Polanco · Etapa 2',     cliente: 'Inmob. Granada',   pm: 'A. Mendoza',  avance: 68, plan: 72, presup: 48.2, ejer: 32.6, riesgo: 'warning', est: 'En curso',  inicio: '12/01', fin: '28/11', team: 4, fase: 'Estructura' },
  { code: 'PRY-2024-028', name: 'Bodega Industrial Querétaro', cliente: 'Logística Bajío',  pm: 'M. Ruiz',     avance: 92, plan: 90, presup: 28.4, ejer: 26.1, riesgo: 'success', est: 'En cierre', inicio: '02/02', fin: '30/05', team: 3, fase: 'Acabados' },
  { code: 'PRY-2024-035', name: 'Centro Comercial Pachuca',    cliente: 'Grupo MZ',         pm: 'L. Torres',   avance: 41, plan: 55, presup: 91.0, ejer: 58.7, riesgo: 'danger',  est: 'En riesgo', inicio: '15/01', fin: '20/12', team: 6, fase: 'Cimentación' },
  { code: 'PRY-2024-039', name: 'Remodel. Of. Corporativas',   cliente: 'Banca Norte',      pm: 'P. Vega',     avance: 22, plan: 25, presup: 12.6, ejer: 3.1,  riesgo: 'success', est: 'En curso',  inicio: '01/04', fin: '15/07', team: 2, fase: 'Demoliciones' },
  { code: 'PRY-2024-041', name: 'Planta Tlalnepantla',         cliente: 'Mun. Tlalnepantla',pm: 'J. Salas',    avance: 8,  plan: 12, presup: 64.5, ejer: 5.2,  riesgo: 'warning', est: 'Iniciado',  inicio: '02/05', fin: '15/02/25', team: 5, fase: 'Movim. tierras' },
  { code: 'PRY-2024-027', name: 'Edificio Reforma Sur',        cliente: 'Inmob. Granada',   pm: 'A. Mendoza',  avance: 78, plan: 80, presup: 36.0, ejer: 28.3, riesgo: 'success', est: 'En curso',  inicio: '08/12/23', fin: '20/09', team: 4, fase: 'Acabados' },
  { code: 'PRY-2024-033', name: 'Hospital Cuajimalpa F1',      cliente: 'Salud Privada',    pm: 'C. Ríos',     avance: 52, plan: 60, presup: 124.0,ejer: 64.5, riesgo: 'warning', est: 'En curso',  inicio: '10/01', fin: '30/03/25', team: 8, fase: 'Estructura' },
];

function ProyectosListaV2() {
  return (
    <div className="app-v2" data-empresa="pse" data-density="comfy" style={{ height: '100%' }}>
      <div className="shell">
        <SidebarV2 active="proyectos"/>
        <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <TopbarV2 crumbs={['Proyectos']} createLabel="Nuevo proyecto"/>
          <div className="page">
            <div className="page-head">
              <div>
                <div className="page-title">Proyectos</div>
                <div className="page-sub">12 activos · $580.7M en cartera · ordenados por riesgo</div>
              </div>
              <div className="page-actions">
                <button className="btn">{Icons.filter} Filtros</button>
                <button className="btn">{Icons.calendar} Vista cronograma</button>
                <button className="btn">{Icons.download}</button>
              </div>
            </div>

            <div className="kpi-row">
              <KpiV2 label="Cartera total" value="$580.7" unit="M MXN"/>
              <KpiV2 label="Avance ponderado" value="58.4" unit="%" delta={{ dir: 'down', text: '-2.1pp' }}/>
              <KpiV2 label="En riesgo" value="3" sub="2 atrasados · 1 sobrecosto" delta={{ dir: 'flat', text: 'Pachuca crítico' }}/>
              <KpiV2 label="Margen ponderado" value="18.2" unit="%" delta={{ dir: 'up', text: '+0.6pp' }}/>
            </div>

            <div className="panel">
              <div className="panel-head">
                <div className="row" style={{ flex: 1 }}>
                  <div className="search" style={{ width: 280, height: 32, background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 7, padding: '0 12px', display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: 'var(--ink-3)' }}>
                    {Icons.search}<span>Buscar por nombre, código, cliente…</span>
                  </div>
                  <span className="badge brand">Todos · 12</span>
                  <span className="badge">En curso · 8</span>
                  <span className="badge warning">En riesgo · 2</span>
                  <span className="badge danger">Atrasados · 1</span>
                  <span className="badge success">En cierre · 1</span>
                </div>
                <div className="row">
                  <button className="btn ghost sm">{Icons.settings}</button>
                </div>
              </div>
              <div className="panel-body flush">
                <table className="tbl">
                  <thead>
                    <tr>
                      <th></th>
                      <th>Proyecto</th>
                      <th>Cliente</th>
                      <th>PM / Equipo</th>
                      <th>Fase</th>
                      <th style={{ width: 200 }}>Avance</th>
                      <th className="num">Presupuesto</th>
                      <th className="num">Ejercido</th>
                      <th>Plazo</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {PRY_LIST.map(p => (
                      <tr key={p.code}>
                        <td><span className={`status-dot ${p.riesgo}`}/></td>
                        <td>
                          <div style={{ fontWeight: 500 }}>{p.name}</div>
                          <div className="mono" style={{ fontSize: 11, color: 'var(--ink-3)' }}>{p.code}</div>
                        </td>
                        <td className="muted">{p.cliente}</td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: 12.5 }}>{p.pm}</span>
                            <span className="badge">{p.team}</span>
                          </div>
                        </td>
                        <td><span className="badge brand">{p.fase}</span></td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <DualBar planned={p.plan} actual={p.avance} max={100} height={14}/>
                            <span className="mono tnum" style={{ fontSize: 11.5, minWidth: 56, color: p.avance < p.plan ? 'var(--danger-deep)' : 'var(--ink-2)' }}>{p.avance}/{p.plan}%</span>
                          </div>
                        </td>
                        <td className="num mono">${p.presup.toFixed(1)}M</td>
                        <td className="num mono">${p.ejer.toFixed(1)}M<div style={{ fontSize: 10.5, color: 'var(--ink-3)' }}>{Math.round(p.ejer/p.presup*100)}%</div></td>
                        <td className="muted" style={{ fontSize: 12 }}>{p.inicio} → {p.fin}</td>
                        <td><button className="btn ghost sm">{Icons.arrowRight}</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ================================================================
// Detalle de proyecto — Torre Polanco
// ================================================================
function ProyectoDetalleV2() {
  return (
    <div className="app-v2" data-empresa="pse" data-density="comfy" style={{ height: '100%' }}>
      <div className="shell">
        <SidebarV2 active="proyectos"/>
        <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <TopbarV2 crumbs={['Proyectos', 'PRY-2024-031', 'Torre Polanco · Etapa 2']} createLabel="Acciones"/>
          <div className="page">
            <div className="page-head">
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                  <span className="status-dot warning"/>
                  <span className="lbl">PRY-2024-031 · ESTRUCTURA · INICIA 12/01 → ENTREGA 28/11</span>
                </div>
                <div className="page-title">Torre Polanco · Etapa 2</div>
                <div className="page-sub">Inmobiliaria Granada · Roberto Hernández (sponsor) · Ana Mendoza (PM) · 4 personas en sitio</div>
              </div>
              <div className="page-actions">
                <button className="btn">{Icons.calendar} Bitácora</button>
                <button className="btn">Curva-S</button>
                <button className="btn primary">{Icons.plus} Reportar avance</button>
              </div>
            </div>

            {/* KPIs del proyecto */}
            <div className="kpi-row">
              <KpiV2 label="Avance" value="68" unit="%" sub="vs 72% planeado" delta={{ dir: 'down', text: '-4 pp' }} trend={[40,48,55,60,64,68]}/>
              <KpiV2 label="Presupuesto" value="$48.2" unit="M" sub="ejercido 67.6%"/>
              <KpiV2 label="Margen" value="16.4" unit="%" delta={{ dir: 'down', text: '-1.2 pp' }} sub="vs 17.6% inicial"/>
              <KpiV2 label="Días al hito" value="-3" sub="Losa N7 · 12 may"/>
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: 4, marginBottom: 16, borderBottom: '1px solid var(--border)' }}>
              {['Resumen', 'Cronograma', 'Presupuesto', 'Bitácora', 'OC y compras', 'Equipo', 'Documentos'].map((t, i) => (
                <div key={t} style={{
                  padding: '10px 14px', fontSize: 13, fontWeight: 500,
                  borderBottom: i === 0 ? '2px solid var(--brand)' : '2px solid transparent',
                  color: i === 0 ? 'var(--ink-1)' : 'var(--ink-3)', cursor: 'pointer'
                }}>{t}</div>
              ))}
            </div>

            {/* Layout dos cols: cronograma + side info */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 20, marginBottom: 20 }}>
              <div className="panel">
                <div className="panel-head">
                  <h3>Cronograma · capítulos principales</h3>
                  <button className="btn ghost sm">Ver Gantt completo</button>
                </div>
                <div className="panel-body">
                  {[
                    { n: 'Preliminares',  s: 100, p: 100, days: 'Concluido' },
                    { n: 'Cimentación',   s: 100, p: 100, days: 'Concluido' },
                    { n: 'Estructura',    s: 75,  p: 80,  days: '23 días al cierre · -4 días vs plan' },
                    { n: 'Albañilería',   s: 30,  p: 28,  days: 'En curso · al día' },
                    { n: 'Instalaciones', s: 18,  p: 22,  days: 'Inició abr · -1 sem vs plan' },
                    { n: 'Acabados',      s: 0,   p: 0,   days: 'Inicia 15/jul' },
                  ].map(c => (
                    <div key={c.n} style={{ marginBottom: 14 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                        <span style={{ fontSize: 13, fontWeight: 500 }}>{c.n}</span>
                        <span className="mono tnum" style={{ fontSize: 12, color: c.s < c.p ? 'var(--danger-deep)' : 'var(--ink-2)' }}>{c.s}% / {c.p}%</span>
                      </div>
                      <DualBar planned={c.p} actual={c.s} max={100} height={10}/>
                      <div className="muted" style={{ fontSize: 11.5, marginTop: 4 }}>{c.days}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="col" style={{ gap: 20 }}>
                <div className="panel">
                  <div className="panel-head"><h3>Próximos hitos</h3></div>
                  <div className="panel-body" style={{ padding: 0 }}>
                    {[
                      ['12 may', 'Losa N7 · colado',                 'danger',  'En 3 días'],
                      ['18 may', 'Entrega torre grúa N8',             'warning', '9 días'],
                      ['28 may', 'Visita supervisión cliente',         'info',    '19 días'],
                      ['10 jun', 'Cierre estructura nivel 9',         'info',    '32 días'],
                    ].map(([d, t, sev, w]) => (
                      <div key={t} style={{ padding: '10px 18px', borderBottom: '1px solid var(--divider)', display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ minWidth: 42 }}>
                          <div className="mono" style={{ fontSize: 11.5, fontWeight: 600 }}>{d}</div>
                        </div>
                        <span className={`status-dot ${sev}`}/>
                        <div style={{ flex: 1, fontSize: 12.5 }}>{t}</div>
                        <span className="muted" style={{ fontSize: 11 }}>{w}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="panel">
                  <div className="panel-head"><h3>Cuadrillas hoy · 24 personas</h3></div>
                  <div className="panel-body" style={{ padding: 14 }}>
                    {[
                      ['Cimbra y armado',    8, 'Estructura N7'],
                      ['Albañilería',        7, 'Niveles 4-5'],
                      ['Instalación eléctrica', 4, 'Sótano + N3'],
                      ['Plomería',           3, 'N3 baños'],
                      ['Apoyo / acarreos',   2, 'Sitio'],
                    ].map(([n, p, l]) => (
                      <div key={n} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0', fontSize: 12.5 }}>
                        <div style={{ width: 24, textAlign: 'center', fontWeight: 600, fontFamily: 'var(--font-mono)' }}>{p}</div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 500 }}>{n}</div>
                          <div className="muted" style={{ fontSize: 11 }}>{l}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Presupuesto detallado */}
            <div className="panel" style={{ marginBottom: 20 }}>
              <div className="panel-head">
                <h3>Presupuesto · ejercido por capítulo</h3>
                <button className="btn ghost sm">Ver detalle</button>
              </div>
              <div className="panel-body flush">
                <table className="tbl">
                  <thead>
                    <tr><th>Capítulo</th><th className="num">Presupuesto</th><th className="num">Ejercido</th><th>%</th><th className="num">Saldo</th><th>Estatus</th></tr>
                  </thead>
                  <tbody>
                    {[
                      ['Preliminares',     2.4,  2.5,   'danger'],
                      ['Cimentación',      8.6,  8.4,   'success'],
                      ['Estructura',       18.2, 13.8,  'success'],
                      ['Albañilería',      6.4,  3.2,   'success'],
                      ['Instalaciones',    7.8,  3.6,   'success'],
                      ['Acabados',         4.8,  1.1,   'info'],
                    ].map(([n, p, e, s]) => (
                      <tr key={n}>
                        <td style={{ fontWeight: 500 }}>{n}</td>
                        <td className="num mono">${p.toFixed(2)}M</td>
                        <td className="num mono">${e.toFixed(2)}M</td>
                        <td style={{ width: 220 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div className={`bar ${s === 'danger' ? 'danger' : ''}`} style={{ flex: 1 }}>
                              <span style={{ width: `${Math.min(100, (e/p)*100)}%` }}/>
                            </div>
                            <span className="mono tnum" style={{ fontSize: 11.5, minWidth: 38 }}>{Math.round(e/p*100)}%</span>
                          </div>
                        </td>
                        <td className="num mono" style={{ color: e > p ? 'var(--danger-deep)' : 'var(--ink-2)' }}>${(p-e).toFixed(2)}M</td>
                        <td><span className={`badge ${s}`}>{s === 'danger' ? 'Sobreejercido' : s === 'info' ? 'Pendiente' : 'Al día'}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

window.ProyectosListaV2 = ProyectosListaV2;
window.ProyectoDetalleV2 = ProyectoDetalleV2;
