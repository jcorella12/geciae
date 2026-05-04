/* global React, Icons, KpiV2, Stat, BarChart, LineChart, Donut, Sparkline */

// ================================================================
// Módulo Finanzas v2
// ================================================================

function FinanzasV2() {
  return (
    <div className="app-v2" data-empresa="pse" data-density="comfy" style={{ height: '100%' }}>
      <div className="shell">
        <SidebarV2 active="finanzas"/>
        <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <TopbarV2 crumbs={['Finanzas']} createLabel="Movimiento"/>
          <div className="page">
            <div className="page-head">
              <div>
                <div className="page-title">Finanzas</div>
                <div className="page-sub">Mayo 2024 · 4 empresas consolidadas · al cierre 14/05</div>
              </div>
              <div className="page-actions">
                <button className="btn">{Icons.calendar} May 2024</button>
                <button className="btn">{Icons.filter} Empresa: Todas</button>
                <button className="btn">{Icons.download} Exportar</button>
              </div>
            </div>

            {/* Tabs financieras */}
            <div style={{ display: 'flex', gap: 4, marginBottom: 18, borderBottom: '1px solid var(--border)' }}>
              {['Resumen', 'Cash flow', 'CxC', 'CxP', 'Conciliación', 'Estado de resultados'].map((t, i) => (
                <div key={t} style={{
                  padding: '10px 14px', fontSize: 13, fontWeight: 500,
                  borderBottom: i === 0 ? '2px solid var(--brand)' : '2px solid transparent',
                  color: i === 0 ? 'var(--ink-1)' : 'var(--ink-3)', cursor: 'pointer'
                }}>{t}</div>
              ))}
            </div>

            <div className="kpi-row">
              <div className="kpi feat">
                <div className="head"><div className="label">Cash en caja · consolidado</div></div>
                <div className="value">$48.6<span className="unit">M MXN</span></div>
                <div style={{ display: 'flex', gap: 16, marginTop: 12 }}>
                  <div><div style={{ fontSize: 10.5, opacity: 0.75, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Cobertura</div><div style={{ fontSize: 14, fontWeight: 600 }}>2.3 meses</div></div>
                  <div><div style={{ fontSize: 10.5, opacity: 0.75, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Bancos</div><div style={{ fontSize: 14, fontWeight: 600 }}>4 cuentas</div></div>
                </div>
              </div>
              <KpiV2 label="Ingresos mes" value="$74.3" unit="M" delta={{ dir: 'up', text: '+25.4%' }} sub="vs abril"/>
              <KpiV2 label="Egresos mes" value="$58.2" unit="M" delta={{ dir: 'up', text: '+8.1%' }} sub="vs abril"/>
              <KpiV2 label="Margen mes" value="$16.1" unit="M" delta={{ dir: 'up', text: '+58%' }} sub="22% sobre ingreso"/>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 20, marginBottom: 20 }}>
              <div className="panel">
                <div className="panel-head"><h3>Flujo proyectado · 90 días</h3><span className="muted tiny">actualizado hoy</span></div>
                <div className="panel-body">
                  <LineChart w={720} h={220} labels={['Hoy','+15d','+30d','+45d','+60d','+75d','+90d']}
                    series={[
                      { name: 'Saldo proyectado', color: 'var(--brand)',  data: [48600, 52300, 58400, 54100, 61500, 65200, 71800] },
                      { name: 'Ingresos esp.',    color: 'var(--success)', data: [0, 12400, 28600, 38200, 56400, 72100, 89800] },
                      { name: 'Egresos esp.',     color: 'var(--accent)',  data: [0, 8700, 18800, 32500, 43100, 55000, 66600], dashed: true },
                    ]}/>
                  <div style={{ display: 'flex', gap: 18, marginTop: 12, fontSize: 12 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ width: 12, height: 2, background: 'var(--brand)' }}/> Saldo</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ width: 12, height: 2, background: 'var(--success)' }}/> Ingresos</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ width: 12, height: 2, background: 'var(--accent)' }}/> Egresos</span>
                  </div>
                </div>
              </div>

              <div className="panel">
                <div className="panel-head"><h3>Distribución cash</h3></div>
                <div className="panel-body">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
                    <Donut size={120} thickness={18} segments={[
                      { value: 48, color: 'var(--brand)' },
                      { value: 22, color: 'var(--accent)' },
                      { value: 18, color: 'var(--c-ciae)' },
                      { value: 12, color: 'var(--c-ied)' },
                    ]}/>
                    <div style={{ flex: 1 }}>
                      {[
                        ['BBVA Empresarial', 23.3, 'var(--brand)'],
                        ['Banorte Inversión', 10.7, 'var(--accent)'],
                        ['Santander Op.',     8.7, 'var(--c-ciae)'],
                        ['HSBC USD',          5.8, 'var(--c-ied)'],
                      ].map(([n, v, c]) => (
                        <div key={n} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0', fontSize: 12 }}>
                          <span style={{ width: 7, height: 7, borderRadius: 2, background: c }}/>
                          <span style={{ flex: 1 }}>{n}</span>
                          <span className="mono" style={{ fontWeight: 500 }}>${v.toFixed(1)}M</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
              <div className="panel">
                <div className="panel-head">
                  <h3>Cuentas por cobrar</h3>
                  <span className="badge warning">$24.6M vencido</span>
                </div>
                <div className="panel-body flush">
                  <table className="tbl">
                    <thead><tr><th>Cliente</th><th className="num">Total</th><th className="num">Por vencer</th><th className="num">Vencido</th></tr></thead>
                    <tbody>
                      {[
                        ['Inmob. Granada',     38.4, 38.4, 0,    'success'],
                        ['Grupo MZ',           24.2, 12.8, 11.4, 'danger'],
                        ['Logística Bajío',    14.7, 14.7, 0,    'success'],
                        ['Banca Norte',         8.1,  8.1, 0,    'success'],
                        ['Mun. Tlalnepantla',   6.7,  0,   6.7,  'danger'],
                        ['Salud Privada',       3.2,  3.2, 0,    'success'],
                      ].map(([n, t, v, vc, s]) => (
                        <tr key={n}>
                          <td><span className={`status-dot ${s}`} style={{ marginRight: 8 }}/>{n}</td>
                          <td className="num mono">${t.toFixed(1)}M</td>
                          <td className="num mono muted">${v.toFixed(1)}M</td>
                          <td className="num mono" style={{ color: vc > 0 ? 'var(--danger-deep)' : 'var(--ink-3)', fontWeight: vc > 0 ? 600 : 400 }}>${vc.toFixed(1)}M</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="panel">
                <div className="panel-head">
                  <h3>Cuentas por pagar</h3>
                  <span className="muted tiny">próximos 30 días</span>
                </div>
                <div className="panel-body flush">
                  <table className="tbl">
                    <thead><tr><th>Proveedor</th><th>Concepto</th><th>Vence</th><th className="num">Monto</th></tr></thead>
                    <tbody>
                      {[
                        ['Cementos del Centro', 'OC-1043 · cemento Pachuca',    '18 may', 0.148, 'danger'],
                        ['Aceros Monterrey',    'Varilla #4 · Polanco',         '22 may', 0.86,  'warning'],
                        ['Subc. Albañilería SA','Estimación 4 · Polanco',       '25 may', 1.84,  'warning'],
                        ['Equipos JC',          'Renta torre grúa · may',       '28 may', 0.42,  'success'],
                        ['Nómina · administr.', 'Quincenal mayo 2',              '30 may', 4.20,  'success'],
                        ['SAT · ISR retenciones','Mayo',                         '17 may', 0.93,  'danger'],
                      ].map(([p, c, v, m, s]) => (
                        <tr key={p}>
                          <td>{p}<div className="muted" style={{ fontSize: 11 }}>{c}</div></td>
                          <td></td>
                          <td className="muted" style={{ fontSize: 12 }}>{v}</td>
                          <td className="num mono" style={{ color: s === 'danger' ? 'var(--danger-deep)' : 'var(--ink-1)', fontWeight: 600 }}>${(m).toLocaleString('es-MX', { minimumFractionDigits: 2 })}M</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
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

// ================================================================
// Módulo Inventario v2
// ================================================================
function InventarioV2() {
  return (
    <div className="app-v2" data-empresa="pse" data-density="comfy" style={{ height: '100%' }}>
      <div className="shell">
        <SidebarV2 active="inventario"/>
        <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <TopbarV2 crumbs={['Inventario']} createLabel="Movimiento"/>
          <div className="page">
            <div className="page-head">
              <div>
                <div className="page-title">Inventario · almacén</div>
                <div className="page-sub">3 almacenes · 1,847 SKUs · valor total $14.2M MXN</div>
              </div>
              <div className="page-actions">
                <button className="btn">Almacén: Todos</button>
                <button className="btn">{Icons.filter}</button>
                <button className="btn">{Icons.download}</button>
                <button className="btn primary">{Icons.plus} Entrada</button>
              </div>
            </div>

            <div className="kpi-row">
              <KpiV2 label="Valor inventario" value="$14.2" unit="M" sub="1,847 SKUs · 3 almacenes"/>
              <KpiV2 label="Stock crítico" value="12" sub="< mínimo · acción inmediata" delta={{ dir: 'up', text: '+4 vs sem' }} accent="var(--danger)"/>
              <KpiV2 label="Movimientos hoy" value="84" sub="62 salidas · 22 entradas"/>
              <KpiV2 label="Rotación 90d" value="3.2" unit="x" delta={{ dir: 'up', text: '+0.4' }} sub="vs trimestre ant."/>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 20, marginBottom: 20 }}>
              <div className="panel">
                <div className="panel-head"><h3>Distribución por almacén</h3></div>
                <div className="panel-body">
                  {[
                    ['Polanco',    6.8, 824, 'var(--brand)'],
                    ['Querétaro',  4.1, 512, 'var(--accent)'],
                    ['Pachuca',    3.3, 511, 'var(--c-ciae)'],
                  ].map(([n, v, c, col]) => (
                    <div key={n} style={{ marginBottom: 14 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                        <span style={{ fontWeight: 500 }}>{n}</span>
                        <span className="mono">${v.toFixed(1)}M · {c} SKUs</span>
                      </div>
                      <div className="bar thick"><span style={{ width: `${(v/14.2)*100}%`, background: col }}/></div>
                    </div>
                  ))}
                  <div style={{ borderTop: '1px solid var(--divider)', marginTop: 14, paddingTop: 14 }}>
                    <div className="lbl" style={{ marginBottom: 8 }}>Categorías top</div>
                    {[
                      ['Estructura (cemento, varilla, block)', 6.2],
                      ['Eléctrico',                            2.8],
                      ['Plomería e hidráulica',                1.9],
                      ['Acabados',                             1.6],
                      ['Equipo de protección',                 1.1],
                      ['Otros',                                0.6],
                    ].map(([n, v]) => (
                      <div key={n} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '3px 0' }}>
                        <span>{n}</span>
                        <span className="mono">${v.toFixed(1)}M</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="panel">
                <div className="panel-head"><h3>Alertas de stock</h3><span className="badge danger">12 críticos</span></div>
                <div className="panel-body flush">
                  <table className="tbl">
                    <thead><tr><th>SKU</th><th>Material</th><th>Almacén</th><th className="num">Stock</th><th className="num">Mín.</th><th>Cobertura</th><th></th></tr></thead>
                    <tbody>
                      {[
                        ['MAT-C-001','Cemento Tolteca CPC 30R',     'Pachuca',   12, 80,  '1.5 días', 'danger'],
                        ['MAT-E-120','Cable THW-LS Cal. 12',         'Polanco',    8, 25,  '3 días',  'danger'],
                        ['MAT-V-040','Varilla #4 corrugada 12m',     'Polanco',   84, 200, '5 días',  'warning'],
                        ['MAT-B-12', 'Block hueco 12×20×40',          'Querétaro',320, 500,'8 días',  'warning'],
                        ['MAT-T-080','Tubo PVC 4" sanitario',         'Pachuca',   18, 40, '4 días',  'warning'],
                        ['MAT-A-220','Adhesivo cerámico 20kg',        'Polanco',    5, 20, '2 días',  'danger'],
                      ].map(([s, m, l, st, mn, c, sev]) => (
                        <tr key={s}>
                          <td className="code">{s}</td>
                          <td style={{ fontWeight: 500 }}>{m}</td>
                          <td className="muted">{l}</td>
                          <td className="num mono" style={{ color: sev === 'danger' ? 'var(--danger-deep)' : 'var(--warning-deep)', fontWeight: 600 }}>{st}</td>
                          <td className="num mono muted">{mn}</td>
                          <td><span className={`badge ${sev}`}>{c}</span></td>
                          <td><button className="btn sm primary">Pedir</button></td>
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
    </div>
  );
}

window.FinanzasV2 = FinanzasV2;
window.InventarioV2 = InventarioV2;
