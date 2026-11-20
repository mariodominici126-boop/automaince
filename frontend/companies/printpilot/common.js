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
  const formatDate = (value) => {
    if (!value) return '—';
    const raw = String(value);
    const date = /^\d{4}-\d{2}-\d{2}$/.test(raw) ? new Date(`${raw}T12:00:00Z`) : new Date(raw);
    return Number.isNaN(date.valueOf())
      ? raw
      : new Intl.DateTimeFormat('es-DO', {
          timeZone: 'America/Santo_Domingo',
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
        }).format(date);
  };
  const dateInput = (value) => {
    if (!value) return '';
    if (/^\d{4}-\d{2}-\d{2}/.test(String(value))) return String(value).slice(0, 10);
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Santo_Domingo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(new Date(value));
    return `${parts.find((x) => x.type === 'year').value}-${parts.find((x) => x.type === 'month').value}-${parts.find((x) => x.type === 'day').value}`;
  };
  const formatDateTime = (value) => {
    if (!value) return '—';
    const date = new Date(value);
    return Number.isNaN(date.valueOf())
      ? String(value)
      : new Intl.DateTimeFormat('es-DO', {
          timeZone: 'America/Santo_Domingo',
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          hourCycle: 'h23',
        }).format(date);
  };
  const dateTimeInput = (value) => {
    if (!value) return '';
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Santo_Domingo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(new Date(value));
    const get = (type) => parts.find((x) => x.type === type).value;
    return `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}`;
  };
  const dateTimeToISO = (value) => (value ? new Date(`${value}:00-04:00`).toISOString() : null);
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
  window.printpilotHelpers = {
    h,
    money,
    ppApi,
    json,
    empty,
    badge,
    formatDate,
    formatDateTime,
    dateInput,
    dateTimeInput,
    dateTimeToISO,
  };
  const menu = [
    ['dashboard', '▦', 'Panel de control'],
    ['printpilot-assets', '▣', 'Activos'],
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
    const pageLink = event.target.closest('[data-pp-page]');
    if (pageLink) {
      window.navigate(pageLink.dataset.ppPage);
      return;
    }
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
  window.ppSubmitForm = async (event, operation) => {
    event.preventDefault();
    const form = event.target.closest('form');
    if (!form || form.dataset.submitting === 'true') return;
    form.dataset.submitting = 'true';
    const buttons = [...form.querySelectorAll('button[type="submit"],button:not([type])')];
    buttons.forEach((button) => {
      button.disabled = true;
      button.dataset.originalText = button.textContent;
      button.textContent = 'Guardando…';
    });
    try {
      await operation(event);
    } catch (error) {
      window.formError({ error: error.message || 'No se pudo completar la operación.' });
    } finally {
      if (form.isConnected) {
        delete form.dataset.submitting;
        buttons.forEach((button) => {
          button.disabled = false;
          if (button.dataset.originalText) button.textContent = button.dataset.originalText;
        });
      }
    }
  };
  const handlePpSubmit = (event) => {
    const form = event.target.closest('[data-pp-submit]');
    if (!form) return;
    const actions = {
      'save-asset': (e, id) => window.ppSaveAsset(e, id),
      'save-reading': (e, id) => window.ppSaveReading(e, id),
      'save-maintenance': (e, id) => window.ppSaveMaintenance(e, id),
      'save-countermeasure': (e, id) => window.ppSaveCountermeasureEdit(e, id),
      'save-supply': (e, id) => window.ppSaveSupply(e, id, form.dataset.movementType),
      'send-purchase': (e, id) => window.ppSendPurchase(e, id),
      'update-technician': (e, id) => window.ppUpdateTechnician(e, id),
      'create-plan': (e) => window.ppSavePlan(e),
      'create-asset': (e) => window.ppSaveNewAsset(e),
      'create-countermeasure': (e) => window.ppSaveCountermeasure(e),
      'email-countermeasure': (e) => window.ppOpenGmail(e),
      'upload-document': (e) => window.ppUploadDocument(e),
      'create-technician': (e) => window.ppSaveTechnician(e),
    };
    const action = actions[form.dataset.ppSubmit];
    if (action) window.ppSubmitForm(event, () => action(event, form.dataset.id));
  };
  appRoot?.addEventListener('submit', handlePpSubmit);
  document.querySelector('#modal')?.addEventListener('submit', handlePpSubmit);
})();
