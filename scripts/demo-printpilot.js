const assert = require('node:assert/strict');
const repository = require('../database/adapters/postgresRepository');
const printpilot = require('../backend/companies/printpilot/service');

const user = { id: 'PP-TECH-001', company: 'printpilot', displayName: 'Emmanuel · Demo', role: 'ADMINISTRADOR' };
const tasks = ['Revisar condición general', 'Registrar resultado y evidencia'];
const dateOnly = date => date.toISOString().slice(0, 10);

async function runDemo(log = console.log) {
  await repository.initialize();
  const assets = await printpilot.listAssets('AIRES');
  assert.ok(assets.length, 'La base debe tener el inventario inicial de PrintPilot.');
  const asset = assets[0];

  const plan = await printpilot.createPlan({
    name: `Guion de demostración ${new Date().toISOString()}`,
    category: asset.category,
    assetIds: [asset.id],
    tasks,
    intervalDays: 365,
    nextDueAt: dateOnly(new Date()),
  }, user);
  const today = dateOnly(new Date());
  const tomorrowDate = new Date(); tomorrowDate.setUTCDate(tomorrowDate.getUTCDate() + 1);
  const orders = await printpilot.listOrders(today, dateOnly(tomorrowDate));
  const order = orders.find(item => item.plan_id === plan.id);
  assert.ok(order, 'El plan debe generar una orden para hoy.');

  const maintenance = await printpilot.completeOrder({
    orderId: order.id,
    startedAt: new Date().toISOString(),
    checklist: tasks.map(label => ({ label, done: true })),
    observations: 'Guion de demo: mantenimiento preventivo realizado.',
    findings: 'Sin anomalías en la inspección de demostración.',
    recommendations: 'Continuar con el intervalo preventivo definido.',
    materials: [{ name: 'Filtro de demostración', quantity: 1 }],
    laborHours: 1.5,
    laborCost: 750,
    totalCost: 950,
    description: 'Mantenimiento preventivo del guion de demostración.',
  }, user);
  const completed = (await printpilot.listOrders()).find(item => item.id === order.id);
  assert.equal(completed?.status, 'COMPLETADA', 'La orden debe quedar completada.');

  const countermeasure = await printpilot.createCountermeasure({
    assetId: asset.id,
    title: 'Contramedida de demostración',
    issue: 'Hallazgo preventivo detectado durante el guion de demo.',
    rootCause: 'Validación funcional de la fase F0.',
    actionTaken: 'Inspeccionar, documentar y dar seguimiento.',
    technicianId: user.id,
    status: 'PENDIENTE',
  }, user);

  const files = [
    { filename: 'Factura reparación.pdf', name: 'Factura de demostración', mimeType: 'application/pdf', content: Buffer.from('%PDF-1.4\nAutoMaince demo\n%%EOF') },
    { filename: 'Señal.png', name: 'Evidencia de señal', mimeType: 'image/png', content: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=', 'base64') },
  ];
  for (const file of files) {
    const document = await printpilot.addDocument({
      name: file.name,
      filename: file.filename,
      mimeType: file.mimeType,
      contentBase64: file.content.toString('base64'),
      assetId: asset.id,
      maintenanceId: maintenance.id,
      countermeasureId: countermeasure.id,
    }, user);
    const opened = await printpilot.documentContent(document.id);
    assert.equal(opened.original_filename, file.filename);
    assert.ok(opened.contents.equals(file.content), `El documento ${file.filename} debe abrirse con su contenido original.`);
  }

  const ink = (await printpilot.listSupplies()).find(item => item.kind === 'TINTA');
  assert.ok(ink, 'La base debe incluir el insumo Tinta.');
  const initialInk = Number(ink.quantity);
  await printpilot.recordSupplyMovement(ink.id, { movementType: 'ENTRADA', quantity: 10, note: 'Entrada del guion de demo.' }, user);
  const afterEntry = (await printpilot.listSupplies()).find(item => item.id === ink.id);
  assert.equal(Number(afterEntry.quantity), initialInk + 10);
  await printpilot.recordSupplyMovement(ink.id, { movementType: 'CONSUMO', quantity: 2, note: 'Consumo del guion de demo.' }, user);
  const afterUse = (await printpilot.listSupplies()).find(item => item.id === ink.id);
  assert.equal(Number(afterUse.quantity), initialInk + 8, 'Después de agregar 10 y consumir 2 deben quedar 8 unidades adicionales.');

  const report = await printpilot.report({ assetId: asset.id });
  assert.ok(report.some(row => row.id === maintenance.id), 'El mantenimiento debe aparecer en el informe del activo.');
  log(`Plan preventivo: ${plan.id}`);
  log(`Orden completada: ${order.id}`);
  log(`Mantenimiento: ${maintenance.id}`);
  log(`Contramedida: ${countermeasure.id}`);
  log('Documentos abiertos: Factura reparación.pdf y Señal.png');
  log(`Tinta: ${initialInk} + 10 - 2 = ${Number(afterUse.quantity)}`);
  log(`Informe: ${report.length} mantenimiento(s) del activo ${asset.code}`);
  return { plan, order: completed, maintenance, countermeasure, report, ink: afterUse };
}

if (require.main === module) runDemo().catch(error => { console.error('Falló el guion PrintPilot:', error); process.exitCode = 1; }).finally(() => repository.close());

module.exports = { runDemo };
