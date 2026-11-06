const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { safeError, loginRateLimit, recordLogin } = require('../backend/server');
const { allowedForTechnician } = require('../backend/companies/printpilot/routes');
const service = require('../backend/companies/printpilot/service');

test('F2-1: los errores comunes de PostgreSQL se explican en español sin detalles técnicos', () => {
  assert.match(
    safeError(
      Object.assign(new Error('duplicate key value violates unique constraint'), { code: '23505' }),
    ),
    /Ya existe/,
  );
  assert.match(
    safeError(Object.assign(new Error('secret database detail'), { code: '42P01' })),
    /problema interno/i,
  );
});

test('F2-2: los identificadores de activos no aceptan código ejecutable', () => {
  assert.equal(service.validateEntityId('PP-AIR-001'), 'PP-AIR-001');
  assert.throws(() => service.validateEntityId("X');ALERT(1);//"), /solo puede contener/);
  assert.throws(() => service.validateAssetCode("X');ALERT(1);//"), /solo puede contener/);
  const screensDirectory = path.join(__dirname, '../frontend/companies/printpilot/screens');
  const modules = fs
    .readdirSync(screensDirectory)
    .filter((name) => name.endsWith('.js'))
    .map((name) => fs.readFileSync(path.join(screensDirectory, name), 'utf8'))
    .join('\n');
  assert.match(modules, /data-pp-action="reading" data-id=/);
  assert.doesNotMatch(
    modules,
    /onclick="pp(?:ReadingForm|EditAsset|ChangeOrder|CompleteOrder|EditCountermeasure|CountermeasureEmail|OpenDocument|EditTechnician)\('\$\{h\(/,
  );
});

test('F2-3: el sexto inicio después de cinco fallos queda bloqueado por 15 minutos', () => {
  const req = { headers: {}, socket: { remoteAddress: 'phase2-test' } },
    username = `fase2-${Date.now()}`;
  for (let attempt = 0; attempt < 5; attempt++) {
    assert.equal(loginRateLimit(req, 'printpilot', username), 0);
    recordLogin(req, 'printpilot', username, false);
  }
  assert.ok(loginRateLimit(req, 'printpilot', username) > 0);
});

test('F2-4: el servidor limita técnicos a operaciones de trabajo y datos operativos', () => {
  assert.equal(allowedForTechnician('POST', '/api/printpilot/maintenance'), true);
  assert.equal(allowedForTechnician('PATCH', '/api/printpilot/orders/PP-OT-1'), true);
  assert.equal(allowedForTechnician('POST', '/api/printpilot/assets'), false);
  assert.equal(allowedForTechnician('GET', '/api/printpilot/audit'), false);
  assert.equal(allowedForTechnician('POST', '/api/printpilot/technicians'), false);
});

test('F2-5: las sesiones se guardan en PostgreSQL y los eventos envían token por Authorization, no por URL', () => {
  const schema = fs.readFileSync(path.join(__dirname, '../database/postgres/schema.sql'), 'utf8');
  const app = fs.readFileSync(path.join(__dirname, '../frontend/utils/app.js'), 'utf8');
  const server = fs.readFileSync(path.join(__dirname, '../backend/server.js'), 'utf8');
  assert.match(schema, /CREATE TABLE IF NOT EXISTS user_sessions/);
  assert.match(app, /fetch\(\s*['"]\/api\/events['"]\s*,\s*\{\s*headers:\s*\{\s*Authorization:/s);
  assert.doesNotMatch(app, /\/api\/events\?token=/);
  assert.match(server, /INSERT INTO user_sessions/);
});

test('F2-6: las operaciones modificadoras guardan el cambio y la bitácora en la misma transacción', () => {
  for (const name of [
    'addAsset',
    'updateAsset',
    'addTechnician',
    'updateTechnician',
    'createPlan',
    'createCountermeasure',
    'updateCountermeasure',
    'addDocument',
  ]) {
    const body = service[name].toString();
    assert.match(
      body,
      /transaction\(\s*async\s*\(client\)/,
      `${name} debe usar una transacción PostgreSQL`,
    );
    assert.match(
      body,
      /audit\(client/,
      `${name} debe escribir la bitácora usando el mismo cliente transaccional`,
    );
  }
});

test('F2-7: leer órdenes no las genera; se generan al arrancar y luego cada hora', () => {
  assert.doesNotMatch(service.listOrders.toString(), /generateScheduledOrders\(/);
  const server = fs.readFileSync(path.join(__dirname, '../backend/server.js'), 'utf8');
  assert.match(server, /await printpilotService\.generateScheduledOrders\(\)/);
  assert.ok(
    [...server.matchAll(/\.generateScheduledOrders\(\)/g)].length >= 2,
    'El servidor genera órdenes al inicio y vuelve a programarlas en el intervalo.',
  );
  assert.match(server, /setInterval\([\s\S]*60 \* 60 \* 1000/);
});
