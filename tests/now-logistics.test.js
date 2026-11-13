const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const auth = require('../backend/companies/now-logistics/auth');

test('NOW Logistics solo admite los dos encargados autorizados por cédula', () => {
  assert.equal(auth.allowedUsers.has('07105563211'), true);
  assert.equal(auth.allowedUsers.has('40214552362'), true);
  assert.equal(auth.allowedUsers.size, 2);
  assert.equal(auth.allowedUsers.has('00000000000'), false);
});

test('la interfaz NOW presenta todas las unidades y no hereda el menú de maquinaria PrintPilot', () => {
  const root = path.join(__dirname, '../frontend/companies/now-logistics');
  const html = fs.readFileSync(path.join(__dirname, '../frontend/index.html'), 'utf8');
  const scripts = fs.readdirSync(path.join(root, 'screens')).filter((file) => file.endsWith('.js'));
  assert.ok(scripts.includes('vehicles.js'));
  assert.match(html, /now-logistics\/screens\/vehicles\.js/);
  assert.match(html, /now-logistics\/workspace\.js/);
  const vehiclesPage = fs.readFileSync(path.join(root, 'screens/vehicles.js'), 'utf8');
  assert.match(vehiclesPage, /\/api\/now\/vehicles/);
  assert.match(vehiclesPage, /v\.name/);
  assert.doesNotMatch(vehiclesPage, /printpilotPages|PP-AIR|IMPRESORAS/);
});
