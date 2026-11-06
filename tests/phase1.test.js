const test = require('node:test');
const assert = require('node:assert/strict');
const {
  todayInSantoDomingo,
  addMonthsClamped,
  addDays,
} = require('../backend/companies/printpilot/dateUtils');
const service = require('../backend/companies/printpilot/service');
const printpilotRoutes = require('../backend/companies/printpilot/routes');

test('F1-2: sumar un mes al 31 de enero limita el día al último de febrero', () => {
  assert.equal(addMonthsClamped('2025-01-31', 1), '2025-02-28');
  assert.equal(addMonthsClamped('2024-01-31', 1), '2024-02-29');
});

test('F1-2: después de las 9 p. m. en Santo Domingo sigue contando la fecha local', () => {
  assert.equal(todayInSantoDomingo(new Date('2026-10-31T01:00:00.000Z')), '2026-10-30');
});

test('F1-1: suma días sin depender de UTC local', () => {
  assert.equal(addDays('2026-10-30', 7), '2026-11-06');
});

test('F1-9: rechaza estados y prioridades inventados con una explicación', async () => {
  await assert.rejects(
    service.createCountermeasure({
      assetId: 'PP-TEST',
      title: 'Prueba',
      issue: 'Hallazgo',
      status: 'LO QUE SEA',
    }),
    /Estado no válido.*PENDIENTE/,
  );
  await assert.rejects(
    service.updateCountermeasure('PP-TEST', { priority: 'URGENTE' }),
    /Prioridad no válida.*BAJA/,
  );
});

test('F1-3: la ruta de informes reenvía el filtro CORRECTIVO al servicio', async () => {
  const originalReport = service.report;
  let receivedFilters;
  service.report = async (filters) => {
    receivedFilters = filters;
    return [];
  };
  try {
    const response = await printpilotRoutes.handle(
      { method: 'GET' },
      {},
      new URL('http://localhost/api/printpilot/reports?kind=CORRECTIVO'),
      { user: { role: 'ADMINISTRADOR' } },
      async () => ({}),
      (_res, status, body) => ({ status, body }),
    );
    assert.equal(response.status, 200);
    assert.equal(receivedFilters.kind, 'CORRECTIVO');
  } finally {
    service.report = originalReport;
  }
});
