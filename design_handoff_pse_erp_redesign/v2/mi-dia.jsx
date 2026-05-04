/* global React, Icons, KpiV2, Stat, HeatGrid, Sparkline */

// ================================================================
// "Mi Día" — Dashboard de empleado v2
// Para todos los roles operativos: residente, supervisor, oficina, almacén
// ================================================================

function MiDiaV2() {
  return (
    <div className="app-v2" data-empresa="pse" data-density="comfy" style={{ height: '100%' }}>
      <div className="shell">
        <SidebarV2 role="Empleado" active="midia" user={{ name: 'Ana Mendoza', initials: 'AM', role: 'PROJECT MANAGER' }}/>
        <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <TopbarV2 crumbs={['Inicio', 'Mi día']} createLabel="Reportar"/>
          <div className="page">
            {/* Header personal */}
            <div className="page-head">
              <div>
                <div className="lbl" style={{ marginBottom: 6 }}>Miércoles 15 de mayo · semana 20</div>
                <div className="page-title">Buenos días, Ana</div>
                <div className="page-sub">Tienes 4 pendientes para hoy · 2 reuniones · 1 entrega esta semana</div>
              </div>
              <div className="page-actions">
                <button className="btn">{Icons.calendar} Mi semana</button>
                <button className="btn primary">{Icons.plus} Reportar avance</button>
              </div>
            </div>

            {/* KPIs personales */}
            <div className="kpi-row" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
              <KpiV2 label="Mis proyectos" value="3" sub="Polanco · Reforma Sur · CC Pachuca"/>
              <KpiV2 label="Pendientes hoy" value="4" sub="2 alta prioridad" delta={{ dir: 'flat', text: '1 vence hoy' }}/>
              <KpiV2 label="Aprobaciones" value="6" sub="VoBo OC pendientes" delta={{ dir: 'flat', text: '$340k' }}/>
              <KpiV2 label="Mi mes en horas" value="142" unit="h" sub="de 160 estimadas" trend={[20,30,32,35,25]}/>
            </div>

            {/* FILA principal: agenda hoy + tareas + accesos rápidos */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 0.9fr', gap: 20, marginBottom: 20 }}>
              {/* Agenda */}
              <div className="panel">
                <div className="panel-head">
                  <div>
                    <h3>Agenda · hoy</h3>
                    <div className="sub">Mié 15 may · 7 bloques</div>
                  </div>
                  <button className="btn ghost sm">Ver semana</button>
                </div>
                <div className="panel-body" style={{ padding: 0 }}>
                  {[
                    { time: '08:00', dur: '30m', title: 'Recorrido obra · Torre Polanco N7', loc: 'Polanco', kind: 'obra', done: true },
                    { time: '09:00', dur: '1h', title: 'Junta cuadrillas · planeación día',  loc: 'Sitio',   kind: 'reunion', done: true },
                    { time: '11:00', dur: '45m', title: 'Llamada con Inmob. Granada',         loc: 'Remoto',  kind: 'cliente', done: false, soon: true },
                    { time: '13:00', dur: '1h', title: 'Comida · cliente Banca Norte',        loc: 'Externa', kind: 'cliente', done: false },
                    { time: '15:00', dur: '30m', title: 'VoBo OC · revisión semanal',         loc: 'Oficina', kind: 'aprob',   done: false },
                    { time: '16:00', dur: '1h', title: 'Reunión PMs · curva-S consolidada',  loc: 'Sala 3',  kind: 'reunion', done: false },
                    { time: '18:00', dur: '15m', title: 'Cierre bitácora del día',            loc: 'Oficina', kind: 'cierre',  done: false },
                  ].map((b, i) => (
                    <div key={i} style={{
                      display: 'grid', gridTemplateColumns: '70px 4px 1fr auto', gap: 12,
                      padding: '12px 18px',
                      borderBottom: i < 6 ? '1px solid var(--divider)' : 'none',
                      opacity: b.done ? 0.55 : 1,
                      background: b.soon ? 'var(--accent-soft)' : 'transparent'
                    }}>
                      <div>
                        <div className="mono" style={{ fontWeight: 600, fontSize: 13 }}>{b.time}</div>
                        <div className="mono muted" style={{ fontSize: 10.5 }}>{b.dur}</div>
                      </div>
                      <div style={{
                        background: b.kind === 'obra' ? 'var(--brand)'
                          : b.kind === 'cliente' ? 'var(--accent)'
                          : b.kind === 'aprob' ? 'var(--warning)'
                          : 'var(--ink-5)',
                        borderRadius: 2
                      }}/>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 500, textDecoration: b.done ? 'line-through' : 'none' }}>{b.title}</div>
                        <div className="muted" style={{ fontSize: 11.5, marginTop: 2 }}>{b.loc}</div>
                      </div>
                      {b.soon && <span className="badge accent">en 30 min</span>}
                      {b.done && <span style={{ color: 'var(--success)' }}>{Icons.check}</span>}
                    </div>
                  ))}
                </div>
              </div>

              {/* Pendientes */}
              <div className="panel">
                <div className="panel-head">
                  <div><h3>Pendientes</h3><div className="sub">4 hoy · 7 esta semana</div></div>
                  <span className="badge accent">2 urgentes</span>
                </div>
                <div className="panel-body" style={{ padding: 0 }}>
                  {[
                    { p: 'alta', t: 'Aprobar OC-1043 · Cementos del Centro', m: 'Polanco · $148k · vence hoy', urg: true },
                    { p: 'alta', t: 'Firmar contrato subcontrato albañilería', m: 'Pachuca · pdf 14 págs', urg: true },
                    { p: 'media', t: 'Revisar bitácora día 14 may', m: 'Polanco · pendiente desde ayer' },
                    { p: 'media', t: 'Subir reporte semanal a cliente Granada', m: 'Vence vie 17 may' },
                    { p: 'baja', t: 'Actualizar curva-S Reforma Sur', m: 'Reforma Sur · cuando puedas' },
                  ].map((t, i) => (
                    <div key={i} style={{
                      padding: '10px 16px',
                      borderBottom: i < 4 ? '1px solid var(--divider)' : 'none',
                      display: 'flex', alignItems: 'flex-start', gap: 10
                    }}>
                      <input type="checkbox" style={{ marginTop: 4, accentColor: 'var(--brand)' }}/>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ width: 4, height: 14, borderRadius: 2,
                            background: t.p === 'alta' ? 'var(--danger)' : t.p === 'media' ? 'var(--warning)' : 'var(--ink-5)'
                          }}/>
                          <span style={{ fontSize: 12.5, fontWeight: 500 }}>{t.t}</span>
                          {t.urg && <span className="badge danger" style={{ height: 18, fontSize: 10 }}>HOY</span>}
                        </div>
                        <div className="muted" style={{ fontSize: 11, marginTop: 2, paddingLeft: 10 }}>{t.m}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Accesos rápidos */}
              <div className="panel">
                <div className="panel-head"><h3>Accesos rápidos</h3></div>
                <div className="panel-body" style={{ padding: 12 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    {[
                      { ic: 'plus',         lbl: 'Reportar avance',  c: 'var(--brand)' },
                      { ic: 'oc',           lbl: 'Crear OC',         c: 'var(--accent)' },
                      { ic: 'aprobaciones', lbl: 'Bitácora',         c: 'var(--c-ciae)' },
                      { ic: 'rrhh',         lbl: 'Asignar cuadrilla',c: 'var(--c-ied)' },
                      { ic: 'inventario',   lbl: 'Pedido almacén',   c: 'var(--brand)' },
                      { ic: 'reportes',     lbl: 'Reporte cliente',  c: 'var(--accent)' },
                    ].map((a, i) => (
                      <div key={i} style={{
                        border: '1px solid var(--border)',
                        background: 'var(--surface)',
                        borderRadius: 8,
                        padding: 12, cursor: 'pointer',
                        display: 'flex', flexDirection: 'column', gap: 8
                      }}>
                        <span style={{
                          width: 28, height: 28, borderRadius: 6,
                          background: 'color-mix(in oklch, ' + a.c + ' 14%, transparent)',
                          color: a.c,
                          display: 'grid', placeItems: 'center'
                        }}>{Icons[a.ic]}</span>
                        <span style={{ fontSize: 12, fontWeight: 500 }}>{a.lbl}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* FILA: mis proyectos + nómina/vacaciones + actividad */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr', gap: 20 }}>
              <div className="panel">
                <div className="panel-head">
                  <h3>Mis proyectos · estado</h3>
                  <button className="btn ghost sm">Ver todos</button>
                </div>
                <div className="panel-body flush">
                  <table className="tbl">
                    <thead>
                      <tr><th>Proyecto</th><th style={{ width: 140 }}>Avance</th><th>Próximo hito</th><th></th></tr>
                    </thead>
                    <tbody>
                      {[
                        ['Torre Polanco · Etapa 2',  68, 72, 'Losa N7 · 12 may',     'warning'],
                        ['Edificio Reforma Sur',     78, 80, 'Acabados N3 · 25 may', 'success'],
                        ['Centro Comercial Pachuca', 41, 55, 'Cimentación · 18 may', 'danger'],
                      ].map(([n, a, p, h, s]) => (
                        <tr key={n}>
                          <td>
                            <span className={`status-dot ${s}`} style={{ marginRight: 8 }}/>
                            <span style={{ fontWeight: 500 }}>{n}</span>
                          </td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <DualBar planned={p} actual={a} max={100} height={14}/>
                              <span className="mono tnum" style={{ fontSize: 11 }}>{a}%</span>
                            </div>
                          </td>
                          <td className="muted">{h}</td>
                          <td><button className="btn ghost sm">{Icons.arrowRight}</button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="panel">
                <div className="panel-head"><h3>Mi nómina · mayo</h3></div>
                <div className="panel-body">
                  <Stat label="Próximo pago" value="$28,450" sub="vie 28 may · 13 días"/>
                  <div style={{ borderTop: '1px solid var(--divider)', margin: '14px 0', paddingTop: 12 }}>
                    {[
                      ['Sueldo base',    '$24,000'],
                      ['Bono productividad', '$3,200'],
                      ['Vales',          '$1,800'],
                      ['Horas extra',    '$650'],
                      ['Deducciones',    '-$1,200', 'var(--danger-deep)'],
                    ].map(([l, v, c]) => (
                      <div key={l} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 12 }}>
                        <span className="muted">{l}</span>
                        <span className="mono" style={{ color: c || 'var(--ink-1)', fontWeight: 500 }}>{v}</span>
                      </div>
                    ))}
                  </div>
                  <button className="btn" style={{ width: '100%' }}>Ver recibos anteriores</button>
                </div>
              </div>

              <div className="panel">
                <div className="panel-head"><h3>Vacaciones · 2024</h3></div>
                <div className="panel-body">
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
                    <Stat label="Días disponibles" value="12" sub="de 18 anuales" color="var(--success-deep)"/>
                    <Stat label="Tomados" value="6" sub="abr 8-13"/>
                  </div>
                  <div className="bar thick" style={{ marginBottom: 12 }}>
                    <span style={{ width: '33%', background: 'var(--success)' }}/>
                  </div>
                  <button className="btn primary" style={{ width: '100%' }}>{Icons.calendar} Solicitar vacaciones</button>
                  <div style={{ marginTop: 12, fontSize: 11.5, color: 'var(--ink-3)', borderTop: '1px solid var(--divider)', paddingTop: 10 }}>
                    Próx. capacitación: <strong style={{ color: 'var(--ink-1)' }}>NOM-035 STPS</strong> · jue 23 may
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

window.MiDiaV2 = MiDiaV2;
