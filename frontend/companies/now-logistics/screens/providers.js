(() => {
  const { h, api, json, empty, statusBadge } = window.nowHelpers;
  window.nowPages['now-providers'] = async () => {
    const rows = await api('/api/now/providers');
    return `<div class="now-heading"><div><span class="now-eyebrow">RED DE PROVEEDORES</span><h2>Proveedores certificados</h2><p>Solo los proveedores certificados pueden asignarse a trabajos externos.</p></div><button class="btn" data-now-action="provider">+ Agregar proveedor</button></div>
      <div class="card table-card"><table><thead><tr><th>PROVEEDOR</th><th>RNC</th><th>SERVICIOS</th><th>CERTIFICACIÓN</th><th>ESTADO</th></tr></thead><tbody>${rows.map((p) => `<tr><td>${h(p.name)}</td><td>${h(p.tax_id)}</td><td>${h(p.services.join(' · '))}</td><td>${statusBadge(p.certified ? 'CERTIFICADO' : 'NO CERTIFICADO')}</td><td>${h(p.active ? 'Activo' : 'Inactivo')}</td></tr>`).join('')}</tbody></table>${rows.length ? '' : empty('No hay proveedores registrados.')}</div>`;
  };
  window.nowProviderForm = () =>
    window.nowOpenModal(`<h2>Agregar proveedor</h2><form class="form" data-now-submit="provider">
    <label class="wide">Nombre legal<input name="name" required></label><label>RNC<input name="taxId" placeholder="1-30-57318-2" required></label>
    <label>Certificación<select name="certified"><option value="true">Certificado</option><option value="false">Pendiente de certificación</option></select></label>
    <label class="wide">Servicios autorizados<select name="services" multiple size="2" required><option value="MANTENIMIENTO">Mantenimiento</option><option value="TRANSPORTE">Transporte</option></select><small>Mantén Ctrl para seleccionar ambos.</small></label>
    <div class="modal-actions wide"><button type="button" class="btn secondary" onclick="closeModal()">Cancelar</button><button class="btn">Guardar proveedor</button></div></form>`);
  window.nowSaveProvider = async (event) => {
    const f = new FormData(event.target),
      services = [...event.target.elements.services.selectedOptions].map((option) => option.value);
    const payload = {
      name: f.get('name'),
      taxId: f.get('taxId'),
      certified: f.get('certified') === 'true',
      services,
    };
    try {
      await api('/api/now/providers', json('POST', payload));
      window.closeModal();
      window.navigate('now-providers');
    } catch (error) {
      window.nowFormError(error);
    }
  };
})();
