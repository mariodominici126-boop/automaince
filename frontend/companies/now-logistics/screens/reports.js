(() => {
  const { h, api, empty, money, statusBadge } = window.nowHelpers;
  window.nowPages['now-reports'] = async () => {
    const [maintenance, repairs, fuel, assignments] = await Promise.all([
      api('/api/now/maintenance'),
      api('/api/now/repairs'),
      api('/api/now/fuel'),
      api('/api/now/assignments'),
    ]);
    window.nowReportData = { maintenance, repairs, fuel, assignments };
    return `<div class="now-heading"><div><span class="now-eyebrow">RESUMEN OPERATIVO</span><h2>Informes</h2><p>Consulta los registros de mantenimiento, reparaciones, combustible y transporte.</p></div><button class="btn secondary" data-now-action="reportCsv">Exportar CSV</button></div>
      <div class="grid now-report-grid"><article class="card"><span class="now-eyebrow">MANTENIMIENTOS</span><b>${maintenance.length}</b><p>Solicitados, programados y completados.</p></article><article class="card"><span class="now-eyebrow">REPARACIONES</span><b>${repairs.length}</b><p>Con costos y garantía registrada.</p></article><article class="card"><span class="now-eyebrow">DESPACHOS</span><b>${fuel.length}</b><p>Registros de combustible.</p></article><article class="card"><span class="now-eyebrow">TRANSPORTE</span><b>${assignments.length}</b><p>Asignaciones de unidades.</p></article></div>
      <section class="card table-card now-top-space"><h3 class="section-title">Mantenimientos recientes</h3>${
        maintenance.length
          ? `<table><thead><tr><th>FECHA</th><th>UNIDAD</th><th>TRABAJO</th><th>PROVEEDOR</th><th>COSTO</th><th>ESTADO</th></tr></thead><tbody>${maintenance
              .slice(0, 20)
              .map(
                (m) =>
                  `<tr><td>${h(m.execution_date || m.planned_date || m.request_date || '—')}</td><td>${h(m.vehicle_id)} · ${h(m.vehicle_name)}</td><td>${h(m.maintenance_type)}<small>${h(m.details)}</small></td><td>${h(m.provider_name || '—')}</td><td>${money(m.cost)}</td><td>${statusBadge(m.status)}</td></tr>`,
              )
              .join('')}</tbody></table>`
          : empty('Sin registros todavía.')
      }</section>`;
  };
  window.nowExportReport = () => {
    const data = window.nowReportData || {};
    const rows = [
      ...(data.maintenance || []).map((m) => [
        'MANTENIMIENTO',
        m.request_date,
        m.execution_date,
        m.vehicle_id,
        m.vehicle_name,
        m.maintenance_type,
        m.details,
        m.provider_name,
        m.execution_location,
        m.next_maintenance,
        m.cost,
        m.status,
      ]),
      ...(data.repairs || []).map((r) => [
        'REPARACION',
        r.repair_date,
        r.repair_date,
        r.vehicle_id,
        r.vehicle_name,
        r.title,
        r.description,
        r.provider_name,
        r.warranty,
        '',
        r.cost,
        '',
      ]),
      ...(data.fuel || []).map((f) => [
        'COMBUSTIBLE',
        f.record_date,
        f.record_date,
        f.vehicle_id,
        f.vehicle_name,
        `${f.liters ?? ''} litros`,
        `Lectura: ${f.mileage ?? ''}; dispensado: ${f.dispenser ?? ''}`,
        '',
        '',
        '',
        f.cost,
        '',
      ]),
      ...(data.assignments || []).map((a) => [
        'TRANSPORTE',
        a.assignment_date,
        a.assignment_date,
        a.vehicle_id,
        a.vehicle_name,
        a.assigned_to,
        a.destination,
        a.provider_name,
        a.origin,
        '',
        '',
        a.status,
      ]),
    ];
    const quote = (value) => `"${String(value ?? '').replaceAll('"', '""')}"`;
    const csv =
      '\ufeff' +
      [
        [
          'Tipo',
          'Fecha solicitud',
          'Fecha ejecución',
          'Unidad',
          'Nombre',
          'Tipo / título',
          'Detalle / destino',
          'Proveedor / asignado',
          'Lugar / origen',
          'Próxima fecha',
          'Costo',
          'Estado',
        ],
        ...rows,
      ]
        .map((row) => row.map(quote).join(','))
        .join('\r\n');
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    link.download = 'now-logistics-informe.csv';
    link.click();
    URL.revokeObjectURL(link.href);
  };
})();
