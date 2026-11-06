(() => {
  const { h, money, ppApi, json, empty, badge } = window.printpilotHelpers;
  const categoryTitles = {
    AIRES: 'Aires y compresores',
    IMPRESORAS: 'Impresoras',
    HORNO_SECADO: 'Hornos y secadoras',
    INFRAESTRUCTURA: 'Infraestructura',
    CORTADORAS: 'Cortadoras',
  };
  window.ppRenderAssetScreen = async (category) => {
    const items = await ppApi(`/api/printpilot/assets?category=${encodeURIComponent(category)}`);
    return `<div class="pp-heading"><div><span class="pp-eyebrow">EQUIPOS PRINTPILOT</span><h2>${categoryTitles[category]}</h2><p>${items.length} activos de esta categoría.</p></div><button class="btn" onclick="ppAddAsset('${category}')">+ Agregar activo</button></div>${items.length ? `<div class="card table-card"><table><thead><tr><th>CÓDIGO</th><th>ACTIVO</th><th>MARCA / MODELO</th><th>UBICACIÓN</th><th>LECTURA</th><th>RESPONSABLE</th><th>ESTADO</th><th></th></tr></thead><tbody>${items.map((a) => `<tr><td><b>${h(a.code)}</b></td><td>${h(a.name)}<small>${h(a.description)}</small></td><td>${h([a.manufacturer, a.model].filter(Boolean).join(' / ') || 'Pendiente de completar')}</td><td>${h(a.location || 'Pendiente')}</td><td>${h(a.meterValue)} ${h(a.meterUnit || '')}<button class="table-action" data-pp-action="reading" data-id="${h(a.id)}">Anotar</button></td><td>${h(a.responsible || 'Sin asignar')}</td><td>${badge(a.operational_status)}</td><td><button class="table-action" data-pp-action="asset" data-id="${h(a.id)}">Ficha</button></td></tr>`).join('')}</tbody></table></div>` : empty('No hay activos en esta sección.')}`;
  };
  window.ppAddAsset = (category) =>
    window.openModal(
      `<h2>Agregar activo</h2><form class="form pp-form" onsubmit="ppSaveNewAsset(event)"><input type="hidden" name="category" value="${h(category)}"><label>Código único<input name="code" required></label><label>Nombre<input name="name" required></label><label class="wide">Descripción<input name="description"></label><label>Marca / proveedor<input name="manufacturer"></label><label>Modelo<input name="model"></label><label>Número de serie<input name="serialNumber"></label><label>Fecha de adquisición<input name="acquiredOn" type="date"></label><label>Ubicación<input name="location"></label><label>Departamento<input name="department"></label><label>Responsable<input name="responsible"></label><label>Criticidad<select name="criticality"><option>MEDIA</option><option>BAJA</option><option>ALTA</option><option>CRITICA</option></select></label><label>Estado<select name="operationalStatus"><option>OPERATIVO</option><option>MANTENIMIENTO</option><option>FUERA DE SERVICIO</option></select></label><div class="modal-actions wide"><button class="btn secondary" type="button" onclick="closeModal()">Cancelar</button><button class="btn">Guardar activo</button></div></form>`,
    );
  window.ppSaveNewAsset = async (event) => {
    event.preventDefault();
    const response = await window.apiRequest(
      '/api/printpilot/assets',
      json('POST', Object.fromEntries(new FormData(event.target))),
    );
    if (!response.ok) return window.formError(await response.json());
    window.closeModal();
    window.navigate(activePrintPilotPage());
  };
  window.ppEditAsset = async (id) => {
    const a = (await ppApi('/api/printpilot/assets')).find((x) => x.id === id);
    if (!a) return;
    window.openModal(
      `<h2>Ficha de ${h(a.name)}</h2><p class="muted">Código ${h(a.code)} · Datos técnicos tomados del inventario PDF cuando estaban disponibles.</p><form class="form pp-form" data-pp-submit="save-asset" data-id="${h(a.id)}"><label>Descripción<input name="description" value="${h(a.description)}"></label><label>Marca / proveedor<input name="manufacturer" value="${h(a.manufacturer)}"></label><label>Modelo<input name="model" value="${h(a.model)}"></label><label>Número de serie<input name="serialNumber" value="${h(a.serial_number)}"></label><label>Ubicación<input name="location" value="${h(a.location)}"></label><label>Departamento<input name="department" value="${h(a.department)}"></label><label>Responsable<input name="responsible" value="${h(a.responsible)}"></label><label>Criticidad<select name="criticality">${['BAJA', 'MEDIA', 'ALTA', 'CRITICA'].map((x) => `<option ${a.criticality === x ? 'selected' : ''}>${x}</option>`).join('')}</select></label><label>Estado operativo<select name="operationalStatus">${['OPERATIVO', 'MANTENIMIENTO', 'FUERA DE SERVICIO'].map((x) => `<option ${a.operational_status === x ? 'selected' : ''}>${x}</option>`).join('')}</select></label><label>Fecha de adquisición<input type="date" name="acquiredOn" value="${h(a.acquiredOn || '')}"></label><div class="modal-actions wide"><button type="button" class="btn secondary" onclick="closeModal()">Cancelar</button><button class="btn">Guardar ficha</button></div></form>`,
    );
  };
  window.ppSaveAsset = async (event, id) => {
    event.preventDefault();
    const body = Object.fromEntries(new FormData(event.target));
    const response = await window.apiRequest(`/api/printpilot/assets/${id}`, json('PATCH', body));
    if (!response.ok) return window.formError(await response.json());
    window.closeModal();
    window.navigate(activePrintPilotPage());
  };
  window.ppReadingForm = async (id) => {
    const asset = (await ppApi('/api/printpilot/assets')).find((x) => x.id === id);
    if (!asset) return;
    const history = await ppApi(`/api/printpilot/assets/${id}/readings`);
    window.openModal(
      `<h2>Lecturas de ${h(asset.name)}</h2><p class="muted">Último valor: ${h(asset.meterValue)} ${h(asset.meterUnit || '')}</p><form class="form" data-pp-submit="save-reading" data-id="${h(id)}"><label>Lectura<input type="number" name="reading" min="${h(asset.meterValue)}" step="0.01" required></label><label>Unidad<select name="unit"><option>HORAS</option><option>CICLOS</option><option>IMPRESIONES</option></select></label><label class="wide">Nota<input name="note"></label><div class="modal-actions wide"><button class="btn secondary" type="button" onclick="closeModal()">Cerrar</button><button class="btn">Guardar lectura</button></div></form><h3>Historial reciente</h3>${history.length ? `<table><thead><tr><th>FECHA</th><th>LECTURA</th><th>TÉCNICO</th><th>NOTA</th></tr></thead><tbody>${history.map((r) => `<tr><td>${h(String(r.recorded_at).replace('T', ' ').slice(0, 16))}</td><td>${h(r.reading)} ${h(r.unit)}</td><td>${h(r.technician_name || '—')}</td><td>${h(r.note)}</td></tr>`).join('')}</tbody></table>` : empty('No hay lecturas registradas.')}`,
    );
  };
  window.ppSaveReading = async (event, id) => {
    event.preventDefault();
    const body = Object.fromEntries(new FormData(event.target));
    body.reading = Number(body.reading);
    const response = await window.apiRequest(
      `/api/printpilot/assets/${id}/readings`,
      json('POST', body),
    );
    const result = await response.json();
    if (!response.ok) return window.formError(result);
    window.closeModal();
    window.navigate(activePrintPilotPage());
    if (result.scheduledOrders)
      alert(`La lectura generó ${result.scheduledOrders} orden(es) preventiva(s).`);
  };
  function activePrintPilotPage() {
    return document.querySelector('#nav button.active')?.dataset.page || 'printpilot-air';
  }
})();
