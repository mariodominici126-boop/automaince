(() => {
  const { h, api, json, empty, today, statusBadge } = window.nowHelpers;
  window.nowPages['now-alerts'] = async () => {
    const alerts = await api('/api/now/alerts');
    return `<div class="now-heading"><div><span class="now-eyebrow">CONTROL DE VENCIMIENTOS</span><h2>Alertas</h2><p>Próximos mantenimientos, fechas vencidas y unidades sin fecha registrada.</p></div><button class="btn secondary" onclick="navigate('now-vehicles')">Ver flota</button></div>
      <div class="grid now-alert-grid">${alerts.map((a) => `<article class="card now-alert-card ${a.status === 'VENCIDO' ? 'overdue' : ''}"><div class="card-heading"><div><span class="badge ${h(a.level)}">${h(a.status)}</span><h3>${h(a.vehicleId)} · ${h(a.vehicleName)}</h3></div>${a.dueDate ? `<time>${h(a.dueDate)}</time>` : ''}</div><p>${h(a.message)}</p>${a.status === 'VENCIDO' ? `<button class="btn" data-now-action="reschedule" data-id="${h(a.vehicleId)}">Reprogramar mantenimiento</button>` : a.status === 'SIN_FECHA' ? `<button class="btn secondary" data-now-action="maintenance" data-id="${h(a.vehicleId)}">Registrar fecha</button>` : `<button class="btn secondary" data-now-action="maintenance" data-id="${h(a.vehicleId)}">Programar mantenimiento</button>`}</article>`).join('')}</div>${alerts.length ? '' : empty('No hay mantenimientos próximos en los siguientes 30 días.')}`;
  };
  window.nowRescheduleForm = async (vehicleId) => {
    const [vehicles, providers] = await Promise.all([
      api('/api/now/vehicles'),
      api('/api/now/providers'),
    ]);
    const vehicle = vehicles.find((item) => item.id === vehicleId);
    window.nowOpenModal(`<h2>Reprogramar mantenimiento vencido</h2><p class="muted">${h(vehicle?.name || vehicleId)} · La nueva fecha quedará en el historial y actualizará la alerta.</p><form class="form" data-now-submit="reschedule" data-id="${h(vehicleId)}">
      <label>Nueva fecha programada<input name="plannedDate" type="date" min="${today()}" required></label>
      <label>Proveedor certificado<select name="providerId"><option value="">Por confirmar</option>${providers
        .filter((p) => p.certified && p.services.includes('MANTENIMIENTO'))
        .map((p) => `<option value="${h(p.id)}">${h(p.name)} · RNC ${h(p.tax_id)}</option>`)
        .join('')}</select></label>
      <label class="wide">Lugar de ejecución<input name="executionLocation"></label>
      <div class="modal-actions wide"><button type="button" class="btn secondary" onclick="closeModal()">Cancelar</button><button class="btn">Guardar reprogramación</button></div></form>`);
  };
  window.nowSaveReschedule = async (event) => {
    const f = new FormData(event.target),
      payload = Object.fromEntries(f),
      vehicleId = event.target.dataset.id;
    try {
      await api(
        `/api/now/vehicles/${encodeURIComponent(vehicleId)}/reschedule`,
        json('POST', payload),
      );
      window.closeModal();
      window.navigate('now-alerts');
    } catch (error) {
      window.nowFormError(error);
    }
  };
})();
