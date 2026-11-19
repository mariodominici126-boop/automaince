window.apiRequest = async (url, options = {}) => {
  const token = sessionStorage.getItem('automaince.token');
  const headers = new Headers(options.headers || {});
  if (token) headers.set('Authorization', `Bearer ${token}`);
  const response = await fetch(url, { ...options, headers });
  if (response.status === 401 && token) {
    sessionStorage.removeItem('automaince.token');
    sessionStorage.removeItem('automaince.user');
    window.closeDataEvents?.();
    window.showAccessPanel?.();
  }
  return response;
};
const api = async (url) => {
  const r = await window.apiRequest(url);
  const result = await r.json();
  if (!r.ok) throw new Error(result.error || 'No se pudo cargar ' + url);
  return result;
};
const titles = {
  dashboard: 'Panel de control',
  vehicles: 'Camionetas',
  orders: 'Órdenes de mantenimiento',
  maintenance: 'Mantenimiento',
  repairs: 'Reparaciones',
  parts: 'Catálogo de piezas',
  documents: 'Documentos',
  alerts: 'Centro de alertas',
  analytics: 'Analytics',
  intelligence: 'AutoMaince Intelligence',
  'printpilot-assets': 'Activos registrados',
  'printpilot-agenda': 'Semana y mes',
  'printpilot-filters': 'Filtros',
  'printpilot-air': 'Aires',
  'printpilot-printers': 'Impresoras',
  'printpilot-oven': 'Hornos y secadoras',
  'printpilot-infrastructure': 'Infraestructura',
  'printpilot-cutter': 'Cortadoras',
  'printpilot-maintenance': 'Mantenimientos',
  'printpilot-countermeasures': 'Contramedidas',
  'printpilot-supplies': 'Insumos',
  'printpilot-documents': 'Documentos',
  'printpilot-reports': 'Informes',
  'printpilot-audit': 'Bitácora',
  'printpilot-technicians': 'Técnicos',
  'now-dashboard': 'Panel de control',
  'now-vehicles': 'Vehículos',
  'now-maintenance': 'Mantenimientos',
  'now-fuel': 'Combustible',
  'now-assignments': 'Asignaciones',
  'now-repairs': 'Reparaciones',
  'now-providers': 'Proveedores',
  'now-alerts': 'Alertas',
  'now-reports': 'Informes',
  'now-audit': 'Bitácora',
};
let activePage = 'dashboard';
let workspaceHistoryIndex = 0;
let updates;
window.connectDataEvents = () => {
  window.closeDataEvents();
  const token = sessionStorage.getItem('automaince.token');
  if (!token) return;
  const controller = new AbortController();
  updates = controller;
  const stream = async () => {
    while (!controller.signal.aborted) {
      try {
        const response = await fetch('/api/events', {
          headers: { Authorization: `Bearer ${token}`, Accept: 'text/event-stream' },
          signal: controller.signal,
        });
        if (!response.ok || !response.body) throw new Error('Conexión de eventos no disponible.');
        const reader = response.body.getReader(),
          decoder = new TextDecoder();
        let buffer = '';
        while (!controller.signal.aborted) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const events = buffer.split('\n\n');
          buffer = events.pop() || '';
          for (const event of events)
            if (event.split('\n').some((line) => line === 'event: data-changed'))
              navigate(activePage);
        }
      } catch (error) {
        if (controller.signal.aborted) return;
        await new Promise((resolve) => setTimeout(resolve, 2500));
      }
    }
  };
  stream();
};
window.closeDataEvents = () => {
  if (updates) {
    updates.abort();
    updates = undefined;
  }
};
window.loadWorkspaceData = () =>
  api('/api/alerts')
    .then((a) => {
      document.querySelector('#alertCount').textContent = a.length;
      document.querySelector('#headerAlertCount').textContent = a.length;
    })
    .catch(() => {});
window.resetWorkspaceHistory = function (page) {
  activePage = page;
  workspaceHistoryIndex = 0;
  window.history.replaceState({ autoMaincePage: page, autoMainceIndex: 0 }, '', location.href);
};
async function navigate(page, options = {}) {
  if (options.history !== false && page !== activePage) {
    workspaceHistoryIndex += 1;
    window.history.pushState(
      { autoMaincePage: page, autoMainceIndex: workspaceHistoryIndex },
      '',
      location.href,
    );
  }
  activePage = page;
  document
    .querySelectorAll('#nav button')
    .forEach((b) => b.classList.toggle('active', b.dataset.page === page));
  document.querySelector('#title').textContent = titles[page] || page;
  document.querySelector('#crumb').textContent =
    page === 'intelligence'
      ? 'MÓDULO EXPERIMENTAL'
      : 'OPERACIONES / ' + (titles[page] || page).toUpperCase();
  document.querySelector('#app').innerHTML = '<div class="card empty">Cargando…</div>';
  try {
    document.querySelector('#app').innerHTML = await (pages[page]
      ? pages[page]()
      : genericPage(page));
  } catch (e) {
    document.querySelector('#app').innerHTML =
      `<div class="card empty">No fue posible cargar los datos: ${e.message}</div>`;
  }
}
window.navigate = navigate;
window.addEventListener('popstate', (event) => {
  const state = event.state;
  if (!state || typeof state.autoMaincePage !== 'string') return;
  workspaceHistoryIndex = Number(state.autoMainceIndex) || 0;
  navigate(state.autoMaincePage, { history: false });
});
const mobileNavToggle = document.querySelector('.mobile-nav-toggle');
const mobileNavScrim = document.querySelector('.mobile-nav-scrim');
function setMobileNavOpen(open) {
  const workspace = document.querySelector('#workspace');
  const wasOpen = workspace.classList.contains('menu-open');
  workspace.classList.toggle('menu-open', open);
  mobileNavToggle?.setAttribute('aria-expanded', String(open));
  mobileNavToggle?.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
  if (open) document.querySelector('#nav button')?.focus({ preventScroll: true });
  else if (wasOpen) mobileNavToggle?.focus({ preventScroll: true });
}
mobileNavToggle?.addEventListener('click', () =>
  setMobileNavOpen(!document.querySelector('#workspace').classList.contains('menu-open')),
);
mobileNavScrim?.addEventListener('click', () => setMobileNavOpen(false));
document.querySelector('#nav').addEventListener('click', (e) => {
  const b = e.target.closest('button');
  if (b) {
    navigate(b.dataset.page);
    setMobileNavOpen(false);
  }
});
let swipeStart;
const workspaceRoot = document.querySelector('#workspace');
workspaceRoot.addEventListener(
  'touchstart',
  (event) => {
    if (event.touches.length !== 1) return;
    const target = event.target;
    if (
      target.closest(
        'input, textarea, select, button, a, [contenteditable="true"], #modal:not(.hidden)',
      )
    )
      return;
    swipeStart = {
      x: event.touches[0].clientX,
      y: event.touches[0].clientY,
      menuOpen: workspaceRoot.classList.contains('menu-open'),
    };
  },
  { passive: true },
);
workspaceRoot.addEventListener(
  'touchend',
  (event) => {
    if (!swipeStart || event.changedTouches.length !== 1) return;
    const end = event.changedTouches[0];
    const deltaX = end.clientX - swipeStart.x;
    const deltaY = end.clientY - swipeStart.y;
    const start = swipeStart;
    swipeStart = undefined;
    if (Math.abs(deltaX) < 90 || Math.abs(deltaX) < Math.abs(deltaY) * 1.35) return;
    if (start.menuOpen && deltaX < 0 && start.x < 320) {
      setMobileNavOpen(false);
      return;
    }
    if (!start.menuOpen && deltaX > 0 && start.x <= 22 && workspaceHistoryIndex > 0)
      window.history.back();
  },
  { passive: true },
);
workspaceRoot.addEventListener(
  'touchcancel',
  () => {
    swipeStart = undefined;
  },
  { passive: true },
);
document.addEventListener('keydown', (event) => {
  if (
    event.key === 'Escape' &&
    document.querySelector('#workspace').classList.contains('menu-open')
  )
    setMobileNavOpen(false);
});
document.querySelector('.notification').addEventListener('click', () => navigate('alerts'));
function openModal(content) {
  document.querySelector('#modal').innerHTML = `<div class="modal-box">${content}</div>`;
  document.querySelector('#modal').classList.remove('hidden');
}
function closeModal() {
  document.querySelector('#modal').classList.add('hidden');
}
function formError(data) {
  const toast = document.querySelector('#toast');
  toast.textContent = data.error || 'No se pudo guardar. Revise los datos.';
  toast.classList.remove('hidden');
  setTimeout(() => toast.classList.add('hidden'), 4000);
}
document.querySelector('#modal').addEventListener('click', (e) => {
  if (e.target.id === 'modal') closeModal();
});
async function genericPage(page) {
  if (page === 'repairs') {
    const rows = await api('/api/repairs');
    return simpleTable(
      'Reparaciones registradas',
      ['Fecha', 'Vehículo', 'Problema', 'Costo', 'Prioridad'],
      rows.map((x) => [
        x.date,
        x.vehicleId,
        x.problem,
        '$' + x.cost,
        `<span class="badge ROJO">${x.priority}</span>`,
      ]),
    );
  }
  if (page === 'parts') {
    const rows = await api('/api/parts');
    return simpleTable(
      'Catálogo básico de piezas',
      ['Código', 'Pieza', 'Categoría', 'Stock', 'Costo', 'Vida útil'],
      rows.map((x) => [x.code, x.name, x.category, x.quantity, '$' + x.cost, x.life]),
    );
  }
  if (page === 'alerts') {
    const rows = await api('/api/alerts');
    return `<div class="card"><h3 class="section-title">Alertas generadas automáticamente</h3><ul class="alert-list">${rows.map((x) => `<li><b><span class="badge ${x.level}">${x.level}</span> ${x.type} · ${x.vehicleId}</b>${x.message}</li>`).join('')}</ul></div>`;
  }
  if (page === 'intelligence') {
    const d = await api('/api/intelligence');
    return `<div class="card" style="margin-bottom:17px"><h3 class="section-title">Motor experimental de reglas y heurísticas</h3><p>Las señales se basan en el historial simulado. No constituyen una recomendación mecánica certificada ni un modelo de IA entrenado.</p></div><div class="split"><div class="card"><h3 class="section-title">Posibles anomalías detectadas</h3>${d.anomalies.map((a) => `<div class="card anomaly ${a.severity === 'Crítica' ? 'critical' : ''}"><span class="badge ${a.severity === 'Crítica' ? 'ROJO' : 'AMARILLO'}">${a.severity}</span><b> ${a.vehicleId} · ${a.vehicle}</b><p>${a.message}</p></div>`).join('')}</div><div class="card"><h3 class="section-title">Vehicle Risk Score</h3><table><thead><tr><th>VEHÍCULO</th><th>RIESGO</th><th>NIVEL</th></tr></thead><tbody>${d.risks
      .sort((a, b) => b.score - a.score)
      .map(
        (r) =>
          `<tr><td>${r.vehicleId}</td><td><b>${r.score}/100</b></td><td><span class="badge ${r.level}">${r.level}</span></td></tr>`,
      )
      .join('')}</tbody></table></div></div>`;
  }
  return '<div class="card empty">Módulo disponible próximamente.</div>';
}
function simpleTable(title, heads, rows) {
  return `<div class="card table-card"><h3 class="section-title">${title}</h3><table><thead><tr>${heads.map((h) => `<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.map((r) => `<tr>${r.map((x) => `<td>${x}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
}
async function exportCsv(source) {
  const rows = source === 'analytics' ? await api('/api/vehicles') : [];
  const csv = [
    'ID,Placa,Marca,Modelo,Kilometraje,Estado,Costo mensual',
    ...rows.map((v) =>
      [v.id, v.plate, v.brand, v.model, v.mileage, v.status, v.monthlyCost]
        .map((x) => `"${String(x).replaceAll('"', '""')}"`)
        .join(','),
    ),
  ].join('\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  a.download = 'automaince-vehiculos.csv';
  a.click();
  URL.revokeObjectURL(a.href);
}
document.querySelector('.user').addEventListener('click', async () => {
  try {
    await window.apiRequest('/api/auth/logout', { method: 'POST' });
  } finally {
    sessionStorage.removeItem('automaince.token');
    sessionStorage.removeItem('automaince.user');
    window.closeDataEvents();
    document.getElementById('workspace').classList.add('hidden');
    document.getElementById('workspace').classList.remove('company-gtg');
    document.getElementById('workspace').classList.remove('company-now', 'company-printpilot');
    window.showAccessPanel();
  }
});
const savedUser = sessionStorage.getItem('automaince.user');
if (savedUser && sessionStorage.getItem('automaince.token')) {
  try {
    window.enterMaintenanceWorkspace(JSON.parse(savedUser));
  } catch {
    sessionStorage.removeItem('automaince.token');
    sessionStorage.removeItem('automaince.user');
    window.showAccessPanel();
  }
} else {
  sessionStorage.removeItem('automaince.token');
  sessionStorage.removeItem('automaince.user');
  window.showAccessPanel();
}
