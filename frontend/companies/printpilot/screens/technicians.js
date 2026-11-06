(() => {
  const { h, money, ppApi, json, empty, badge } = window.printpilotHelpers;
  window.printpilotPages['printpilot-technicians'] = async () => {
    const rows = await ppApi('/api/printpilot/technicians');
    return `<div class="pp-heading"><div><span class="pp-eyebrow">PERSONAL AUTORIZADO</span><h2>Técnicos</h2><p>Registra nombre, cédula y empresa para asociar los trabajos.</p></div><button class="btn" onclick="ppTechnicianForm()">+ Registrar técnico</button></div><div class="card table-card">${rows.length ? `<table><thead><tr><th>NOMBRE</th><th>USUARIO</th><th>CÉDULA</th><th>EMPRESA</th><th>ROL</th><th></th></tr></thead><tbody>${rows.map((t) => `<tr><td>${h(t.name)}</td><td>${h(t.username)}</td><td>${h(t.national_id || 'Pendiente de completar')}</td><td>${h(t.company_name)}</td><td>${h(t.role)}</td><td>${t.active ? `<button class="table-action" data-pp-action="technician" data-id="${h(t.id)}">Editar</button>` : 'Inactivo'}</td></tr>`).join('')}</tbody></table>` : empty('No hay técnicos registrados.')}</div>`;
  };
  window.ppTechnicianForm = () =>
    window.openModal(
      `<h2>Registrar técnico</h2><form class="form" onsubmit="ppSaveTechnician(event)"><label>Nombre completo<input name="name" required></label><label>Cédula<input name="nationalId" required></label><label>Empresa<input name="companyName" value="PrintPilot" required></label><label>Usuario<input name="username" required></label><label class="wide">Contraseña temporal<input name="temporaryPassword" type="password" minlength="8" required><small>El técnico podrá iniciar sesión con este usuario y contraseña.</small></label><div class="modal-actions wide"><button type="button" class="btn secondary" onclick="closeModal()">Cancelar</button><button class="btn">Guardar técnico</button></div></form>`,
    );
  window.ppSaveTechnician = async (event) => {
    event.preventDefault();
    const response = await window.apiRequest(
      '/api/printpilot/technicians',
      json('POST', Object.fromEntries(new FormData(event.target))),
    );
    if (!response.ok) return window.formError(await response.json());
    window.closeModal();
    window.navigate('printpilot-technicians');
  };
  window.ppEditTechnician = async (id) => {
    const t = (await ppApi('/api/printpilot/technicians')).find((x) => x.id === id);
    if (!t) return;
    window.openModal(
      `<h2>Completar datos del técnico</h2><form class="form" data-pp-submit="update-technician" data-id="${h(id)}"><label>Nombre completo<input name="name" value="${h(t.name)}" required></label><label>Cédula<input name="nationalId" value="${h(t.national_id || '')}" required></label><label class="wide">Empresa<input name="companyName" value="${h(t.company_name)}" required></label><div class="modal-actions wide"><button type="button" class="btn secondary" onclick="closeModal()">Cancelar</button><button class="btn">Guardar datos</button></div></form>`,
    );
  };
  window.ppUpdateTechnician = async (event, id) => {
    event.preventDefault();
    const response = await window.apiRequest(
      `/api/printpilot/technicians/${id}`,
      json('PATCH', Object.fromEntries(new FormData(event.target))),
    );
    if (!response.ok) return window.formError(await response.json());
    window.closeModal();
    window.navigate('printpilot-technicians');
  };
})();
