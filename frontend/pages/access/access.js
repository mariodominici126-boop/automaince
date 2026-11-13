const accessCompanies = window.AutoMainceCompanies;

function accessLogo(company, className = '') {
  return `<span class="access-logo ${className}"><img src="${company.logo}" alt="Logo ${company.name}"></span>`;
}

window.showAccessPanel = function () {
  document.getElementById('workspace').classList.add('hidden');
  const root = document.getElementById('accessPortal');
  root.innerHTML = `<main class="access-page">
    <div class="access-topbar"><a class="access-brand" href="#" aria-label="AutoMaince inicio"><span>◈</span> Auto<span>Maince</span></a><span class="access-status">PANEL DE ACCESO</span></div>
    <section class="access-hero">
      <div class="access-copy"><span class="access-kicker"><b></b> MANTENIMIENTO</span>
        <h1>Mantenimiento de flota</h1>
        <p>Selecciona una empresa para continuar.</p>
      </div>
      <div class="banner-notions">${accessLogo(accessCompanies.notions, 'banner-notions-logo')}</div>
    </section>
    <section class="company-section"><div class="company-heading"><h2 class="company-title">EMPRESAS:</h2><span class="company-count">04</span></div>
      <div class="company-grid">${Object.entries(accessCompanies).map(([id, company], index) => `<button class="company-card company-${company.theme}" data-open-company="${id}" style="--card-order:${index}" aria-label="Entrar a ${company.name}">
        <span class="company-card-top"><span class="company-index">0${index + 1}</span><span class="company-arrow">↗</span></span>
        ${accessLogo({ ...company, logo: company.cardLogo || company.logo }, 'company-logo-image')}
        <span class="company-card-footer"><span><b>${company.name}</b><small>Acceso al portal</small></span><span class="card-continue">Ingresar <i>→</i></span></span>
      </button>`).join('')}</div>
    </section>
    <footer class="access-footer"><span>AutoMaince <i>·</i> Mantenimiento</span><span>NOTIONS GROUP</span></footer>
  </main>`;
  root.classList.remove('hidden');
  root.querySelectorAll('[data-open-company]').forEach(button => button.addEventListener('click', () => window.showCompanyLogin(button.dataset.openCompany)));
};

window.showCompanyLogin = function (companyId) {
  const company = accessCompanies[companyId];
  if (!company) return window.showAccessPanel();
  const root = document.getElementById('accessPortal');
  root.innerHTML = `<main class="company-login login-${company.theme}">
    <div class="login-brand-panel"><button class="login-back" data-back-to-companies>← <span>Volver a empresas</span></button>
      <div class="login-brand-content">${accessLogo({ ...company, logo: company.cardLogo || company.logo }, 'login-logo-image')}<span class="login-label">PORTAL DE MANTENIMIENTO</span><h1>${company.name}</h1><p>${company.description}</p></div>
      <span class="login-panel-foot">AUTOMAINCE <i>·</i> GESTIÓN DE FLOTAS</span>
    </div>
    <section class="login-form-panel"><div class="login-form-wrap"><span class="access-kicker">ACCESO SEGURO</span><h2>${company.welcome}</h2><p class="login-subtitle">Ingresa con las credenciales asignadas a tu equipo.</p>
      <form class="company-login-form" data-company-login="${companyId}">
        <label>Usuario o correo<input name="username" autocomplete="username" placeholder="nombre@empresa.com" required></label>
        <label>Contraseña<span class="password-wrap"><input name="password" type="password" autocomplete="current-password" placeholder="Escribe tu contraseña" required><span aria-hidden="true">◉</span></span></label>
        <button class="login-submit" type="submit">Iniciar sesión <span>→</span></button>
        <p class="login-feedback" role="status" aria-live="polite"></p>
      </form>
      <p class="login-auth-note">${companyId === 'gtg' ? 'Acceso provisional GTG habilitado para revisión del sistema.' : companyId === 'printpilot' ? 'Cuenta provisional de PrintPilot habilitada para iniciar.' : `La autenticación de ${company.shortName} aún requiere conectar su servicio empresarial.`}</p>
    </div></section>
  </main>`;
  root.querySelector('[data-back-to-companies]').addEventListener('click', window.showAccessPanel);
  root.querySelector('[data-company-login]').addEventListener('submit', async event => {
    event.preventDefault();
    const feedback = root.querySelector('.login-feedback');
    const submit = event.currentTarget.querySelector('.login-submit');
    submit.disabled = true;
    submit.querySelector('span').textContent = '…';
    feedback.textContent = '';
    try {
      const form = new FormData(event.currentTarget);
      const response = await fetch(`/api/auth/${companyId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: form.get('username'), password: form.get('password') }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'No se pudo iniciar sesión.');
      sessionStorage.setItem('automaince.token', result.token);
      sessionStorage.setItem('automaince.user', JSON.stringify(result.user));
      window.enterMaintenanceWorkspace(result.user);
    } catch (error) {
      feedback.textContent = error.message || 'No fue posible conectar con el servidor.';
      submit.disabled = false;
      submit.querySelector('span').textContent = '→';
    }
  });
};

window.enterMaintenanceWorkspace = function (user) {
  document.getElementById('accessPortal').innerHTML = '';
  document.getElementById('accessPortal').classList.add('hidden');
  const workspace = document.getElementById('workspace');
  const isGtg = String(user.company || '').toLowerCase() === 'gtg';
  workspace.classList.toggle('company-gtg', isGtg);
  document.querySelector('.brand-company-logo').classList.toggle('hidden', !isGtg);
  document.querySelector('.brand-app-name').classList.toggle('hidden', isGtg);
  document.querySelector('.workspace-company').classList.toggle('hidden', !isGtg);
  workspace.classList.remove('hidden');
  const userButton = document.querySelector('.user');
  userButton.textContent = user.initials || 'GTG';
  userButton.title = `${user.displayName || 'Usuario'} · Cerrar sesión`;
  window.connectDataEvents?.();
  window.loadWorkspaceData?.();
  navigate('dashboard');
};
