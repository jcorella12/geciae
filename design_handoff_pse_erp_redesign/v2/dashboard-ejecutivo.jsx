/* global React, Icons, KpiV2, DualBar, Stat, BarChart, LineChart, Donut, Sparkline */

// ================================================================
// Dashboard EJECUTIVO v2 — Vista Director / CEO
// "Visión 360 de la empresa": Finanzas + Proyectos + Inventario + Personas
// Layout espacioso (densidad media) — una pantalla, todo lo crítico arriba
// ================================================================

const fmt = n => n.toLocaleString('es-MX');
const money = n => '$' + (n >= 1e6 ? (n/1e6).toFixed(2)+'M' : (n/1e3).toFixed(0)+'k');

const PROYECTOS = [
  { code: 'PRY-2024-031', name: 'Torre Polanco · Etapa 2',     cliente: 'Inmob. Granada',  pm: 'A. Mendoza',  avance: 68, plan: 72, presup: 48.2, ejer: 32.6, riesgo: 'warning', hito: 'Losa N7 · 12 may', team: 4 },
  { code: 'PRY-2024-028', name: 'Bodega Industrial Querétaro', cliente: 'Logística Bajío', pm: 'M. Ruiz',     avance: 92, plan: 90, presup: 28.4, ejer: 26.1, riesgo: 'success', hito: 'Entrega · 28 may', team: 3 },
  { code: 'PRY-2024-035', name: 'Centro Comercial Pachuca',    cliente: 'Grupo MZ',        pm: 'L. Torres',   avance: 41, plan: 55, presup: 91.0, ejer: 58.7, riesgo: 'danger',  hito: 'Cimentación · 18 may', team: 6 },
  { code: 'PRY-2024-039', name: 'Remodel. Of. Corporativas',   cliente: 'Banca Norte',     pm: 'P. Vega',     avance: 22, plan: 25, presup: 12.6, ejer: 3.1,  riesgo: 'success', hito: 'Demoliciones · 8 may', team: 2 },
  { code: 'PRY-2024-041', name: 'Planta Tratamiento Tlalnepantla', cliente: 'Mun. Tlalnepantla', pm: 'J. Salas', avance: 8, plan: 12, presup: 64.5, ejer: 5.2,  riesgo: 'warning', hito: 'Movim. tierras · 22 may', team: 5 },
];

const ALERTAS = [
  { sev: 'danger',  txt: 'Sobrecosto > 8% en CC Pachuca',          meta: 'Hace 2h · L. Torres' },
  { sev: 'warning', txt: '3 OC esperan VoBo > 48h',                 meta: 'OC-1043, OC-1051, OC-1057' },
  { sev: 'warning', txt: 'Curva-S de Torre Polanco -4 pts vs plan', meta: 'Avance 68% vs 72% planeado' },
  { sev: 'info',    txt: 'Pago de cliente confirmado · $2.4M',     meta: 'Inmob. Granada · CFDI 4019' },
  { sev: 'danger',  txt: 'Stock crítico: cemento en obra Pachuca',  meta: '12 sacos · cobertura 1.5 días' },
];

function DashboardEjecutivoV2() {
  const cashflow = [
    { name: 'Ingresos', color: 'var(--brand)', data: [4200, 5100, 4800, 6300, 5900, 7400] },
    { name: 'Egresos',  color: 'var(--accent)', data: [3800, 4400, 4900, 5100, 5400, 5800], dashed: true },
  ];

  return (
    <div className="app-v2" data-empresa="pse" data-density="comfy" style={{ height: '100%' }}>
      <div className="shell">
        <SidebarV2 active="dashboard"/>
        <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <TopbarV2 crumbs={['Inicio', 'Dashboard ejecutivo']} createLabel="Crear"/>
          <div className="page">
            {/* HEADER */}
            <div className="page-head">
              <div>
                <div className="lbl" style={{ marginBottom: 6 }}>Vista consolidada · 4 empresas</div>
                <div className="page-title">Buenas tardes, Roberto</div>
                <div className="page-sub">Resumen al cierre de hoy · Mié 15 mayo · Tipo de cambio MXN 17.42 · TIIE 28d 11.28%</div>
              </div>
              <div className="page-actions">
                <button className="btn">{Icons.calendar} Mayo 2024</button>
                <button className="btn">{Icons.filter} Filtros</button>
                <button className="btn">{Icons.download} Exportar</button>
              </div>
            </div>

            {/* KPIs principales — fila destacada */}
            <div className="kpi-row" style={{ gridTemplateColumns: '1.2fr 1fr 1fr 1fr' }}>
              <div className="kpi feat">
                <div className="head">
                  <div className="label">Ingresos del mes · consolidado</div>
                  <Sparkline data={[42,51,48,63,59,74]} w={90} h={28} color="rgba(255,255,255,0.85)" fill/>
                </div>
                <div className="value">$74.3<span className="unit">M MXN</span></div>
                <div style={{ display: 'flex', gap: 16, marginTop: 14 }}>
                  <div>
                    <div style={{ fontSize: 10.5, opacity: 0.75, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>vs Mes ant.</div>
                    <div style={{ fontSize: 14, fontWeight: 600, marginTop: 2 }}>+25.4%</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 10.5, opacity: 0.75, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>vs Meta</div>
                    <div style={{ fontSize: 14, fontWeight: 600, marginTop: 2 }}>+3.8%</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 10.5, opacity: 0.75, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>YTD</div>
                    <div style={{ fontSize: 14, fontWeight: 600, marginTop: 2 }}>$312M</div>
                  </div>
                </div>
              </div>
              <KpiV2 label="Margen operativo" value="22.4" unit="%"
                delta={{ dir: 'up', text: '+1.8 pp' }} sub="vs Q anterior"
                trend={[18,19,20,21,21,22]}/>
              <KpiV2 label="Cash en caja" value="$48.6" unit="M"
                delta={{ dir: 'down', text: '-6.2%' }} sub="cobertura 2.3 meses"
                trend={[58,55,53,51,49,49]} accent="var(--accent)"/>
              <KpiV2 label="Cuentas por cobrar" value="$92.1" unit="M"
                delta={{ dir: 'up', text: '+12 días' }} sub="DSO 47 días"
                trend={[76,80,82,85,89,92]} accent="var(--warning)"/>
            </div>

            {/* KPIs operativos */}
            <div className="kpi-row" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
              <KpiV2 label="Proyectos activos" value="12"
                sub="9 en tiempo · 2 atrasados · 1 en riesgo"/>
              <KpiV2 label="Avance ponderado" value="58.4" unit="%"
                delta={{ dir: 'down', text: '-2.1 pp' }} sub="vs curva-S planeada"
                trend={[55,56,57,59,60,58]}/>
              <KpiV2 label="OC pendientes VoBo" value="23"
                delta={{ dir: 'flat', text: '12 urgentes' }} sub="$8.4M comprometidos"/>
              <KpiV2 label="Headcount activo" value="284"
                sub="156 obra · 92 oficina · 36 subcontrato"/>
            </div>

            {/* FILA principal: cashflow + alertas */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.7fr 1fr', gap: 20, marginBottom: 20 }}>
              <div className="panel">
                <div className="panel-head">
                  <div>
                    <h3>Flujo de efectivo · 6 meses</h3>
                    <div className="sub">Ingresos vs egresos consolidados (MXN)</div>
                  </div>
                  <div className="tabs">
                    <span className="tab">3M</span>
                    <span className="tab active">6M</span>
                    <span className="tab">YTD</span>
                    <span className="tab">12M</span>
                  </div>
                </div>
                <div className="panel-body">
                  <LineChart series={cashflow} w={760} h={220} labels={['Dic','Ene','Feb','Mar','Abr','May']}/>
                  <div style={{ display: 'flex', gap: 24, marginTop: 12, fontSize: 12 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ width: 12, height: 2, background: 'var(--brand)', display: 'inline-block' }}/> Ingresos
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ width: 12, height: 2, background: 'var(--accent)', display: 'inline-block', borderTop: '2px dashed var(--accent)' }}/> Egresos
                    </span>
                    <span style={{ marginLeft: 'auto', color: 'var(--ink-3)' }}>
                      Margen mes actual: <strong style={{ color: 'var(--success-deep)' }}>+$1.6M</strong>
                    </span>
                  </div>
                </div>
              </div>

              <div className="panel">
                <div className="panel-head">
                  <div>
                    <h3>Alertas que requieren atención</h3>
                    <div className="sub">5 nuevas · últimas 24h</div>
                  </div>
                  <button className="btn ghost sm">Ver todas</button>
                </div>
                <div className="panel-body" style={{ padding: 0 }}>
                  {ALERTAS.map((a, i) => (
                    <div key={i} style={{
                      padding: '12px 18px',
                      borderBottom: i < ALERTAS.length - 1 ? '1px solid var(--divider)' : 'none',
                      display: 'flex', gap: 12, alignItems: 'flex-start'
                    }}>
                      <span className={`status-dot ${a.sev}`} style={{ marginTop: 6 }}/>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 500, lineHeight: 1.35 }}>{a.txt}</div>
                        <div style={{ fontSize: 11.5, color: 'var(--ink-3)', marginTop: 3 }}>{a.meta}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* PROYECTOS: tabla con barras de avance */}
            <div className="panel" style={{ marginBottom: 20 }}>
              <div className="panel-head">
                <div>
                  <h3>Proyectos activos</h3>
                  <div className="sub">12 en curso · ordenados por riesgo</div>
                </div>
                <div className="row">
                  <span className="badge brand">Todos</span>
                  <span className="badge">PSE</span>
                  <span className="badge">CIAE</span>
                  <span className="badge">IED</span>
                  <button className="btn ghost sm">{Icons.more}</button>
                </div>
              </div>
              <div className="panel-body flush">
                <table className="tbl">
                  <thead>
                    <tr>
                      <th>Proyecto</th>
                      <th>Cliente</th>
                      <th>PM</th>
                      <th style={{ width: 220 }}>Avance vs plan</th>
                      <th className="num">Presupuesto</th>
                      <th className="num">Ejercido</th>
                      <th>Próximo hito</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {PROYECTOS.map(p => (
                      <tr key={p.code}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <span className={`status-dot ${p.riesgo}`}/>
                            <div>
                              <div style={{ fontWeight: 500 }}>{p.name}</div>
                              <div className="mono" style={{ fontSize: 11, color: 'var(--ink-3)' }}>{p.code}</div>
                            </div>
                          </div>
                        </td>
                        <td className="muted">{p.cliente}</td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ width: 22, height: 22, borderRadius: '50%',
                              background: 'var(--bg-3)', display: 'grid', placeItems: 'center',
                              fontSize: 9.5, fontWeight: 600, color: 'var(--ink-2)' }}>
                              {p.pm.split(' ').map(s=>s[0]).join('').slice(0,2)}
                            </span>
                            {p.pm}
                          </div>
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <DualBar planned={p.plan} actual={p.avance} max={100} height={18}/>
                            <span className="mono tnum" style={{ fontSize: 11.5, minWidth: 60, color: p.avance < p.plan ? 'var(--danger-deep)' : 'var(--ink-2)' }}>
                              {p.avance}/{p.plan}%
                            </span>
                          </div>
                        </td>
                        <td className="num mono">${p.presup.toFixed(1)}M</td>
                        <td className="num mono">
                          ${p.ejer.toFixed(1)}M
                          <div style={{ fontSize: 10.5, color: 'var(--ink-3)' }}>{Math.round(p.ejer/p.presup*100)}% ejercido</div>
                        </td>
                        <td className="muted">{p.hito}</td>
                        <td>
                          <button className="btn ghost sm">{Icons.arrowRight}</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* FILA bottom: distribución por empresa + inventario + personas */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr 1fr', gap: 20, marginBottom: 20 }}>
              <div className="panel">
                <div className="panel-head">
                  <div>
                    <h3>Ingresos por empresa</h3>
                    <div className="sub">Mayo · MXN</div>
                  </div>
                </div>
                <div className="panel-body">
                  <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
                    <Donut size={130} thickness={20} segments={[
                      { value: 38, color: 'var(--c-pse)' },
                      { value: 24, color: 'var(--c-ciae)' },
                      { value: 16, color: 'var(--c-ied)' },
                      { value: 22, color: 'var(--c-limson)' },
                    ]}/>
                    <div style={{ flex: 1 }}>
                      {[
                        ['PSE Energía',     38, 'var(--c-pse)',    '$28.2M'],
                        ['CIAE Construcc.', 24, 'var(--c-ciae)',   '$17.8M'],
                        ['IED Inmobiliaria',16, 'var(--c-ied)',    '$11.9M'],
                        ['Limson',          22, 'var(--c-limson)', '$16.4M'],
                      ].map(([n, p, c, m]) => (
                        <div key={n} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0', fontSize: 12.5 }}>
                          <span style={{ width: 8, height: 8, borderRadius: 2, background: c }}/>
                          <span style={{ flex: 1 }}>{n}</span>
                          <span className="mono muted">{p}%</span>
                          <span className="mono" style={{ fontWeight: 500, minWidth: 56, textAlign: 'right' }}>{m}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="panel">
                <div className="panel-head">
                  <div>
                    <h3>Inventario · obra</h3>
                    <div className="sub">Stock crítico</div>
                  </div>
                  <span className="badge danger"><span className="dot"/> 4 críticos</span>
                </div>
                <div className="panel-body" style={{ padding: 0 }}>
                  {[
                    { mat: 'Cemento Tolteca CPC 30R', sku: 'MAT-C-001', stock: 12, min: 80, unit: 'sacos', sev: 'danger', loc: 'Pachuca' },
                    { mat: 'Varilla #4 corrugada',     sku: 'MAT-V-040', stock: 84, min: 200, unit: 'pzas',  sev: 'warning', loc: 'Polanco' },
                    { mat: 'Block hueco 12×20×40',     sku: 'MAT-B-12',  stock: 320, min: 500, unit: 'pzas',  sev: 'warning', loc: 'Querétaro' },
                    { mat: 'Cable THW-LS Cal. 12',     sku: 'MAT-E-120', stock: 8,   min: 25,  unit: 'rollos',sev: 'danger',  loc: 'Polanco' },
                  ].map(m => (
                    <div key={m.sku} style={{ padding: '10px 18px', borderBottom: '1px solid var(--divider)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: 12.5, fontWeight: 500 }}>{m.mat}</div>
                          <div className="mono" style={{ fontSize: 10.5, color: 'var(--ink-3)' }}>{m.sku} · {m.loc}</div>
                        </div>
                        <span className={`badge ${m.sev}`}>{m.stock} {m.unit}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div className={`bar ${m.sev}`} style={{ flex: 1 }}>
                          <span style={{ width: `${Math.min(100, (m.stock/m.min)*100)}%` }}/>
                        </div>
                        <span className="mono" style={{ fontSize: 10.5, color: 'var(--ink-3)', minWidth: 60, textAlign: 'right' }}>min {m.min}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="panel">
                <div className="panel-head">
                  <div>
                    <h3>Personas · hoy</h3>
                    <div className="sub">Asistencia y novedades</div>
                  </div>
                </div>
                <div className="panel-body">
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                    <Stat label="Presentes hoy" value="261" sub="284 plantilla · 92%" color="var(--success-deep)"/>
                    <Stat label="Ausentes / permiso" value="23" sub="9 vac · 5 incap · 9 falta"/>
                    <Stat label="Horas extra · semana" value="148" sub="vs 120 plan" color="var(--warning-deep)"/>
                    <Stat label="Nómina mes" value="$8.4M" sub="próx. 28 may"/>
                  </div>
                  <div style={{ borderTop: '1px solid var(--divider)', paddingTop: 14 }}>
                    <div className="lbl" style={{ marginBottom: 8 }}>Asistencia · 14 días</div>
                    <HeatGrid rows={1} cols={14} w={20} gap={4} getCell={(r, c) => {
                      const v = [92,94,89,91,93,0,0,90,93,95,92,89,91,92][c];
                      const color = v === 0 ? 'var(--bg-3)'
                        : v >= 93 ? 'var(--success)'
                        : v >= 90 ? 'var(--success-soft)'
                        : 'var(--warning-soft)';
                      return { color, title: v ? `${v}% asistencia` : 'fin de semana' };
                    }}/>
                  </div>
                </div>
              </div>
            </div>

            {/* FILA bottom-2: Top clientes + próximos cobros + capex */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 20 }}>
              <div className="panel">
                <div className="panel-head"><h3>Top 5 clientes · facturación YTD</h3></div>
                <div className="panel-body" style={{ padding: 0 }}>
                  {[
                    ['Inmob. Granada', 68.4, 'al corriente'],
                    ['Grupo MZ', 54.2, '12 días vencido'],
                    ['Logística Bajío', 41.7, 'al corriente'],
                    ['Banca Norte', 28.1, 'al corriente'],
                    ['Mun. Tlalnepantla', 19.4, '45 días vencido'],
                  ].map(([n, v, st]) => (
                    <div key={n} style={{ padding: '10px 18px', borderBottom: '1px solid var(--divider)', display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12.5, fontWeight: 500 }}>{n}</div>
                        <div style={{ fontSize: 11, color: st.includes('vencido') ? 'var(--danger-deep)' : 'var(--ink-3)' }}>{st}</div>
                      </div>
                      <div className="mono" style={{ fontWeight: 600, fontSize: 13 }}>${v.toFixed(1)}M</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="panel">
                <div className="panel-head"><h3>Próximos cobros · 30 días</h3></div>
                <div className="panel-body">
                  <div style={{ fontSize: 28, fontWeight: 600, letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums', marginBottom: 4 }}>$42.6M</div>
                  <div style={{ fontSize: 12, color: 'var(--ink-3)', marginBottom: 14 }}>14 facturas · 8 clientes</div>
                  <BarChart w={360} h={140} data={[
                    { label: 'S1', value: 8400 },
                    { label: 'S2', value: 12100 },
                    { label: 'S3', value: 14800 },
                    { label: 'S4', value: 7300 },
                  ]}/>
                </div>
              </div>

              <div className="panel">
                <div className="panel-head"><h3>Capex comprometido · 2024</h3></div>
                <div className="panel-body">
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                    <Stat label="Total presup." value="$245M" sub="anual"/>
                    <Stat label="Comprometido" value="$168M" sub="68.6%"/>
                  </div>
                  <div className="bar thick" style={{ marginBottom: 8 }}>
                    <span style={{ width: '68.6%' }}/>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--ink-3)' }}>
                    <span>Disponible $77M</span>
                    <span className="mono">68.6 / 100%</span>
                  </div>
                  <div style={{ borderTop: '1px solid var(--divider)', marginTop: 14, paddingTop: 12 }}>
                    {[
                      ['Equipo pesado', 38, 'var(--brand)'],
                      ['Materiales',    52, 'var(--accent)'],
                      ['Subcontratos',  42, 'var(--c-ciae)'],
                      ['Otros',         36, 'var(--ink-4)'],
                    ].map(([n, p, c]) => (
                      <div key={n} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0', fontSize: 12 }}>
                        <span style={{ width: 6, height: 6, borderRadius: 2, background: c }}/>
                        <span style={{ flex: 1 }}>{n}</span>
                        <span className="mono">${p}M</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div style={{ height: 24 }}/>
          </div>
        </div>
      </div>
    </div>
  );
}

window.DashboardEjecutivoV2 = DashboardEjecutivoV2;
