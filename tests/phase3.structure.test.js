const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const root = path.join(__dirname, '..');
const printpilotRoot = path.join(root, 'frontend/companies/printpilot');
const expectedScreens = [
  'dashboard',
  'printpilot-agenda',
  'printpilot-air',
  'printpilot-filters',
  'printpilot-printers',
  'printpilot-oven',
  'printpilot-infrastructure',
  'printpilot-cutter',
  'printpilot-maintenance',
  'printpilot-countermeasures',
  'printpilot-supplies',
  'printpilot-documents',
  'printpilot-reports',
  'printpilot-audit',
  'printpilot-technicians',
];

test('cada vista PrintPilot carga desde su módulo y queda registrada', () => {
  const html = fs.readFileSync(path.join(root, 'frontend/index.html'), 'utf8');
  const scripts = [
    ...html.matchAll(
      /<script src="(frontend\/companies\/printpilot\/(?:common\.js|screens\/[^\"]+))"><\/script>/g,
    ),
  ].map(([, source]) => path.join(root, source));
  assert.equal(
    scripts.length,
    17,
    'Se cargan el módulo común, las pantallas y el módulo compartido de activos.',
  );
  assert.ok(scripts.every(fs.existsSync), 'Todos los módulos enlazados deben existir.');
  assert.doesNotMatch(html, /printpilot\/modules\.js/);

  const listeners = [];
  const rootElement = { addEventListener: (...args) => listeners.push(args) };
  const window = { pages: {}, printpilotPages: {} };
  const document = { querySelector: () => rootElement };
  for (const file of scripts) {
    vm.runInNewContext(fs.readFileSync(file, 'utf8'), { window, document }, { filename: file });
  }

  assert.deepEqual(Object.keys(window.printpilotPages).sort(), [...expectedScreens].sort());
  assert.ok(
    listeners.length >= 4,
    'Los controles delegados de acción y formulario deben quedar conectados.',
  );
});
