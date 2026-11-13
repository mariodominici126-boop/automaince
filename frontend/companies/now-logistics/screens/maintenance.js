(() => {
  const { h, api, json, empty, today, money, statusBadge } = window.nowHelpers;
  window.nowPages['now-maintenance'] = async () => {
    const [rows, vehicles] = await Promise.all([
      api('/api/now/maintenance'),
      api('/api/now/vehicles'),
    ]);
    return `<div class="now-heading"><div><span class="now-eyebrow">CICLO PREVENTIVO · CADA 3 MESES</span><h2>Mantenimientos</h2><p>Solicitud, ejecución, proveedor, costos y próxima fecha preventiva.</p></div><button class="btn" data-now-action="maintenance">+ Registrar mantenimiento</button></div>
    <div class="card table-card"><table><thead><tr><th>SOLICITUD</th><th>EJECUCIÓN / PLAN</th><th>UNIDAD</th><th>TIPO</th><th>DETALLE</th><th>PROVEEDOR / LUGAR</th><th>PRÓXIMO</th><th>COSTO</th><th>ESTADO</th></tr></thead><tbody>${rows.map((m) => `<tr><td>${h(m.request_date || 'Sin dato')}</td><td>${h(m.execution_date || m.planned_date || 'Pendiente')}</td><td><b>${h(m.vehicle_id)}</b><small>${h(m.vehicle_name)}</small></td><td>${h(m.maintenance_type)}</td><td>${h(m.details)}</td><td>${h(m.provider_name || 'Pendiente')}<small>${h(m.execution_location || '')}</small>${m.subcontracted ? `<small>Subcontrato · ${h(m.subcontract_reason)}</small>` : ''}</td><td>${h(m.next_maintenance || 'Pendiente')}</td><td>${money(m.cost)}</td><td>${statusBadge(m.status)}</td></tr>`).join('')}</tbody></table>${rows.length ? '' : empty('Aún no hay mantenimientos. Registra las fechas conocidas y completa los demás datos poco a poco.')}</div>
    <div class="card now-top-space"><b>Flota:</b> ${h(vehicles.length)} unidades · Para el intervalo trimestral, una fecha de ejecución calcula el próximo mantenimiento a 3 meses si no especificas otra.</div>`;
  };

  window.nowMaintenanceForm = async (vehicleId = '') => {
    const [vehicles, providers] = await Promise.all([
      api('/api/now/vehicles'),
      api('/api/now/providers'),
    ]);
    window.nowOpenModal(`<h2>Registrar mantenimiento</h2><p class="muted">Guarda la solicitud ahora o registra una ejecución ya realizada.</p><form class="form" data-now-submit="maintenance">
      <label>Unidad<select name="vehicleId" required>${vehicles.map((v) => `<option value="${h(v.id)}" ${vehicleId === v.id ? 'selected' : ''}>${h(v.id)} · ${h(v.name)}</option>`).join('')}</select></label>
      <label>Tipo de mantenimiento<input name="maintenanceType" required placeholder="Preventivo, correctivo…"></label>
      <label>Fecha de solicitud<input name="requestDate" type="date" value="${today()}" required></label>
      <label>Fecha programada (si aplica)<input name="plannedDate" type="date"></label>
      <label>Fecha de ejecución<input name="executionDate" type="date"></label>
      <label>Próximo mantenimiento<input name="nextMaintenance" type="date"><small>Si se deja vacío y hay ejecución, se calcula a 3 meses.</small></label>
      <label>Proveedor certificado<select name="providerId"><option value="">Sin proveedor seleccionado</option>${providers
        .filter((p) => p.certified && p.services.includes('MANTENIMIENTO'))
        .map((p) => `<option value="${h(p.id)}">${h(p.name)} · RNC ${h(p.tax_id)}</option>`)
        .join('')}</select></label>
      <label>Lugar de ejecución<input name="executionLocation" placeholder="Taller, base o ubicación"></label>
      <label>Costo pagado<input name="cost" type="number" min="0" step="0.01" value="0"></label>
      <label class="wide">Detalle del mantenimiento<textarea name="details" required></textarea></label>
      <label class="wide now-check"><input name="subcontracted" type="checkbox"> Trabajo subcontratado con proveedor certificado</label>
      <label>Motivo del subcontrato<select name="subcontractReason"><option value="">No aplica</option><option value="COSTO">Costo</option><option value="SIN_UNIDADES_DISPONIBLES">No hay unidades disponibles</option></select></label>
      <div class="modal-actions wide"><button type="button" class="btn secondary" onclick="closeModal()">Cancelar</button><button class="btn">Guardar</button></div></form>`);
  };

  window.nowSaveMaintenance = async (event) => {
    const f = new FormData(event.target);
    const payload = Object.fromEntries(f);
    payload.subcontracted = f.has('subcontracted');
    payload.cost = Number(payload.cost || 0);
    try {
      await api('/api/now/maintenance', json('POST', payload));
      window.closeModal();
      window.navigate('now-maintenance');
    } catch (error) {
      window.nowFormError(error);
    }
  };
})();
