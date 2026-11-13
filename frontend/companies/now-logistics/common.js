(() => {
  window.nowPages = {};
  const h = (value) =>
    String(value ?? '').replace(
      /[&<>"']/g,
      (character) =>
        ({
          '&': '&amp;',
          '<': '&lt;',
          '>': '&gt;',
          '"': '&quot;',
          "'": '&#39;',
        })[character],
    );
  const money = (value) =>
    `$${Number(value || 0).toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  async function api(url, options = {}) {
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
  const today = () =>
    new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Santo_Domingo' }).format(new Date());
  const statusBadge = (status) =>
    `<span class="badge now-badge">${h(status || 'PENDIENTE')}</span>`;
  window.nowHelpers = { h, money, api, json, empty, today, statusBadge };

  const menus = [
    ['now-dashboard', '▦', 'Panel de control'],
    ['now-vehicles', '▣', 'Vehículos'],
    ['now-maintenance', '⌁', 'Mantenimientos'],
    ['now-fuel', '◉', 'Combustible'],
    ['now-assignments', '⇄', 'Asignaciones'],
    ['now-repairs', '⚒', 'Reparaciones'],
    ['now-providers', '◇', 'Proveedores'],
    ['now-alerts', '!', 'Alertas'],
    ['now-reports', '▤', 'Informes'],
    ['now-audit', '◴', 'Bitácora'],
  ];
  window.nowMenuHtml = () =>
    menus
      .map(([page, icon, label]) => `<button data-page="${page}">${icon} ${label}</button>`)
      .join('');

  document.querySelector('#app')?.addEventListener('click', (event) => {
    const button = event.target.closest('[data-now-action]');
    if (!button) return;
    const { nowAction, id } = button.dataset;
    const handlers = {
      maintenance: () => window.nowMaintenanceForm(id),
      repair: () => window.nowRepairForm(id),
      fuel: () => window.nowFuelForm(id),
      assignment: () => window.nowAssignmentForm(id),
      provider: () => window.nowProviderForm(),
      reschedule: () => window.nowRescheduleForm(id),
      reportCsv: () => window.nowExportReport(),
      vehicleEdit: () => window.nowVehicleForm(id),
    };
    handlers[nowAction]?.();
  });
  document.querySelector('#modal')?.addEventListener('submit', async (event) => {
    const form = event.target.closest('[data-now-submit]');
    if (!form) return;
    event.preventDefault();
    const actions = {
      maintenance: window.nowSaveMaintenance,
      repair: window.nowSaveRepair,
      fuel: window.nowSaveFuel,
      assignment: window.nowSaveAssignment,
      provider: window.nowSaveProvider,
      reschedule: window.nowSaveReschedule,
      vehicle: window.nowSaveVehicle,
    };
    await actions[form.dataset.nowSubmit]?.(event);
  });
  window.nowOpenModal = (content) => window.openModal(`<div class="now-modal">${content}</div>`);
  window.nowFormError = (error) => window.formError({ error: error.message || String(error) });
})();
