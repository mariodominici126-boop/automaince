const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

test('el envío del formulario PrintPilot bloquea el doble clic y muestra el error', async () => {
  const handlers = {};
  const app = {
    addEventListener: (name, handler) => {
      handlers[name] = handler;
    },
  };
  const modal = { addEventListener: () => {} };
  const document = {
    querySelector: (selector) =>
      selector === '#app' ? app : selector === '#modal' ? modal : { innerHTML: '' },
  };
  const errors = [];
  const window = {
    printpilotHelpers: {},
    pages: {},
    printpilotPages: {},
    formError: (error) => errors.push(error.error),
  };
  const file = path.join(__dirname, '../frontend/companies/printpilot/common.js');
  vm.runInNewContext(fs.readFileSync(file, 'utf8'), { window, document }, { filename: file });

  let executions = 0,
    release;
  const button = { disabled: false, textContent: 'Guardar', dataset: {} };
  const form = {
    dataset: {},
    isConnected: true,
    querySelectorAll: () => [button],
    closest: () => form,
  };
  const event = { target: form, preventDefault() {} };
  const operation = async () => {
    executions += 1;
    await new Promise((resolve) => {
      release = resolve;
    });
    throw new Error('Error de prueba');
  };
  const first = window.ppSubmitForm(event, operation);
  assert.equal(button.disabled, true);
  await window.ppSubmitForm(event, operation);
  assert.equal(executions, 1);
  release();
  await first;
  assert.equal(button.disabled, false);
  assert.equal(button.textContent, 'Guardar');
  assert.deepEqual(errors, ['Error de prueba']);
});
