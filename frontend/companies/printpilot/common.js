(() => {
  window.pages = window.pages || {};
  window.defaultCompanyPages = { ...window.pages };
  const h = (value) =>
    String(value ?? '').replace(
      /[&<>"']/g,
      (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch],
    );
  const money = (value) =>
    `$${Number(value || 0).toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  async function ppApi(url, options = {}) {
    const response = await window.apiRequest(url, options);
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'No se pudo completar la operación.');
    return result;
  }
  const json = (method, body) => ({
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const empty = (message) => `<div class="card empty">${h(message)}</div>`;
  const badge = (status) =>
    `<span class="badge pp-badge pp-${h(
      String(status || 'PENDIENTE')
        .toLowerCase()
        .replaceAll(' ', '-'),
    )}">${h(status || 'PENDIENTE')}</span>`;
  window.printpilotHelpers = { h, money, ppApi, json, empty, badge };
  const menu = [
    ['dashboard', '▦', 'Panel de control'],
    ['printpilot-agenda', '◷', 'Semana y mes'],
    ['printpilot-filters', '◉', 'Filtros'],
    ['printpilot-air', '❄', 'Aires'],
    ['printpilot-printers', '▣', 'Impresoras'],
    ['printpilot-oven', '♨', 'Hornos y secadoras'],
    ['printpilot-infrastructure', '▦', 'Infraestructura'],
    ['printpilot-cutter', '✂', 'Cortadoras'],
    ['printpilot-maintenance', '⌁', 'Mantenimientos'],
    ['printpilot-countermeasures', '⚒', 'Contramedidas'],
    ['printpilot-supplies', '▤', 'Insumos'],
    ['printpilot-documents', '▧', 'Documentos'],
    ['printpilot-reports', '▤', 'Informes'],
    ['printpilot-audit', '◴', 'Bitácora'],
    ['printpilot-technicians', '♙', 'Técnicos'],
  ];
  window.printpilotMenuHtml = () =>
    menu.map(([id, icon, label]) => `<button data-page="${id}">${icon} ${label}</button>`).join('');
  window.printpilotPages = {};
  const appRoot = document.querySelector('#app');
  appRoot?.addEventListener('click', (event) => {
    const button = event.target.closest('[data-pp-action]');
    if (!button) return;
    const { ppAction: action, id, status } = button.dataset;
    const actions = {
      reading: () => window.ppReadingForm(id),
      asset: () => window.ppEditAsset(id),
      start: () => window.ppChangeOrder(id, 'EN PROCESO'),
      cancel: () => window.ppChangeOrder(id, 'CANCELADA'),
      complete: () => window.ppCompleteOrder(id),
      countermeasure: () => window.ppEditCountermeasure(id),
      email: () => window.ppCountermeasureEmail(id),
      supplyIn: () => window.ppSupplyMovement(id, 'ENTRADA'),
      supplyUse: () => window.ppSupplyMovement(id, 'CONSUMO'),
      purchase: () => window.ppPurchase(id),
      document: () => window.ppOpenDocument(id),
      technician: () => window.ppEditTechnician(id),
    };
    actions[action]?.();
  });
  appRoot?.addEventListener('change', (event) => {
    const select = event.target.closest('[data-pp-action="countermeasure-status"]');
    if (select) window.ppSetCountermeasure(select.dataset.id, select.value);
  });
  const handlePpSubmit = (event) => {
    const form = event.target.closest('[data-pp-submit]');
    if (!form) return;
    event.preventDefault();
    const actions = {
      'save-asset': (e, id) => window.ppSaveAsset(e, id),
      'save-reading': (e, id) => window.ppSaveReading(e, id),
      'save-maintenance': (e, id) => window.ppSaveMaintenance(e, id),
      'save-countermeasure': (e, id) => window.ppSaveCountermeasureEdit(e, id),
      'save-supply': (e, id) => window.ppSaveSupply(e, id, form.dataset.movementType),
      'send-purchase': (e, id) => window.ppSendPurchase(e, id),
      'update-technician': (e, id) => window.ppUpdateTechnician(e, id),
    };
    actions[form.dataset.ppSubmit]?.(event, form.dataset.id);
  };
  appRoot?.addEventListener('submit', handlePpSubmit);
  document.querySelector('#modal')?.addEventListener('submit', handlePpSubmit);
})();
