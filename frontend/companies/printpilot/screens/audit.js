(() => {
  const { h, money, ppApi, json, empty, badge } = window.printpilotHelpers;
  window.printpilotPages['printpilot-audit'] = async () => {
    const rows = await ppApi('/api/printpilot/audit');
    return `<div class="pp-heading"><div><span class="pp-eyebrow">TRAZABILIDAD</span><h2>Bitácora</h2><p>Acciones realizadas por el equipo PrintPilot.</p></div></div><div class="card table-card">${rows.length ? `<table><thead><tr><th>FECHA</th><th>USUARIO</th><th>ACCIÓN</th><th>REGISTRO</th><th>CAMBIOS</th></tr></thead><tbody>${rows.map((r) => `<tr><td>${h(String(r.created_at).replace('T', ' ').slice(0, 19))}</td><td>${h(r.actor_name)}</td><td>${h(r.action)}</td><td>${h(r.entity_type)} · ${h(r.entity_id)}</td><td><details><summary>Ver</summary><pre>${h(JSON.stringify({ antes: r.before_state, despues: r.after_state }, null, 2))}</pre></details></td></tr>`).join('')}</tbody></table>` : empty('La bitácora aparecerá cuando se registren cambios.')}</div>`;
  };
})();
