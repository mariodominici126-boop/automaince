(() => {
  const { h, money, ppApi, json, empty, badge } = window.printpilotHelpers;
  window.printpilotPages['printpilot-reports'] = async () => {
    const [assets, rows] = await Promise.all([
      ppApi('/api/printpilot/assets'),
      ppApi('/api/printpilot/reports'),
    ]);
    window.ppCurrentReportRows = rows;
    return `<div class="pp-heading"><div><span class="pp-eyebrow">ANÁLISIS DE MANTENIMIENTO</span><h2>Informes</h2><p>Filtra por activo, fechas y tipo; exporta o prepara el correo desde Gmail.</p></div><div><button class="btn secondary" onclick="ppExportReport()">Exportar CSV</button> <button class="btn secondary" onclick="window.print()">Imprimir / PDF</button></div></div><div class="toolbar pp-filters"><select id="ppFilterAsset"><option value="">Todos los activos</option>${assets.map((a) => `<option value="${h(a.id)}">${h(a.code)} · ${h(a.name)}</option>`).join('')}</select><input id="ppFilterFrom" type="date" aria-label="Desde"><input id="ppFilterTo" type="date" aria-label="Hasta"><select id="ppFilterKind"><option value="">Todos los tipos</option><option>PREVENTIVO</option><option>CORRECTIVO</option></select><button class="btn" onclick="ppFilterReport()">Filtrar</button></div><div class="card table-card" id="ppReportTable">${ppReportTable(rows)}</div>`;
  };
  function ppReportTable(rows) {
    return rows.length
      ? `<table><thead><tr><th>FECHA</th><th>ACTIVO</th><th>TIPO</th><th>TRABAJO</th><th>TÉCNICO</th><th>HORAS</th><th>COSTO</th></tr></thead><tbody>${rows.map((r) => `<tr><td>${h(r.completed_at || r.planned_at || '—')}</td><td>${h(r.asset_code)} · ${h(r.asset_name)}</td><td>${h(r.kind)}</td><td>${h(r.description)}</td><td>${h(r.technician_name || '—')}</td><td>${h(r.labor_hours)}</td><td>${money(r.total_cost)}</td></tr>`).join('')}</tbody></table>`
      : empty('No hay resultados para este filtro.');
  }
  window.ppCurrentReportRows = [];
  window.ppFilterReport = async () => {
    const qs = new URLSearchParams({
      assetId: document.getElementById('ppFilterAsset').value,
      from: document.getElementById('ppFilterFrom').value,
      to: document.getElementById('ppFilterTo').value,
      kind: document.getElementById('ppFilterKind').value,
    });
    const rows = await ppApi(`/api/printpilot/reports?${qs}`);
    window.ppCurrentReportRows = rows;
    document.getElementById('ppReportTable').innerHTML = ppReportTable(rows);
  };
  window.ppExportReport = () => {
    const rows = window.ppCurrentReportRows || [];
    const cols = ['Fecha', 'Código', 'Activo', 'Tipo', 'Trabajo', 'Técnico', 'Horas', 'Costo'];
    const quote = (v) => `"${String(v ?? '').replaceAll('"', '""')}"`;
    const csv =
      '\ufeff' +
      [
        cols,
        ...rows.map((r) => [
          r.completed_at || r.planned_at,
          r.asset_code,
          r.asset_name,
          r.kind,
          r.description,
          r.technician_name,
          r.labor_hours,
          r.total_cost,
        ]),
      ]
        .map((r) => r.map(quote).join(','))
        .join('\r\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    a.download = 'printpilot-informe-mantenimiento.csv';
    a.click();
    URL.revokeObjectURL(a.href);
  };
})();
