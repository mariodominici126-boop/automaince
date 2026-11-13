(() => {
  const { h, api, json, empty, today, money } = window.nowHelpers;
  window.nowPages['now-repairs'] = async () => {
    const rows = await api('/api/now/repairs');
    return `<div class="now-heading"><div><span class="now-eyebrow">REPARACIONES Y GARANTÍAS</span><h2>Reparaciones</h2><p>Descripción, fecha, costo pagado, proveedor certificado y garantía.</p></div><button class="btn" data-now-action="repair">+ Registrar reparación</button></div>
      <div class="card table-card"><table><thead><tr><th>FECHA</th><th>UNIDAD</th><th>REPARACIÓN</th><th>DESCRIPCIÓN</th><th>PROVEEDOR</th><th>COSTO</th><th>GARANTÍA</th></tr></thead><tbody>${rows.map((r) => `<tr><td>${h(r.repair_date)}</td><td>${h(r.vehicle_id)} · ${h(r.vehicle_name)}</td><td>${h(r.title)}</td><td>${h(r.description)}</td><td>${h(r.provider_name || 'Interno')}${r.subcontracted ? `<small>Subcontrato · ${h(r.subcontract_reason)}</small>` : ''}</td><td>${money(r.cost)}</td><td>${h(r.warranty || 'No indicada')}</td></tr>`).join('')}</tbody></table>${rows.length ? '' : empty('Aún no hay reparaciones registradas.')}</div>`;
  };
  window.nowRepairForm = async (vehicleId = '') => {
    const [vehicles, providers] = await Promise.all([
      api('/api/now/vehicles'),
      api('/api/now/providers'),
    ]);
    window.nowOpenModal(`<h2>Registrar reparación</h2><form class="form" data-now-submit="repair">
      <label>Unidad<select name="vehicleId" required>${vehicles.map((v) => `<option value="${h(v.id)}" ${vehicleId === v.id ? 'selected' : ''}>${h(v.id)} · ${h(v.name)}</option>`).join('')}</select></label>
      <label>Fecha de reparación<input name="repairDate" type="date" value="${today()}" required></label>
      <label class="wide">Reparación<input name="title" required></label>
      <label class="wide">Descripción<textarea name="description" required></textarea></label>
      <label>Costo pagado<input name="cost" type="number" min="0" step="0.01" value="0" required></label>
      <label>Garantía<input name="warranty" placeholder="Ej.: 3 meses o 10,000 km"></label>
      <label>Proveedor certificado<select name="providerId"><option value="">Reparación interna</option>${providers
        .filter((p) => p.certified && p.services.includes('MANTENIMIENTO'))
        .map((p) => `<option value="${h(p.id)}">${h(p.name)} · RNC ${h(p.tax_id)}</option>`)
        .join('')}</select></label>
      <label class="now-check"><input name="subcontracted" type="checkbox"> Subcontratada</label>
      <label>Motivo<select name="subcontractReason"><option value="">No aplica</option><option value="COSTO">Costo</option><option value="SIN_UNIDADES_DISPONIBLES">No hay unidades disponibles</option></select></label>
      <div class="modal-actions wide"><button type="button" class="btn secondary" onclick="closeModal()">Cancelar</button><button class="btn">Guardar reparación</button></div></form>`);
  };
  window.nowSaveRepair = async (event) => {
    const f = new FormData(event.target),
      payload = Object.fromEntries(f);
    payload.cost = Number(payload.cost || 0);
    payload.subcontracted = f.has('subcontracted');
    try {
      await api('/api/now/repairs', json('POST', payload));
      window.closeModal();
      window.navigate('now-repairs');
    } catch (error) {
      window.nowFormError(error);
    }
  };
})();
