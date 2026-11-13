(() => {
  const { h, money, ppApi, json, empty, badge } = window.printpilotHelpers;
  window.printpilotPages['printpilot-filters'] = async () => {
    const [plans, orders] = await Promise.all([
      ppApi('/api/printpilot/plans'),
      ppApi('/api/printpilot/orders'),
    ]);
    const taskLabels = (tasks) =>
      Array.isArray(tasks)
        ? tasks
            .map((task) => (typeof task === 'string' ? task : task?.label || ''))
            .filter(Boolean)
            .join(' · ')
        : '';
    return `<div class="pp-heading"><div><span class="pp-eyebrow">PREVENCIÓN DE EQUIPOS</span><h2>Filtros</h2><p>El documento recibido indica cambio de filtros principales mensual y mantenimiento semestral.</p></div></div><div class="grid pp-plan-cards">${plans
      .filter((p) => p.category === 'FILTROS')
      .map(
        (p) =>
          `<article class="card"><span class="pp-eyebrow">FRECUENCIA</span><h3>${h(p.name)}</h3><p>${h(taskLabels(p.tasks))}</p><small>Próxima ejecución: ${h(p.nextDueAt || 'Por lectura de uso')} · ${h((p.assetIds || []).length)} equipos relacionados</small></article>`,
      )
      .join(
        '',
      )}</div><div class="card table-card pp-top-space"><h3 class="section-title">Calendario de filtros</h3>${window.ppOrderList(orders.filter((o) => o.plan_category === 'FILTROS'))}</div>`;
  };
})();
