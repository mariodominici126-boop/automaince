(() => {
  const { h, money, ppApi, json, empty, badge } = window.printpilotHelpers;
  window.printpilotPages['printpilot-countermeasures'] = async () => {
    const rows = await ppApi('/api/printpilot/countermeasures');
    return `<div class="pp-heading"><div><span class="pp-eyebrow">MANTENIMIENTO CORRECTIVO · REPARACIONES</span><h2>Contramedidas</h2><p>Documenta fallas, causa raíz, cambios electrónicos, repuestos y evidencia de cierre.</p></div><button class="btn" onclick="ppCountermeasureForm()">+ Nueva contramedida</button></div><div class="grid pp-kpis"><div class="card"><span class="label">Pendientes</span><b>${rows.filter((x) => ['PENDIENTE', 'PROGRAMADA'].includes(x.status)).length}</b></div><div class="card"><span class="label">En proceso</span><b>${rows.filter((x) => x.status === 'EN PROCESO').length}</b></div><div class="card"><span class="label">Completadas</span><b>${rows.filter((x) => ['COMPLETADA', 'CERRADA'].includes(x.status)).length}</b></div></div><div class="card table-card pp-top-space"><h3 class="section-title">Casos correctivos</h3>${rows.length ? `<table><thead><tr><th>ID / FECHA</th><th>ACTIVO</th><th>HALLAZGO</th><th>ESTADO</th><th>TÉCNICO</th><th>COSTO</th><th>INFORME</th></tr></thead><tbody>${rows.map((c) => `<tr><td><b>${h(c.id)}</b><small>${h(String(c.created_at).slice(0, 10))}</small><button class="table-action" data-pp-action="countermeasure" data-id="${h(c.id)}">Editar detalles</button></td><td>${h(c.asset_name)}</td><td><b>${h(c.title)}</b><small>${h(c.issue)}</small></td><td><select aria-label="Estado de ${h(c.id)}" data-pp-action="countermeasure-status" data-id="${h(c.id)}">${['PENDIENTE', 'PROGRAMADA', 'EN PROCESO', 'COMPLETADA', 'CERRADA'].map((x) => `<option ${c.status === x ? 'selected' : ''}>${x}</option>`).join('')}</select></td><td>${h(c.technician_name || '—')}</td><td>${money(c.total_cost)}</td><td><button class="table-action" data-pp-action="email" data-id="${h(c.id)}">Enviar por Gmail</button></td></tr>`).join('')}</tbody></table>` : empty('Aún no hay contramedidas. Las reparaciones se registran aquí.')}</div>`;
  };
  window.ppCountermeasureForm = async () => {
    const [assets, technicians] = await Promise.all([
      ppApi('/api/printpilot/assets'),
      ppApi('/api/printpilot/technicians'),
    ]);
    window.openModal(
      `<h2>Registrar contramedida / reparación</h2><form class="form pp-form" onsubmit="ppSaveCountermeasure(event)"><label>Activo<select name="assetId" required>${assets.map((a) => `<option value="${h(a.id)}">${h(a.code)} · ${h(a.name)}</option>`).join('')}</select></label><label>Estado<select name="status"><option>PENDIENTE</option><option>PROGRAMADA</option><option>EN PROCESO</option></select></label><label>Título<input name="title" required></label><label>Prioridad<select name="priority"><option>MEDIA</option><option>ALTA</option><option>CRITICA</option></select></label><label class="wide">Hallazgo / falla<textarea name="issue" required></textarea></label><label class="wide">Causa raíz<textarea name="rootCause"></textarea></label><label class="wide">Acción correctiva realizada<textarea name="actionTaken"></textarea></label><label class="wide">Cambios electrónicos / pared electrónica<textarea name="electronicChanges" placeholder="Intercambio de electrónicos, pared electrónica Kornit, componente sustituido, etc."></textarea></label><label>Técnico<select name="technicianId">${technicians.map((t) => `<option value="${h(t.id)}">${h(t.name)} · ${h(t.company_name)}</option>`).join('')}</select></label><label>Proveedor<input name="provider"></label><label>Fecha planificada<input type="date" name="plannedAt"></label><label>Horas de mano de obra<input type="number" min="0" step="0.25" name="laborHours" value="0"></label><label>Costo de mano de obra<input type="number" min="0" step="0.01" name="laborCost" value="0"></label><label>Costo de piezas<input type="number" min="0" step="0.01" name="partsCost" value="0"></label><label>Costo total<input type="number" min="0" step="0.01" name="totalCost" value="0"></label><label class="wide">Piezas / repuestos<input name="parts" placeholder="Separados por coma"></label><label class="wide">Notas y recomendaciones<textarea name="notes"></textarea></label><div class="modal-actions wide"><button type="button" class="btn secondary" onclick="closeModal()">Cancelar</button><button class="btn">Guardar contramedida</button></div></form>`,
    );
  };
  window.ppSaveCountermeasure = async (event) => {
    event.preventDefault();
    const x = Object.fromEntries(new FormData(event.target));
    ['laborHours', 'laborCost', 'partsCost', 'totalCost'].forEach(
      (k) => (x[k] = Number(x[k] || 0)),
    );
    x.parts = x.parts
      .split(',')
      .map((name) => name.trim())
      .filter(Boolean)
      .map((name) => ({ name, quantity: 1 }));
    const response = await window.apiRequest('/api/printpilot/countermeasures', json('POST', x));
    if (!response.ok) return window.formError(await response.json());
    window.closeModal();
    window.navigate('printpilot-countermeasures');
  };
  window.ppEditCountermeasure = async (id) => {
    const [rows, technicians] = await Promise.all([
      ppApi('/api/printpilot/countermeasures'),
      ppApi('/api/printpilot/technicians'),
    ]);
    const c = rows.find((x) => x.id === id);
    if (!c) return;
    window.openModal(
      `<h2>Editar ${h(c.id)}</h2><form class="form pp-form" data-pp-submit="save-countermeasure" data-id="${h(c.id)}"><label>Estado<select name="status">${['PENDIENTE', 'PROGRAMADA', 'EN PROCESO', 'COMPLETADA', 'CERRADA'].map((x) => `<option ${c.status === x ? 'selected' : ''}>${x}</option>`).join('')}</select></label><label>Prioridad<select name="priority">${['BAJA', 'MEDIA', 'ALTA', 'CRITICA'].map((x) => `<option ${c.priority === x ? 'selected' : ''}>${x}</option>`).join('')}</select></label><label class="wide">Causa raíz<textarea name="rootCause">${h(c.root_cause)}</textarea></label><label class="wide">Acción correctiva<textarea name="actionTaken">${h(c.action_taken)}</textarea></label><label class="wide">Cambios electrónicos<textarea name="electronicChanges">${h(c.electronic_changes)}</textarea></label><label>Técnico<select name="technicianId">${technicians.map((t) => `<option value="${h(t.id)}" ${c.technician_id === t.id ? 'selected' : ''}>${h(t.name)}</option>`).join('')}</select></label><label>Proveedor<input name="provider" value="${h(c.provider)}"></label><label>Fecha planificada<input type="date" name="plannedAt" value="${h(c.planned_at || '')}"></label><label>Inicio real<input type="datetime-local" name="startedAt" value="${h(c.started_at ? String(c.started_at).slice(0, 16) : '')}"></label><label>Terminación<input type="datetime-local" name="completedAt" value="${h(c.completed_at ? String(c.completed_at).slice(0, 16) : '')}"></label><label>Horas de trabajo<input type="number" min="0" step="0.25" name="laborHours" value="${h(c.labor_hours)}"></label><label>Costo mano de obra<input type="number" min="0" step="0.01" name="laborCost" value="${h(c.labor_cost)}"></label><label>Costo piezas<input type="number" min="0" step="0.01" name="partsCost" value="${h(c.parts_cost)}"></label><label>Costo total<input type="number" min="0" step="0.01" name="totalCost" value="${h(c.total_cost)}"></label><label class="wide">Checklist (separa tareas por línea; escribe [x] al completar)<textarea name="checklistText">${h((c.checklist || []).map((x) => `${x.done ? '[x] ' : '[ ] '}${x.label}`).join('\n'))}</textarea></label><label class="wide">Piezas/repuestos (una línea por pieza)<textarea name="partsText">${h((c.parts || []).map((x) => `${x.name} x${x.quantity}`).join('\n'))}</textarea></label><label class="wide">Notas<textarea name="notes">${h(c.notes)}</textarea></label><div class="modal-actions wide"><button class="btn secondary" type="button" onclick="closeModal()">Cancelar</button><button class="btn">Guardar cambios</button></div></form>`,
    );
  };
  window.ppSaveCountermeasureEdit = async (event, id) => {
    event.preventDefault();
    const f = new FormData(event.target),
      body = Object.fromEntries(f);
    for (const key of ['laborHours', 'laborCost', 'partsCost', 'totalCost'])
      body[key] = Number(body[key] || 0);
    body.checklist = String(f.get('checklistText'))
      .split('\n')
      .filter(Boolean)
      .map((line) => ({
        label: line.replace(/^\[x\]\s*|^\[\s\]\s*/i, ''),
        done: /^\[x\]/i.test(line),
      }));
    body.parts = String(f.get('partsText'))
      .split('\n')
      .filter(Boolean)
      .map((line) => {
        const match = line.match(/^(.*?)\s+x([\d.]+)$/i);
        return { name: (match?.[1] || line).trim(), quantity: Number(match?.[2] || 1) };
      });
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
      `<h2>Enviar informe por Gmail</h2><p class="muted">Se abrirá un borrador de Gmail con el informe preparado.</p><form class="form" onsubmit="ppOpenGmail(event)"><label class="wide">Correo destinatario<input type="email" name="recipient" required></label><div class="modal-actions wide"><button type="button" class="btn secondary" onclick="closeModal()">Cancelar</button><button class="btn">Abrir borrador de Gmail</button></div></form>`,
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
