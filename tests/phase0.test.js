const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { server, resolveFrontendFile } = require('../backend/server');
const { contentDisposition } = require('../backend/companies/printpilot/routes');

test('el servidor permite la aplicación y solo recursos del frontend', () => {
  const root = path.resolve(__dirname, '..');
  assert.equal(resolveFrontendFile('/'), path.join(root, 'frontend', 'index.html'));
  assert.equal(resolveFrontendFile('/frontend/index.html'), path.join(root, 'frontend', 'index.html'));
  for (const url of ['/.env', '/.git/config', '/backend/server.js', '/frontend/../.env', '/frontend/%2e%2e/.env', '/%ZZ']) {
    assert.equal(resolveFrontendFile(url), null, `${url} debe permanecer privado.`);
  }
});

test('rutas privadas responden 404 y la página principal sigue cargando', async () => {
  const request = url => new Promise(resolve => {
    const req = { url, method: 'GET', headers: {} };
    const res = {
      writableEnded: false,
      writeHead(statusCode, headers) { this.statusCode = statusCode; this.headers = headers; },
      end(body) { this.body = body; this.writableEnded = true; resolve(this); },
    };
    server.emit('request', req, res);
  });
  for (const url of ['/.env', '/.git/config', '/backend/server.js']) {
    const response = await request(url);
    assert.equal(response.statusCode, 404, `${url} debe responder 404.`);
  }
  const home = await request('/');
  assert.equal(home.statusCode, 200);
  assert.match(home.body.toString(), /AutoMaince/);
});

test('Content-Disposition conserva nombres de archivo Unicode en UTF-8', () => {
  assert.match(contentDisposition('Factura reparación.pdf'), /filename\*=UTF-8''Factura%20reparaci%C3%B3n\.pdf/);
  assert.match(contentDisposition('Señal.png'), /filename\*=UTF-8''Se%C3%B1al\.png/);
  assert.doesNotMatch(contentDisposition('Factura\r\nX-Injected: true.pdf'), /\r|\n/);
});

test('completar una orden bloquea solamente la fila de la orden', () => {
  const fs = require('node:fs');
  const source = fs.readFileSync(path.join(__dirname, '../backend/companies/printpilot/service.js'), 'utf8');
  assert.match(source, /LEFT JOIN maintenance_plans p ON p\.id=o\.plan_id WHERE o\.company_id=\$1 AND o\.id=\$2 FOR UPDATE OF o/);
});
