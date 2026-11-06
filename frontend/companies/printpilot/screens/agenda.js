(() => {
  const { h, money, ppApi, json, empty, badge } = window.printpilotHelpers;
  window.printpilotPages['printpilot-agenda'] = async () => {
    const [week] = await Promise.all([ppApi('/api/printpilot/dashboard')]);
    return `<div class="pp-heading"><div><span class="pp-eyebrow">CALENDARIO PREVENTIVO</span><h2>Agenda de mantenimientos</h2><p>Descripción breve, activo y fecha para organizar el trabajo.</p></div><button class="btn" onclick="ppPlanForm()">+ Crear plan</button></div><div class="grid pp-schedule-grid"><section class="card"><span class="pp-eyebrow">PRÓXIMOS 7 DÍAS</span><h3 class="section-title">Esta semana</h3>${window.ppOrderList(week.week)}</section><section class="card"><span class="pp-eyebrow">PRÓXIMOS 30 DÍAS</span><h3 class="section-title">Este mes</h3>${window.ppOrderList(week.month)}</section></div><div class="card table-card pp-top-space"><h3 class="section-title">Planes preventivos</h3>${await ppPlanTable()}</div>`;
  };
  async function ppPlanTable() {
    const plans = await ppApi('/api/printpilot/plans');
    return plans.length
      ? `<table><thead><tr><th>PLAN</th><th>ACTIVOS</th><th>FRECUENCIA</th><th>PRÓXIMA FECHA / LECTURA</th><th>ESTADO</th></tr></thead><tbody>${plans.map((p) => `<tr><td><b>${h(p.name)}</b><small>${h(p.category)}</small></td><td>${h((p.assetIds || []).length)}</td><td>${p.interval_months ? `Cada ${p.interval_months} mes(es)` : p.interval_days ? `Cada ${p.interval_days} día(s)` : `Cada ${p.usage_interval} ${h(p.usage_unit || 'unidades')}`}</td><td>${h(p.nextDueAt || (p.usage_interval ? 'Por lectura de uso' : '—'))}</td><td>${p.active ? 'Activo' : 'Pausado'}</td></tr>`).join('')}</tbody></table>`
      : empty('Aún no hay planes preventivos.');
  }
  window.ppPlanForm = async () => {
    const [assets, techs] = await Promise.all([
      ppApi('/api/printpilot/assets'),
      ppApi('/api/printpilot/technicians'),
    ]);
    const p = Object.fromEntries(
      new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/Santo_Domingo',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      })
        .formatToParts(new Date())
        .map((x) => [x.type, x.value]),
    );
    const today = `${p.year}-${p.month}-${p.day}`;
    window.openModal(
      `<h2>Crear plan preventivo</h2><form class="form pp-form" onsubmit="ppSavePlan(event)"><label class="wide">Nombre del plan<input name="name" required></label><label>Categoría<select name="category"><option>AIRES</option><option>FILTROS</option><option>IMPRESORAS</option><option>HORNO_SECADO</option><option>INFRAESTRUCTURA</option><option>CORTADORAS</option></select></label><label>Próxima fecha (si usa calendario)<input type="date" name="nextDueAt" value="${today}"></label><label>Frecuencia en meses<input type="number" name="intervalMonths" min="1" placeholder="Ej.: 6"></label><label>Frecuencia en días<input type="number" name="intervalDays" min="1" placeholder="Alternativa a meses"></label><label>Frecuencia por uso (opcional)<input type="number" name="usageInterval" min="1"></label><label>Unidad de uso<select name="usageUnit"><option value="">Sin contador</option><option>HORAS</option><option>CICLOS</option><option>IMPRESIONES</option></select></label><label>Técnico asignado<select name="technicianId"><option value="">Sin asignar</option>${techs.map((t) => `<option value="${h(t.id)}">${h(t.name)}</option>`).join('')}</select></label><label class="wide">Activos incluidos<select name="assetIds" multiple size="6" required>${assets.map((a) => `<option value="${h(a.id)}">${h(a.code)} · ${h(a.name)}</option>`).join('')}</select><small>Mantén Ctrl para elegir varios.</small></label><label class="wide">Tareas obligatorias, una por línea<textarea name="tasks" required placeholder="Inspeccionar filtro\nLimpiar componentes\nRegistrar hallazgos"></textarea></label><div class="modal-actions wide"><button type="button" class="btn secondary" onclick="closeModal()">Cancelar</button><button class="btn">Guardar plan</button></div></form>`,
    );
  };
  window.ppSavePlan = async (event) => {
    event.preventDefault();
    const f = new FormData(event.target),
      assetIds = [...event.target.elements.assetIds.selectedOptions].map((x) => x.value),
      intervalMonths = Number(f.get('intervalMonths') || 0),
      intervalDays = Number(f.get('intervalDays') || 0),
      usageInterval = Number(f.get('usageInterval') || 0);
    if (!intervalMonths && !intervalDays && !usageInterval)
      return window.formError({
        error: 'Indica una frecuencia en meses, días u horas/ciclos/impresiones.',
      });
    const body = {
      name: f.get('name'),
      category: f.get('category'),
      nextDueAt: intervalMonths || intervalDays ? f.get('nextDueAt') || null : null,
      intervalMonths,
      intervalDays,
      usageInterval: usageInterval || null,
      usageUnit: f.get('usageUnit') || null,
      technicianId: f.get('technicianId') || null,
      assetIds,
      tasks: String(f.get('tasks'))
        .split('\n')
        .map((label) => label.trim())
        .filter(Boolean)
        .map((label) => ({ label, required: true })),
    };
    const response = await window.apiRequest('/api/printpilot/plans', json('POST', body));
    if (!response.ok) return window.formError(await response.json());
    window.closeModal();
    window.navigate('printpilot-agenda');
  };
})();
