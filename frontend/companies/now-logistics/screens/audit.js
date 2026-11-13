(() => {
  const { h, api, empty } = window.nowHelpers;
  window.nowPages['now-audit'] = async () => {
    const rows = await api('/api/now/audit');
    return `<div class="now-heading"><div><span class="now-eyebrow">TRAZABILIDAD DE CAMBIOS</span><h2>Bitácora</h2><p>Registro de quién hizo cada solicitud, actualización o asignación.</p></div></div>
      <div class="card table-card"><table><thead><tr><th>FECHA</th><th>USUARIO</th><th>ACCIÓN</th><th>REGISTRO</th><th>ID</th><th>CAMBIO</th></tr></thead><tbody>${rows.map((r) => `<tr><td>${h(r.created_at)}</td><td>${h(r.actor_name)}</td><td>${h(r.action)}</td><td>${h(r.entity_type)}</td><td>${h(r.entity_id)}</td><td>${r.after_state ? h(JSON.stringify(r.after_state)) : '—'}</td></tr>`).join('')}</tbody></table>${rows.length ? '' : empty('Aún no hay cambios en la bitácora.')}</div>`;
  };
})();
