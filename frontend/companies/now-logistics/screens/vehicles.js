(() => {
  const { h, api, json, empty, statusBadge } = window.nowHelpers;
  window.nowPages['now-vehicles'] = async () => {
    const items = await api('/api/now/vehicles');
    return `<div class="now-heading"><div><span class="now-eyebrow">INVENTARIO DE FLOTA</span><h2>Vehículos</h2><p>Las ocho unidades de NOW Logistics en una sola página. Los datos faltantes quedan pendientes de completar.</p></div><button class="btn" onclick="navigate('now-maintenance')">Registrar mantenimiento</button></div>
    <div class="card table-card"><table><thead><tr><th>ID</th><th>UNIDAD</th><th>TIPO</th><th>MARCA / MODELO</th><th>ÚLTIMO MANTENIMIENTO</th><th>PRÓXIMO MANTENIMIENTO</th><th>ESTADO</th><th></th></tr></thead><tbody>${items.map((v) => `<tr><td><b>${h(v.id)}</b></td><td>${h(v.name)}</td><td>${h(v.vehicle_type)}</td><td>${h(v.brand || 'Pendiente')} / ${h(v.model || 'Pendiente')}</td><td>${h(v.last_maintenance || 'Pendiente')}</td><td>${h(v.next_maintenance || 'Pendiente')}</td><td>${statusBadge(v.status)}</td><td><button class="table-action" data-now-action="vehicleEdit" data-id="${h(v.id)}">Completar ficha</button> <button class="table-action" data-now-action="maintenance" data-id="${h(v.id)}">Mantenimiento</button></td></tr>`).join('')}</tbody></table>${items.length ? '' : empty('No hay unidades registradas.')}</div>`;
  };

  window.nowVehicleForm = async (vehicleId) => {
    const vehicle = (await api('/api/now/vehicles')).find((item) => item.id === vehicleId);
    if (!vehicle) return;
    window.nowOpenModal(`<h2>Completar datos de ${h(vehicle.id)}</h2><p class="muted">${h(vehicle.name)} · Añade marca y modelo cuando estén disponibles.</p><form class="form" data-now-submit="vehicle" data-id="${h(vehicle.id)}">
      <label>Tipo de unidad<input value="${h(vehicle.vehicle_type)}" disabled></label>
      <label>Estado<select name="status"><option value="ACTIVO" ${vehicle.status === 'ACTIVO' ? 'selected' : ''}>Activo</option><option value="MANTENIMIENTO" ${vehicle.status === 'MANTENIMIENTO' ? 'selected' : ''}>En mantenimiento</option><option value="FUERA DE SERVICIO" ${vehicle.status === 'FUERA DE SERVICIO' ? 'selected' : ''}>Fuera de servicio</option></select></label>
      <label>Marca<input name="brand" value="${h(vehicle.brand || '')}"></label><label>Modelo<input name="model" value="${h(vehicle.model || '')}"></label>
      <div class="modal-actions wide"><button type="button" class="btn secondary" onclick="closeModal()">Cancelar</button><button class="btn">Guardar ficha</button></div></form>`);
  };
  window.nowSaveVehicle = async (event) => {
    const payload = Object.fromEntries(new FormData(event.target));
    try {
      await api(
        `/api/now/vehicles/${encodeURIComponent(event.target.dataset.id)}`,
        json('PATCH', payload),
      );
      window.closeModal();
      window.navigate('now-vehicles');
    } catch (error) {
      window.nowFormError(error);
    }
  };
})();
