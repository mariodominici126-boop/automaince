(() => {
  const baseEnter=window.enterMaintenanceWorkspace;
  const baseNav=document.querySelector('#nav').innerHTML;
  const defaults=window.defaultCompanyPages||{...window.pages};
  const isPrintPilot=user=>String(user.companyId||user.company||'').toLowerCase().replaceAll(' ','')==='printpilot';
  function setCompanyAppearance(user,printpilot){
    const workspace=document.getElementById('workspace'),logo=document.querySelector('.brand-company-logo');
    workspace.classList.toggle('company-printpilot',printpilot);
    workspace.classList.toggle('company-gtg',!printpilot&&String(user.company||'').toLowerCase()==='gtg');
    logo.src=printpilot?'frontend/companies/printpilot/assets/logo.png':'frontend/companies/gtg/assets/logo.png';
    logo.alt=printpilot?'PrintPilot':'Global Technology Group';
    logo.classList.toggle('hidden',!printpilot&&String(user.company||'').toLowerCase()!=='gtg');
    document.querySelector('.brand-app-name').classList.toggle('hidden',printpilot||String(user.company||'').toLowerCase()==='gtg');
    const chip=document.querySelector('.workspace-company');
    if(printpilot){chip.innerHTML='<i>PP</i> PrintPilot';chip.classList.remove('hidden');}
    else chip.classList.toggle('hidden',String(user.company||'').toLowerCase()!=='gtg');
    document.querySelector('.notification').classList.toggle('hidden',printpilot);
    document.querySelector('aside .eyebrow').textContent=printpilot?'MANTENIMIENTO · PRODUCCIÓN':'GESTIÓN INTELIGENTE';
    document.querySelector('.sidebar-foot').textContent=printpilot?'PostgreSQL · PrintPilot':'AutoMaince · Mantenimiento';
  }
  window.enterMaintenanceWorkspace=function(user){
    const pp=isPrintPilot(user),nav=document.querySelector('#nav');
    if(pp){
      nav.innerHTML=window.printpilotMenuHtml();
      window.pages={...defaults,...window.printpilotPages,dashboard:window.printpilotPages.dashboard};
      setCompanyAppearance(user,true);
      document.getElementById('accessPortal').innerHTML='';document.getElementById('accessPortal').classList.add('hidden');
      document.getElementById('workspace').classList.remove('hidden');
      const userButton=document.querySelector('.user');userButton.textContent=user.initials||'EM';userButton.title=`${user.displayName||'Emmanuel'} · Cerrar sesión`;
      window.connectDataEvents?.();window.navigate('dashboard');return;
    }
    nav.innerHTML=baseNav;window.pages={...defaults};setCompanyAppearance(user,false);
    baseEnter(user);
  };
  const saved=sessionStorage.getItem('automaince.user');
  if(saved&&sessionStorage.getItem('automaince.token')){try{const user=JSON.parse(saved);if(isPrintPilot(user))window.enterMaintenanceWorkspace(user);}catch{}}
})();
