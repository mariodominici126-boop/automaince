(() => {
  const { h, money, ppApi, json, empty, badge } = window.printpilotHelpers;
  window.printpilotPages.dashboard = async () => {
    const d = await ppApi('/api/printpilot/dashboard'),
      counts = d.counts || {},
      assets = d.assets || {};
    return `<div class="pp-heading"><div><span class="pp-eyebrow">PRINTPILOT · OPERACIONES</span><h2>Panel de control</h2><p>Activos y trabajos de mantenimiento programados.</p></div><button class="btn" onclick="navigate('printpilot-agenda')">Ver agenda</button></div>
      <div class="grid kpis"><div class="card kpi"><span class="label">Activos registrados</span><b>${h(assets.total || 0)}</b><span class="trend">${h(assets.operating || 0)} operativos</span></div><div class="card kpi"><span class="label">Órdenes programadas</span><b>${h(counts.scheduled || 0)}</b><span class="trend">en calendario</span></div><div class="card kpi"><span class="label">En proceso</span><b>${h(counts.in_progress || 0)}</b><span class="trend warn">requieren seguimiento</span></div><div class="card kpi"><span class="label">Vencidas</span><b>${h(counts.overdue || 0)}</b><span class="trend danger">prioridad de atención</span></div></div>
      <div class="grid pp-schedule-grid"><section class="card"><div class="card-heading"><div><span class="pp-eyebrow">PRÓXIMOS 7 DÍAS</span><h3 class="section-title">Esta semana</h3></div><button class="text-button" onclick="navigate('printpilot-agenda')">Abrir agenda</button></div>${window.ppOrderList(d.week)}</section><section class="card"><div class="card-heading"><div><span class="pp-eyebrow">PRÓXIMOS 30 DÍAS</span><h3 class="section-title">Este mes</h3></div></div>${window.ppOrderList(d.month)}</section></div>`;
  };
  window.ppOrderList = (items) => {
    return items?.length
      ? `<ul class="pp-agenda-list">${items
          .slice(0, 8)
          .map(
            (o) =>
              `<li><time>${h(o.plannedAt || 'Sin fecha')}</time><div><b>${h(o.asset_name || o.asset_code)}</b><small>${h(o.description)}</small></div>${badge(o.status)}</li>`,
          )
          .join('')}</ul>`
      : empty('No hay mantenimientos programados en este período.');
  };
})();
