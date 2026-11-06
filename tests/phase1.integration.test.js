const test = require('node:test');
const assert = require('node:assert/strict');

test(
  'PrintPilot cumple la fase 1 en PostgreSQL local de pruebas',
  { skip: !process.env.PRINTPILOT_TEST_DATABASE_URL },
  async () => {
    const connection = new URL(process.env.PRINTPILOT_TEST_DATABASE_URL);
    assert.ok(
      new Set(['localhost', '127.0.0.1', '::1', '[::1]']).has(connection.hostname),
      'La prueba solo puede usar PostgreSQL local.',
    );
    assert.equal(
      connection.pathname.slice(1),
      'automaince_test',
      'La prueba requiere la base separada automaince_test.',
    );
    process.env.DATABASE_URL = process.env.PRINTPILOT_TEST_DATABASE_URL;
    const repository = require('../database/adapters/postgresRepository');
    const service = require('../backend/companies/printpilot/service');
    const auth = require('../backend/companies/printpilot/auth');
    const { todayInSantoDomingo, addDays } = require('../backend/companies/printpilot/dateUtils');
    const admin = { id: 'PP-TECH-001', displayName: 'Emmanuel · Pruebas', role: 'ADMINISTRADOR' };
    try {
      await repository.initialize();
      const asset = (await service.listAssets('AIRES')).find(
        (item) => !item.meterUnit || item.meterUnit === 'HORAS',
      );
      assert.ok(asset, 'La prueba necesita un activo libre o configurado en horas.');
      const today = todayInSantoDomingo();
      const weekly = await service.createPlan(
        {
          name: `Prueba semanal ${Date.now()}`,
          category: 'AIRES',
          assetIds: [asset.id],
          tasks: ['Inspección'],
          intervalDays: 7,
          nextDueAt: today,
        },
        admin,
      );
      const weeklyOrders = (await service.listOrders(today, addDays(today, 31))).filter(
        (order) => order.plan_id === weekly.id,
      );
      assert.equal(
        weeklyOrders.length,
        5,
        'Un plan cada 7 días debe generar cinco órdenes en el horizonte de 30 días.',
      );

      const usagePlan = await service.createPlan(
        {
          name: `Prueba por uso ${Date.now()}`,
          category: 'AIRES',
          assetIds: [asset.id],
          tasks: ['Revisión'],
          usageInterval: 500,
          usageUnit: 'HORAS',
        },
        admin,
      );
      const assetBefore = (await service.listAssets('AIRES')).find((item) => item.id === asset.id);
      const reading = Number(assetBefore.meterValue) + 501;
      const generated = await service.addAssetReading(asset.id, { reading, unit: 'HORAS' }, admin);
      assert.ok(
        generated.scheduledOrders >= 1,
        'Una lectura que supera el intervalo debe generar la orden de mantenimiento.',
      );
      const usageOrders = (await service.listOrders()).filter(
        (order) => order.plan_id === usagePlan.id,
      );
      assert.equal(
        usageOrders.length,
        1,
        'El plan de 500 horas debe generar su orden aunque otros planes del equipo también venzan.',
      );

      const firstOrder = weeklyOrders[0];
      const beforeInProgress = Number((await service.dashboard()).counts.in_progress);
      await service.changeOrderStatus(firstOrder.id, 'EN PROCESO', admin);
      assert.equal(
        (await service.listOrders()).find((order) => order.id === firstOrder.id).status,
        'EN PROCESO',
      );
      assert.equal(
        Number((await service.dashboard()).counts.in_progress),
        beforeInProgress + 1,
        'El contador del panel debe subir al iniciar una orden.',
      );
      await service.changeOrderStatus(firstOrder.id, 'CANCELADA', admin);
      assert.equal(
        (await service.listOrders()).find((order) => order.id === firstOrder.id).status,
        'CANCELADA',
      );

      await assert.rejects(
        () =>
          service.createCountermeasure(
            { assetId: asset.id, title: 'Prueba', issue: 'Hallazgo', status: 'LO QUE SEA' },
            admin,
          ),
        /Estado no válido/,
      );
      await assert.rejects(
        () => service.updateCountermeasure('no-existe', { status: 'LO QUE SEA' }, admin),
        /Estado no válido/,
      );

      const username = `f1test${Date.now()}`;
      await service.addTechnician(
        {
          name: 'Técnico Fase Uno',
          nationalId: `TEST-${Date.now()}`,
          companyName: 'PrintPilot',
          username,
          temporaryPassword: 'Temporal123!',
        },
        admin,
      );
      const login = await auth.authenticate({ username, password: 'Temporal123!' });
      assert.equal(
        login.status,
        200,
        'El técnico debe poder iniciar sesión con su contraseña temporal.',
      );
    } finally {
      await repository.close();
    }
  },
);
