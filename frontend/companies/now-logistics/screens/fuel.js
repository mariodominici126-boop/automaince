(() => {
  const { h, api, json, empty, today, money } = window.nowHelpers;
  window.nowPages['now-fuel'] = async () => {
    const rows = await api('/api/now/fuel');
    return `<div class="now-heading"><div><span class="now-eyebrow">DISPENSADO DE COMBUSTIBLE</span><h2>Combustible</h2><p>Registra cada despacho por unidad, fecha, cantidad y costo.</p></div><button class="btn" data-now-action="fuel">+ Registrar combustible</button></div>
      <div class="card table-card"><table><thead><tr><th>FECHA</th><th>UNIDAD</th><th>LITROS</th><th>COSTO</th><th>KILOMETRAJE</th><th>DESPACHADO POR</th><th>NOTAS</th></tr></thead><tbody>${rows.map((f) => `<tr><td>${h(f.record_date)}</td><td>${h(f.vehicle_id)} · ${h(f.vehicle_name)}</td><td>${h(f.liters)} L</td><td>${money(f.cost)}</td><td>${h(f.mileage ?? '—')}</td><td>${h(f.dispenser || '—')}</td><td>${h(f.notes || '—')}</td></tr>`).join('')}</tbody></table>${rows.length ? '' : empty('Aún no hay despachos registrados.')}</div>`;
  };
  window.nowFuelForm = async (vehicleId = '') => {
    const vehicles = await api('/api/now/vehicles');
    window.nowOpenModal(`<h2>Registrar despacho de combustible</h2><form class="form" data-now-submit="fuel">
      <label>Unidad<select name="vehicleId" required>${vehicles.map((v) => `<option value="${h(v.id)}" ${vehicleId === v.id ? 'selected' : ''}>${h(v.id)} · ${h(v.name)}</option>`).join('')}</select></label>
      <label>Fecha<input name="recordDate" type="date" value="${today()}" required></label>
      <label>Litros<input name="liters" type="number" min="0.01" step="0.01" required></label>
      <label>Costo<input name="cost" type="number" min="0" step="0.01" value="0"></label>
      <label>Kilometraje (opcional)<input name="mileage" type="number" min="0" step="1"></label>
      <label>Responsable del despacho<input name="dispenser"></label>
      <label class="wide">Notas<input name="notes"></label>
      <div class="modal-actions wide"><button type="button" class="btn secondary" onclick="closeModal()">Cancelar</button><button class="btn">Guardar despacho</button></div></form>`);
  };
  window.nowSaveFuel = async (event) => {
    const payload = Object.fromEntries(new FormData(event.target));
    payload.liters = Number(payload.liters);
    payload.cost = Number(payload.cost || 0);
    try {
      await api('/api/now/fuel', json('POST', payload));
      window.closeModal();
      window.navigate('now-fuel');
    } catch (error) {
      window.nowFormError(error);
    }
  };
})();
