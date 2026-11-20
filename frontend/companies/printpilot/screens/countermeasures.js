(() => {
  const {
    h,
    money,
    ppApi,
    json,
    empty,
    badge,
    dateInput,
    dateTimeInput,
    dateTimeToISO,
    formatDate,
  } = window.printpilotHelpers;
  const partsControls = (supplies, selected = []) =>
    `<fieldset class="wide pp-parts-picker"><legend>Repuestos de Insumos</legend>${
      supplies
        .map((s) => {
          const chosen = selected.find((x) => x.supplyId === s.id);
          return `<label><input type="checkbox" name="partsSupplyId" value="${h(s.id)}" ${chosen ? 'checked' : ''}> ${h(s.name)} · disponible ${h(s.quantity)} ${h(s.unit)} · ${money(s.unit_cost)} / ${h(s.unit)}<input aria-label="Cantidad de ${h(s.name)}" type="number" name="partsQuantity-${h(s.id)}" min="0.01" step="0.01" value="${h(chosen?.quantity || 1)}"></label>`;
        })
        .join('') || '<small>No hay insumos configurados.</small>'
    }</fieldset>`;
  window.printpilotPages['printpilot-countermeasures'] = async () => {
    const rows = await ppApi('/api/printpilot/countermeasures');
    return `<div class="pp-heading"><div><span class="pp-eyebrow">MANTENIMIENTO CORRECTIVO · REPARACIONES</span><h2>Contramedidas</h2><p>Documenta fallas, causa raíz, cambios electrónicos, repuestos y evidencia de cierre.</p></div><button class="btn" onclick="ppCountermeasureForm()">+ Nueva contramedida</button></div><div class="grid pp-kpis"><div class="card"><span class="label">Pendientes</span><b>${rows.filter((x) => ['PENDIENTE', 'PROGRAMADA'].includes(x.status)).length}</b></div><div class="card"><span class="label">En proceso</span><b>${rows.filter((x) => x.status === 'EN PROCESO').length}</b></div><div class="card"><span class="label">Completadas</span><b>${rows.filter((x) => ['COMPLETADA', 'CERRADA'].includes(x.status)).length}</b></div></div><div class="card table-card pp-top-space"><h3 class="section-title">Casos correctivos</h3>${rows.length ? `<table><thead><tr><th>ID / FECHA</th><th>ACTIVO</th><th>HALLAZGO</th><th>ESTADO</th><th>TÉCNICO</th><th>COSTO</th><th>INFORME</th></tr></thead><tbody>${rows.map((c) => `<tr><td><b>${h(c.id)}</b><small>${h(formatDate(c.created_at))}</small><button class="table-action" data-pp-action="countermeasure" data-id="${h(c.id)}">Editar detalles</button></td><td>${h(c.asset_name)}</td><td><b>${h(c.title)}</b><small>${h(c.issue)}</small></td><td><select aria-label="Estado de ${h(c.id)}" data-pp-action="countermeasure-status" data-id="${h(c.id)}">${['PENDIENTE', 'PROGRAMADA', 'EN PROCESO', 'COMPLETADA', 'CERRADA'].map((x) => `<option ${c.status === x ? 'selected' : ''}>${x}</option>`).join('')}</select></td><td>${h(c.technician_name || '—')}</td><td>${money(c.total_cost)}</td><td><button class="table-action" data-pp-action="email" data-id="${h(c.id)}">Enviar por Gmail</button></td></tr>`).join('')}</tbody></table>` : empty('Aún no hay contramedidas. Las reparaciones se registran aquí.')}</div>`;
  };
  window.ppCountermeasureForm = async () => {
    const [assets, technicians, supplies] = await Promise.all([
      ppApi('/api/printpilot/assets'),
      ppApi('/api/printpilot/technicians'),
      ppApi('/api/printpilot/supplies'),
    ]);
    window.openModal(
      `<h2>Registrar contramedida / reparación</h2><form class="form pp-form" data-pp-submit="create-countermeasure"><label>Activo<select name="assetId" required>${assets.map((a) => `<option value="${h(a.id)}">${h(a.code)} · ${h(a.name)}</option>`).join('')}</select></label><label>Estado<select name="status"><option>PENDIENTE</option><option>PROGRAMADA</option><option>EN PROCESO</option></select></label><label>Título<input name="title" required></label><label>Prioridad<select name="priority"><option>MEDIA</option><option>ALTA</option><option>CRITICA</option></select></label><label class="wide">Hallazgo / falla<textarea name="issue" required></textarea></label><label class="wide">Causa raíz<textarea name="rootCause"></textarea></label><label class="wide">Acción correctiva realizada<textarea name="actionTaken"></textarea></label><label class="wide">Cambios electrónicos / pared electrónica<textarea name="electronicChanges" placeholder="Intercambio de electrónicos, pared electrónica Kornit, componente sustituido, etc."></textarea></label><label>Técnico<select name="technicianId"><option value="">Sin asignar</option>${technicians.map((t) => `<option value="${h(t.id)}">${h(t.name)} · ${h(t.company_name)}</option>`).join('')}</select></label><label>Proveedor<input name="provider"></label><label>Fecha planificada<input type="date" name="plannedAt"></label><label>Horas de mano de obra<input type="number" min="0" step="0.25" name="laborHours" value="0"></label><label>Costo de mano de obra<input type="number" min="0" step="0.01" name="laborCost" value="0"></label>${partsControls(supplies)}<label>Costo total estimado<input name="totalCost" value="Calculado al guardar" readonly></label><label class="wide">Notas y recomendaciones<textarea name="notes"></textarea></label><div class="modal-actions wide"><button type="button" class="btn secondary" onclick="closeModal()">Cancelar</button><button class="btn">Guardar contramedida</button></div></form>`,
    );
  };
  window.ppSaveCountermeasure = async (event) => {
    event.preventDefault();
    const x = Object.fromEntries(new FormData(event.target));
    ['laborHours', 'laborCost'].forEach((k) => (x[k] = Number(x[k] || 0)));
    const formData = new FormData(event.target);
    x.parts = formData.getAll('partsSupplyId').map((supplyId) => ({
      supplyId,
      quantity: Number(formData.get(`partsQuantity-${supplyId}`)),
    }));
    const response = await window.apiRequest('/api/printpilot/countermeasures', json('POST', x));
    if (!response.ok) return window.formError(await response.json());
    window.closeModal();
    window.navigate('printpilot-countermeasures');
  };
  window.ppEditCountermeasure = async (id) => {
    const [rows, technicians, supplies] = await Promise.all([
      ppApi('/api/printpilot/countermeasures'),
      ppApi('/api/printpilot/technicians'),
      ppApi('/api/printpilot/supplies'),
    ]);
    const c = rows.find((x) => x.id === id);
    if (!c) return;
    window.openModal(
      `<h2>Editar ${h(c.id)}</h2><form class="form pp-form" data-pp-submit="save-countermeasure" data-id="${h(c.id)}" data-original-started-at="${h(c.started_at || '')}" data-original-completed-at="${h(c.completed_at || '')}"><label>Estado<select name="status">${['PENDIENTE', 'PROGRAMADA', 'EN PROCESO', 'COMPLETADA', 'CERRADA'].map((x) => `<option ${c.status === x ? 'selected' : ''}>${x}</option>`).join('')}</select></label><label>Prioridad<select name="priority">${['BAJA', 'MEDIA', 'ALTA', 'CRITICA'].map((x) => `<option ${c.priority === x ? 'selected' : ''}>${x}</option>`).join('')}</select></label><label class="wide">Causa raíz<textarea name="rootCause">${h(c.root_cause)}</textarea></label><label class="wide">Acción correctiva<textarea name="actionTaken">${h(c.action_taken)}</textarea></label><label class="wide">Cambios electrónicos<textarea name="electronicChanges">${h(c.electronic_changes)}</textarea></label><label>Técnico<select name="technicianId"><option value="">Sin asignar</option>${technicians.map((t) => `<option value="${h(t.id)}" ${c.technician_id === t.id ? 'selected' : ''}>${h(t.name)}</option>`).join('')}</select></label><label>Proveedor<input name="provider" value="${h(c.provider)}"></label><label>Fecha planificada<input type="date" name="plannedAt" value="${h(dateInput(c.planned_at))}"></label><label>Inicio real<input type="datetime-local" name="startedAt" value="${h(dateTimeInput(c.started_at))}"></label><label>Terminación<input type="datetime-local" name="completedAt" value="${h(dateTimeInput(c.completed_at))}"></label><label>Horas de trabajo<input type="number" min="0" step="0.25" name="laborHours" value="${h(c.labor_hours)}"></label><label>Costo mano de obra<input type="number" min="0" step="0.01" name="laborCost" value="${h(c.labor_cost)}"></label><label>Costo total<input name="totalCost" value="${h(money(c.total_cost))}" readonly></label><label class="wide">Checklist (separa tareas por línea; escribe [x] al completar)<textarea name="checklistText">${h((c.checklist || []).map((x) => `${x.done ? '[x] ' : '[ ] '}${x.label}`).join('\n'))}</textarea></label>${partsControls(supplies, c.parts || [])}<label class="wide">Notas<textarea name="notes">${h(c.notes)}</textarea></label><div class="modal-actions wide"><button class="btn secondary" type="button" onclick="closeModal()">Cancelar</button><button class="btn">Guardar cambios</button></div></form>`,
    );
  };
  window.ppSaveCountermeasureEdit = async (event, id) => {
    event.preventDefault();
    const f = new FormData(event.target),
      body = Object.fromEntries(f);
    for (const key of ['laborHours', 'laborCost']) body[key] = Number(body[key] || 0);
    body.technicianId = body.technicianId || null;
    body.startedAt =
      body.startedAt === dateTimeInput(event.target.dataset.originalStartedAt)
        ? event.target.dataset.originalStartedAt || null
        : dateTimeToISO(body.startedAt);
    body.completedAt =
      body.completedAt === dateTimeInput(event.target.dataset.originalCompletedAt)
        ? event.target.dataset.originalCompletedAt || null
        : dateTimeToISO(body.completedAt);
    if (!body.startedAt) delete body.startedAt;
    if (!body.completedAt) delete body.completedAt;
    body.plannedAt = body.plannedAt ? dateInput(body.plannedAt) : null;
    body.checklist = String(f.get('checklistText'))
      .split('\n')
      .filter(Boolean)
      .map((line) => ({
        label: line.replace(/^\[x\]\s*|^\[\s\]\s*/i, ''),
        done: /^\[x\]/i.test(line),
      }));
    body.parts = f
      .getAll('partsSupplyId')
      .map((supplyId) => ({ supplyId, quantity: Number(f.get(`partsQuantity-${supplyId}`)) }));
    delete body.checklistText;
    delete body.partsText;
    const response = await window.apiRequest(
      `/api/printpilot/countermeasures/${id}`,
      json('PATCH', body),
    );
    if (!response.ok) return window.formError(await response.json());
    window.closeModal();
    window.navigate('printpilot-countermeasures');
  };
  window.ppSetCountermeasure = async (id, status) => {
    const response = await window.apiRequest(
      `/api/printpilot/countermeasures/${id}`,
      json('PATCH', { status }),
    );
    if (!response.ok) {
      window.formError(await response.json());
      return;
    }
    window.navigate('printpilot-countermeasures');
  };
  window.ppCountermeasureEmail = async (id) => {
    const c = (await ppApi('/api/printpilot/countermeasures')).find((x) => x.id === id);
    if (!c) return;
    window.ppCurrentEmail = {
      subject: `Informe de contramedida ${c.id} · ${c.asset_name}`,
      body: `Activo: ${c.asset_name}\nHallazgo: ${c.issue}\nCausa raíz: ${c.root_cause || '—'}\nAcción: ${c.action_taken || '—'}\nCambios electrónicos: ${c.electronic_changes || '—'}\nEstado: ${c.status}\nTécnico: ${c.technician_name || '—'}\nCosto: ${money(c.total_cost)}\nNotas: ${c.notes || '—'}`,
    };
    window.openModal(
      `<h2>Enviar informe por Gmail</h2><p class="muted">Se abrirá un borrador de Gmail con el informe preparado.</p><form class="form" data-pp-submit="email-countermeasure"><label class="wide">Correo destinatario<input type="email" name="recipient" required></label><div class="modal-actions wide"><button type="button" class="btn secondary" onclick="closeModal()">Cancelar</button><button class="btn">Abrir borrador de Gmail</button></div></form>`,
    );
  };
  window.ppOpenGmail = (event) => {
    event.preventDefault();
    const to = new FormData(event.target).get('recipient'),
      m = window.ppCurrentEmail;
    window.open(
      `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(to)}&su=${encodeURIComponent(m.subject)}&body=${encodeURIComponent(m.body)}`,
      '_blank',
      'noopener',
    );
    window.closeModal();
  };
})();
