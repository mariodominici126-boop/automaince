const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const printpilotScreens = path.join(__dirname, '../frontend/companies/printpilot/screens');

function helpers(ppApi) {
  return {
    h: (value) => String(value ?? ''),
    money: (value) => String(value ?? 0),
    ppApi,
    json: (_method, body) => body,
    empty: (message) => `<p>${message}</p>`,
    badge: (status) => `<span>${status}</span>`,
  };
}

test('F1-3 y F1-5: la tabla y el CSV usan las filas filtradas', async () => {
  const reportRows = [
    {
      id: 'CM-1',
      kind: 'CORRECTIVO',
      asset_code: 'PP-AIR-1',
      asset_name: 'Aire',
      description: 'Reparación',
    },
    {
      id: 'MT-1',
      kind: 'PREVENTIVO',
      asset_code: 'PP-AIR-1',
      asset_name: 'Aire',
      description: 'Inspección',
    },
  ];
  const calls = [];
  const elements = {
    ppFilterAsset: { value: 'PP-AIR-1' },
    ppFilterFrom: { value: '2026-11-01' },
    ppFilterTo: { value: '2026-11-30' },
    ppFilterKind: { value: 'CORRECTIVO' },
    ppReportTable: { innerHTML: '' },
  };
  let csvContent = '';
  let clicked = false;
  const window = {
    printpilotHelpers: helpers(async (url) => {
      calls.push(url);
      return reportRows.filter((row) => row.kind === 'CORRECTIVO');
    }),
    printpilotPages: {},
  };
  const document = {
    getElementById: (id) => elements[id],
    createElement: () => ({
      click: () => {
        clicked = true;
      },
    }),
  };
  class MockBlob {
    constructor(parts) {
      csvContent = parts.join('');
    }
  }
  const URL = {
    createObjectURL: () => 'blob:filtered-report',
    revokeObjectURL: () => {},
  };

  vm.runInNewContext(fs.readFileSync(path.join(printpilotScreens, 'reports.js'), 'utf8'), {
    window,
    document,
    URL,
    URLSearchParams,
    Blob: MockBlob,
  });
  await window.ppFilterReport();
  assert.match(calls[0], /assetId=PP-AIR-1/);
  assert.match(calls[0], /from=2026-11-01/);
  assert.match(calls[0], /to=2026-11-30/);
  assert.match(calls[0], /kind=CORRECTIVO/);
  assert.match(elements.ppReportTable.innerHTML, /Reparación/);
  assert.doesNotMatch(elements.ppReportTable.innerHTML, /Inspección/);

  window.ppExportReport();
  assert.equal(clicked, true);
  assert.match(csvContent, /Reparación/);
  assert.doesNotMatch(csvContent, /Inspección/);
  assert.match(csvContent, /CORRECTIVO/);
});

test('F1-5: la vista de Filtros muestra etiquetas de tareas y órdenes de su categoría', async () => {
  const window = {
    printpilotHelpers: helpers(async (url) => {
      if (url === '/api/printpilot/plans')
        return [
          {
            category: 'FILTROS',
            name: 'Cambio mensual',
            tasks: [{ label: 'Cambiar filtro' }, 'Revisar marco'],
            nextDueAt: '2026-11-15',
            assetIds: ['PP-AIR-1'],
          },
          { category: 'AIRES', name: 'Otro plan', tasks: ['No mostrar'] },
        ];
      return [
        { id: 'OT-FILTRO', plan_category: 'FILTROS', description: 'Cambiar filtro' },
        { id: 'OT-AIRE', plan_category: 'AIRES', description: 'No mostrar' },
      ];
    }),
    printpilotPages: {},
    ppOrderList: (orders) => orders.map((order) => order.id).join(','),
  };
  const document = {};
  vm.runInNewContext(fs.readFileSync(path.join(printpilotScreens, 'filters.js'), 'utf8'), {
    window,
    document,
  });

  const html = await window.printpilotPages['printpilot-filters']();
  assert.match(html, /Cambiar filtro · Revisar marco/);
  assert.match(html, /OT-FILTRO/);
  assert.doesNotMatch(html, /\[object Object\]|Otro plan|OT-AIRE|No mostrar/);
});
