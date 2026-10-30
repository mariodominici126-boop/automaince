const test = require('node:test');
const assert = require('node:assert/strict');

test('PrintPilot completa la orden y ejecuta el guion de demo en PostgreSQL', { skip: !process.env.PRINTPILOT_TEST_DATABASE_URL }, async () => {
  const connection = new URL(process.env.PRINTPILOT_TEST_DATABASE_URL);
  const localHosts = new Set(['localhost', '127.0.0.1', '::1', '[::1]']);
  assert.ok(localHosts.has(connection.hostname), 'La prueba solo puede usar PostgreSQL local.');
  assert.equal(connection.pathname.slice(1), 'automaince_test', 'La prueba requiere la base separada automaince_test.');
  process.env.DATABASE_URL = process.env.PRINTPILOT_TEST_DATABASE_URL;
  const repository = require('../database/adapters/postgresRepository');
  const { runDemo } = require('../scripts/demo-printpilot');
  try {
    await repository.initialize();
    await repository.query("UPDATE supplies SET unit_cost=100 WHERE company_id='printpilot' AND kind='TINTA'");
    const result = await runDemo(() => {});
    assert.equal(result.order.status, 'COMPLETADA');
    assert.equal(Number(result.maintenance.total_cost), 950, 'El total debe calcularse automáticamente: 750 de mano de obra y 200 de tinta.');
    assert.equal(result.maintenance.technician_id, 'PP-TECH-001', 'El historial debe guardar el técnico seleccionado.');
    assert.ok(result.report.some(row => row.id === result.maintenance.id));
    assert.ok(result.report.some(row => row.id === result.countermeasure.id && row.kind === 'CORRECTIVO'));
    assert.ok(Number(result.ink.quantity) >= 8);
  } finally {
    await repository.close();
  }
});
