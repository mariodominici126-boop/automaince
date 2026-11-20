const test = require('node:test');
const assert = require('node:assert/strict');

test(
  'PrintPilot conserva fechas, calcula repuestos, protege compras y revoca acceso en PostgreSQL local',
  { skip: !process.env.PRINTPILOT_TEST_DATABASE_URL },
  async () => {
    const connection = new URL(process.env.PRINTPILOT_TEST_DATABASE_URL);
    assert.ok(new Set(['localhost', '127.0.0.1', '::1', '[::1]']).has(connection.hostname));
    assert.equal(connection.pathname.slice(1), 'automaince_test');
    process.env.DATABASE_URL = process.env.PRINTPILOT_TEST_DATABASE_URL;
    const repository = require('../database/adapters/postgresRepository');
    const service = require('../backend/companies/printpilot/service');
    const user = { id: 'PP-TECH-001', displayName: 'Pruebas PrintPilot', role: 'ADMINISTRADOR' };
    const originals = {
      gmail: process.env.GMAIL_USER,
      appPassword: process.env.GMAIL_APP_PASSWORD,
    };
    try {
      delete process.env.GMAIL_USER;
      delete process.env.GMAIL_APP_PASSWORD;
      await repository.initialize();
      const asset = (await service.listAssets()).find(Boolean);
      assert.ok(asset);

      await assert.rejects(
        service.createPlan(
          { name: 'Plan inválido', assetIds: [asset.id], tasks: ['Revisar'], intervalDays: 7 },
          user,
        ),
        /próxima fecha/i,
      );
      await assert.rejects(
        service.addAsset(
          {
            code: `BAD-${Date.now()}`,
            name: 'Activo inválido',
            category: 'AIRES',
            criticality: 'CUALQUIERA',
          },
          user,
        ),
        /criticidad/i,
      );

      const ink = (await service.listSupplies()).find((item) => item.kind === 'TINTA');
      await repository.query('UPDATE supplies SET quantity=0,unit_cost=0 WHERE id=$1', [ink.id]);
      await service.recordSupplyMovement(
        ink.id,
        { movementType: 'ENTRADA', quantity: 10, unitCost: 12.5 },
        user,
      );
      await service.recordSupplyMovement(ink.id, { movementType: 'CONSUMO', quantity: 2 }, user);
      let currentInk = (await service.listSupplies()).find((item) => item.id === ink.id);
      assert.equal(Number(currentInk.quantity), 8);
      assert.equal(Number(currentInk.unit_cost), 12.5);

      const cm = await service.createCountermeasure(
        {
          assetId: asset.id,
          title: `Prueba de contramedida ${Date.now()}`,
          issue: 'Prueba controlada',
          plannedAt: '2026-11-06',
          laborCost: 25,
          parts: [{ supplyId: ink.id, quantity: 2 }],
        },
        user,
      );
      assert.equal(Number(cm.total_cost), 50);
      currentInk = (await service.listSupplies()).find((item) => item.id === ink.id);
      assert.equal(Number(currentInk.quantity), 6);
      await service.updateCountermeasure(
        cm.id,
        { plannedAt: '2026-11-06', status: 'EN PROCESO' },
        user,
      );
      let updated = (await service.listCountermeasures()).find((item) => item.id === cm.id);
      assert.equal(String(updated.planned_at).slice(0, 10), '2026-11-06');
      assert.ok(updated.started_at);
      const originalStartedAt = new Date(updated.started_at).toISOString();
      await service.updateCountermeasure(
        cm.id,
        { plannedAt: '2026-11-06', status: 'EN PROCESO', startedAt: originalStartedAt },
        user,
      );
      updated = (await service.listCountermeasures()).find((item) => item.id === cm.id);
      assert.equal(new Date(updated.started_at).toISOString(), originalStartedAt);
      await service.updateCountermeasure(
        cm.id,
        { plannedAt: '2026-11-06', status: 'COMPLETADA' },
        user,
      );
      updated = (await service.listCountermeasures()).find((item) => item.id === cm.id);
      assert.ok(updated.completed_at);
      assert.equal(Number(updated.total_cost), 50);

      const legacyPlanId = `PP-PLAN-LEGACY-${Date.now()}`;
      await repository.query(
        `INSERT INTO maintenance_plans(id,company_id,name,category,interval_days,next_due_at,tasks,created_by)
         VALUES($1,'printpilot','Plan vencido de prueba','AIRES',1,'2000-01-01','[]'::jsonb,$2)`,
        [legacyPlanId, user.id],
      );
      await repository.query('INSERT INTO plan_assets(plan_id,asset_id) VALUES($1,$2)', [
        legacyPlanId,
        asset.id,
      ]);
      await service.generateScheduledOrders();
      const legacyOrders = await repository.query(
        'SELECT count(*)::int total FROM work_orders WHERE plan_id=$1',
        [legacyPlanId],
      );
      assert.ok(
        legacyOrders.rows[0].total <= 31,
        'Un plan muy atrasado no debe generar años de órdenes vencidas.',
      );

      const purchase = await service.requestPurchase('PP-SUP-GAS', { quantity: 3 }, user);
      assert.equal(purchase.emailStatus, 'ERROR');
      const savedPurchase = await repository.query(
        'SELECT email_status FROM purchase_requests WHERE id=$1',
        [purchase.id],
      );
      assert.equal(savedPurchase.rows[0].email_status, 'ERROR');

      const tech = await service.addTechnician(
        {
          name: 'Cuenta prueba',
          nationalId: `TEST-${Date.now()}`,
          companyName: 'PrintPilot',
          username: `f4test${Date.now()}`,
          temporaryPassword: 'Temporal123!',
        },
        user,
      );
      await repository.query(
        "INSERT INTO user_sessions(token_hash,company_id,user_payload,expires_at) VALUES($1,'printpilot',$2::jsonb,now()+interval '1 hour')",
        [`test-${tech.id}`, JSON.stringify({ id: tech.id, role: 'TECNICO' })],
      );
      await service.updateTechnician(
        tech.id,
        {
          name: tech.name,
          nationalId: tech.national_id,
          companyName: tech.company_name,
          role: 'ADMINISTRADOR',
          active: false,
          temporaryPassword: 'NuevaClave123!',
        },
        user,
      );
      const session = await repository.query('SELECT 1 FROM user_sessions WHERE token_hash=$1', [
        `test-${tech.id}`,
      ]);
      assert.equal(session.rowCount, 0);
    } finally {
      if (originals.gmail !== undefined) process.env.GMAIL_USER = originals.gmail;
      if (originals.appPassword !== undefined)
        process.env.GMAIL_APP_PASSWORD = originals.appPassword;
      await repository.close();
    }
  },
);
