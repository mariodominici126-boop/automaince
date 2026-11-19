(() => {
  const baseEnter = window.enterMaintenanceWorkspace;
  const defaults = window.defaultCompanyPages || { ...window.pages };
  const isNow = (user) =>
    String(user.companyId || user.company || '')
      .toLowerCase()
      .replaceAll(' ', '') === 'now';
  window.enterMaintenanceWorkspace = function (user) {
    if (!isNow(user)) return baseEnter(user);
    const workspace = document.getElementById('workspace'),
      nav = document.querySelector('#nav');
    workspace.classList.remove('company-gtg', 'company-printpilot');
    workspace.classList.add('company-now');
    nav.innerHTML = window.nowMenuHtml();
    window.pages = { ...defaults, ...window.nowPages, dashboard: window.nowPages['now-dashboard'] };
    const logo = document.querySelector('.brand-company-logo');
    logo.src = 'frontend/companies/now-logistics/assets/logo.png';
    logo.alt = 'NOW Logistics';
    logo.classList.remove('hidden');
    document.querySelector('.brand-app-name').classList.add('hidden');
    const chip = document.querySelector('.workspace-company');
    chip.innerHTML = '<i>NOW</i> NOW Logistics';
    chip.classList.remove('hidden');
    document.querySelector('.notification').classList.remove('hidden');
    document.querySelector('aside .eyebrow').textContent = 'FLOTA · NOW LOGISTICS';
    document.querySelector('.sidebar-foot').textContent = 'PostgreSQL · NOW Logistics';
    document.getElementById('accessPortal').innerHTML = '';
    document.getElementById('accessPortal').classList.add('hidden');
    workspace.classList.remove('hidden');
    const button = document.querySelector('.user');
    button.textContent = user.initials || 'NOW';
    button.title = `${user.displayName || 'NOW Logistics'} · Cerrar sesión`;
    window.connectDataEvents?.();
    window.loadWorkspaceData?.();
    window.resetWorkspaceHistory?.('now-dashboard');
    window.navigate('now-dashboard');
  };
  const saved = sessionStorage.getItem('automaince.user');
  if (saved && sessionStorage.getItem('automaince.token')) {
    try {
      const user = JSON.parse(saved);
      if (isNow(user)) window.enterMaintenanceWorkspace(user);
    } catch {}
  }
})();
