(() => {
  const { h, api, json, empty, today, statusBadge } = window.nowHelpers;
  window.nowPages['now-assignments'] = async () => {
    const rows = await api('/api/now/assignments');
    return `<div class="now-heading"><div><span class="now-eyebrow">ASIGNACIÓN DE UNIDADES Y TRANSPORTE</span><h2>Asignaciones</h2><p>Controla el conductor, destino y proveedor certificado si el servicio se subcontrata.</p></div><button class="btn" data-now-action="assignment">+ Nueva asignación</button></div>
      <div class="card table-card"><table><thead><tr><th>FECHA</th><th>UNIDAD</th><th>ASIGNADO A</th><th>ORIGEN</th><th>DESTINO</th><th>DETALLE</th><th>PROVEEDOR</th><th>ESTADO</th></tr></thead><tbody>${rows.map((a) => `<tr><td>${h(a.assignment_date)}</td><td>${h(a.vehicle_id)} · ${h(a.vehicle_name)}</td><td>${h(a.assigned_to)}</td><td>${h(a.origin || '—')}</td><td>${h(a.destination)}</td><td>${h(a.details || '—')}</td><td>${h(a.provider_name || 'Interno')}${a.subcontracted ? `<small>Subcontrato · ${h(a.subcontract_reason)}</small>` : ''}</td><td>${statusBadge(a.status)}</td></tr>`).join('')}</tbody></table>${rows.length ? '' : empty('Aún no hay asignaciones registradas.')}</div>`;
  };
  window.nowAssignmentForm = async (vehicleId = '') => {
    const [vehicles, providers] = await Promise.all([
      api('/api/now/vehicles'),
      api('/api/now/providers'),
    ]);
    window.nowOpenModal(`<h2>Asignar unidad / transporte</h2><form class="form" data-now-submit="assignment">
      <label>Unidad<select name="vehicleId" required>${vehicles.map((v) => `<option value="${h(v.id)}" ${vehicleId === v.id ? 'selected' : ''}>${h(v.id)} · ${h(v.name)}</option>`).join('')}</select></label>
      <label>Fecha de asignación<input name="assignmentDate" type="date" value="${today()}" required></label>
      <label>Asignado a<input name="assignedTo" required></label>
      <label>Origen<input name="origin"></label>
      <label>Destino<input name="destination" required></label>
      <label class="wide">Detalle<textarea name="details"></textarea></label>
      <label>Proveedor certificado<select name="providerId"><option value="">Transporte interno</option>${providers
        .filter((p) => p.certified && p.services.includes('TRANSPORTE'))
        .map((p) => `<option value="${h(p.id)}">${h(p.name)} · RNC ${h(p.tax_id)}</option>`)
        .join('')}</select></label>
      <label class="now-check"><input name="subcontracted" type="checkbox"> Servicio subcontratado</label>
      <label>Motivo<select name="subcontractReason"><option value="">No aplica</option><option value="COSTO">Costo</option><option value="SIN_UNIDADES_DISPONIBLES">No hay unidades disponibles</option></select></label>
      <div class="modal-actions wide"><button type="button" class="btn secondary" onclick="closeModal()">Cancelar</button><button class="btn">Guardar asignación</button></div></form>`);
  };
  window.nowSaveAssignment = async (event) => {
    const f = new FormData(event.target),
      payload = Object.fromEntries(f);
    payload.subcontracted = f.has('subcontracted');
    try {
      await api('/api/now/assignments', json('POST', payload));
      window.closeModal();
      window.navigate('now-assignments');
    } catch (error) {
      window.nowFormError(error);
    }
  };
})();
