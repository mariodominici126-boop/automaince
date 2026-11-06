(() => {
  const { h, money, ppApi, json, empty, badge } = window.printpilotHelpers;
  window.printpilotPages['printpilot-maintenance'] = async () => {
    const [orders, records, assets] = await Promise.all([
      ppApi('/api/printpilot/orders'),
      ppApi('/api/printpilot/maintenance'),
      ppApi('/api/printpilot/assets'),
    ]);
    return `<div class="pp-heading"><div><span class="pp-eyebrow">REGISTRO DE TRABAJO</span><h2>Mantenimientos</h2><p>Completa una orden programada y guarda el historial por equipo.</p></div><button class="btn secondary" onclick="navigate('printpilot-agenda')">Ver semana / mes</button></div><div class="card table-card"><h3 class="section-title">Órdenes planificadas</h3>${orders.length ? `<table><thead><tr><th>FECHA</th><th>ACTIVO</th><th>TRABAJO PROGRAMADO</th><th>ESTADO</th><th></th></tr></thead><tbody>${orders.map((o) => `<tr><td>${h(o.plannedAt || '—')}</td><td>${h(o.asset_name)}</td><td>${h(o.description)}</td><td>${badge(o.status)}</td><td>${o.status === 'PROGRAMADA' ? `<button class="table-action" data-pp-action="start" data-id="${h(o.id)}">Iniciar</button> <button class="table-action" data-pp-action="cancel" data-id="${h(o.id)}">Cancelar</button> <button class="table-action" data-pp-action="complete" data-id="${h(o.id)}">Registrar trabajo</button>` : o.status === 'EN PROCESO' ? `<button class="table-action" data-pp-action="cancel" data-id="${h(o.id)}">Cancelar</button> <button class="table-action" data-pp-action="complete" data-id="${h(o.id)}">Registrar trabajo</button>` : o.status === 'COMPLETADA' ? 'Registrado' : '—'}</td></tr>`).join('')}</tbody></table>` : empty('No hay órdenes programadas.')}</div><div class="card table-card pp-top-space"><h3 class="section-title">Historial realizado</h3>${ppMaintenanceTable(records)}</div>`;
  };
  function ppMaintenanceTable(rows) {
    return rows.length
      ? `<table><thead><tr><th>FECHA</th><th>ACTIVO</th><th>TRABAJO</th><th>TÉCNICO</th><th>COSTO</th><th>HALLAZGO</th></tr></thead><tbody>${rows.map((m) => `<tr><td>${h(m.completed_at || m.plannedAt || '—')}</td><td>${h(m.asset_name)}</td><td>${h(m.description)}</td><td>${h(m.technician_name || '—')}</td><td>${money(m.total_cost)}</td><td>${h(m.findings || '—')}</td></tr>`).join('')}</tbody></table>`
      : empty('Aún no hay mantenimientos completados.');
  }
  window.ppCompleteOrder = async (orderId) => {
    const [orders, plans, technicians, supplies] = await Promise.all([
      ppApi('/api/printpilot/orders'),
      ppApi('/api/printpilot/plans'),
      ppApi('/api/printpilot/technicians'),
      ppApi('/api/printpilot/supplies'),
    ]);
    const order = orders.find((x) => x.id === orderId);
    if (!order) return;
    const plan = plans.find((x) => x.id === order.plan_id),
      tasks = plan?.tasks || [];
    window.ppCurrentTasks = tasks;
    window.ppCurrentSupplies = supplies;
    window.openModal(
      `<h2>Registrar mantenimiento realizado</h2><p class="muted">${h(order.asset_name)} · ${h(order.description)}</p><form class="form pp-form" data-pp-submit="save-maintenance" data-id="${h(orderId)}"><label class="wide">Lista de tareas obligatorias</label>${tasks.map((task, index) => `<label class="wide pp-check"><input type="checkbox" name="task-${index}" required> ${h(typeof task === 'string' ? task : task.label)}</label>`).join('')}<label>Técnico responsable<select name="technicianId" required><option value="">Selecciona un técnico</option>${technicians
        .filter((t) => t.active)
        .map((t) => `<option value="${h(t.id)}">${h(t.name)} · ${h(t.company_name)}</option>`)
        .join(
          '',
        )}</select></label><label>Fecha real de inicio<input name="startedAt" type="datetime-local"></label><label>Horas de trabajo<input name="laborHours" type="number" min="0" step="0.25" value="0"></label><label>Costo mano de obra<input name="laborCost" type="number" min="0" step="0.01" value="0"></label><label class="wide">Materiales / insumos utilizados</label>${supplies.map((s) => `<label>${h(s.name)} (disponible: ${h(s.quantity)} ${h(s.unit)})<input name="material-${h(s.id)}" type="number" min="0" max="${h(s.quantity)}" step="0.01" value="0"></label>`).join('')}<p class="muted wide">El costo total se calcula automáticamente con mano de obra e insumos utilizados.</p><label class="wide">Observaciones<textarea name="observations"></textarea></label><label class="wide">Hallazgos<textarea name="findings"></textarea></label><label class="wide">Recomendaciones<textarea name="recommendations"></textarea></label><label class="wide">Descripción final<textarea name="description" required>${h(order.description)}</textarea></label><div class="modal-actions wide"><button type="button" class="btn secondary" onclick="closeModal()">Cancelar</button><button class="btn">Guardar historial</button></div></form>`,
    );
  };
  window.ppChangeOrder = async (id, status) => {
    const response = await window.apiRequest(
      `/api/printpilot/orders/${id}`,
      json('PATCH', { status }),
    );
    if (!response.ok) return window.formError(await response.json());
    window.navigate('printpilot-maintenance');
  };
  window.ppSaveMaintenance = async (event, orderId) => {
    event.preventDefault();
    const tasks = window.ppCurrentTasks || [],
      f = new FormData(event.target),
      checklist = tasks.map((task, i) => ({
        label: typeof task === 'string' ? task : task.label,
        done: f.has(`task-${i}`),
      })),
      materials = (window.ppCurrentSupplies || [])
        .map((s) => ({ supplyId: s.id, quantity: Number(f.get(`material-${s.id}`) || 0) }))
        .filter((x) => x.quantity > 0);
    const body = {
      orderId,
      technicianId: f.get('technicianId'),
      startedAt: f.get('startedAt') || null,
      laborHours: Number(f.get('laborHours') || 0),
      laborCost: Number(f.get('laborCost') || 0),
      materials,
      observations: f.get('observations'),
      findings: f.get('findings'),
      recommendations: f.get('recommendations'),
      description: f.get('description'),
      checklist,
    };
    const response = await window.apiRequest('/api/printpilot/maintenance', json('POST', body));
    if (!response.ok) return window.formError(await response.json());
    window.closeModal();
    window.navigate('printpilot-maintenance');
  };
})();
