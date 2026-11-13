const test = require('node:test');
const assert = require('node:assert/strict');

test(
  'NOW Logistics siembra la flota, restringe los accesos y registra mantenimiento, subcontratos, combustible y reparaciones',
  { skip: !process.env.PRINTPILOT_TEST_DATABASE_URL },
  async () => {
    const connection = new URL(process.env.PRINTPILOT_TEST_DATABASE_URL);
    assert.ok(new Set(['localhost', '127.0.0.1', '::1', '[::1]']).has(connection.hostname));
    assert.equal(connection.pathname.slice(1), 'automaince_test');
    process.env.DATABASE_URL = process.env.PRINTPILOT_TEST_DATABASE_URL;
    process.env.NOW_YAIFRYN_PASSWORD = 'NOW-Test-Yaifryn-2026!';
    process.env.NOW_YAN_PASSWORD = 'NOW-Test-Yan-2026!';
    const repository = require('../database/adapters/postgresRepository');
    const service = require('../backend/companies/now-logistics/service');
    const auth = require('../backend/companies/now-logistics/auth');
    const {
      todayInSantoDomingo,
      addDays,
      addMonthsClamped,
    } = require('../backend/companies/printpilot/dateUtils');
    const user = { id: 'NOW-USER-TEST', displayName: 'Prueba NOW', role: 'ADMINISTRADOR' };
    try {
      await repository.initialize();
      // F9 intentionally has no supplied maintenance dates. Reset only this
      // demo fixture so the integration test remains repeatable on a reused DB.
      await repository.query(
        'UPDATE now_vehicles SET last_maintenance=NULL,next_maintenance=NULL WHERE company_id=$1 AND id=$2',
        ['now', 'F9'],
      );
      const vehicles = await service.vehicles();
      assert.equal(vehicles.length, 8);
      assert.deepEqual(
        new Set(vehicles.map((vehicle) => vehicle.id)),
        new Set(['F9', 'F5', 'F4', 'F12', 'F13', 'F14', 'F15', 'NOW-MONTACARGA-01']),
      );
      const known = Object.fromEntries(vehicles.map((vehicle) => [vehicle.id, vehicle]));
      assert.equal(known.F12.last_maintenance, '2026-09-08');
      assert.equal(known.F12.next_maintenance, '2026-12-08');
      assert.equal(known.F13.last_maintenance, '2026-11-12');
      assert.equal(known.F13.next_maintenance, '2027-02-12');
      assert.equal(known.F14.last_maintenance, '2026-09-03');
      assert.equal(known.F14.next_maintenance, '2026-12-03');
      assert.equal(known.F15.last_maintenance, '2026-09-11');
      assert.equal(known.F15.next_maintenance, '2026-12-11');
      assert.equal(known['NOW-MONTACARGA-01'].last_maintenance, '2026-10-27');
      assert.equal(known['NOW-MONTACARGA-01'].next_maintenance, '2027-01-27');
      assert.equal(known.F9.next_maintenance, null);

      const providerRows = await service.providers();
      const provider = providerRows.find((item) => item.tax_id === '1-30-57318-2');
      assert.ok(provider?.certified);
      assert.ok(provider.services.includes('MANTENIMIENTO'));
      assert.ok(provider.services.includes('TRANSPORTE'));

      const yaifryn = await auth.authenticate({
        username: '07105563211',
        password: process.env.NOW_YAIFRYN_PASSWORD,
      });
      const yan = await auth.authenticate({
        username: '40214552362',
        password: process.env.NOW_YAN_PASSWORD,
      });
      const outsider = await auth.authenticate({
        username: '00000000000',
        password: 'not-a-valid-password',
      });
      assert.equal(yaifryn.status, 200);
      assert.equal(yan.status, 200);
      assert.equal(yaifryn.body.user.role, 'ADMINISTRADOR');
      assert.equal(outsider.status, 401);

      const today = todayInSantoDomingo();
      const next = addMonthsClamped(today, 3);
      const completed = await service.createMaintenance(
        {
          vehicleId: 'F9',
          requestDate: today,
          executionDate: today,
          maintenanceType: 'Mantenimiento preventivo',
          details: 'Servicio trimestral de prueba',
          cost: 1500,
          executionLocation: 'Proveedor certificado',
          providerId: provider.id,
          subcontracted: true,
          subcontractReason: 'SIN_UNIDADES_DISPONIBLES',
        },
        user,
      );
      assert.equal(completed.status, 'COMPLETADO');
      assert.equal(
        completed.next_maintenance.toISOString?.().slice(0, 10) || completed.next_maintenance,
        next,
      );
      const updatedF9 = (await service.vehicles()).find((vehicle) => vehicle.id === 'F9');
      assert.equal(updatedF9.last_maintenance, today);
      assert.equal(updatedF9.next_maintenance, next);
      assert.equal(completed.subcontracted, true);
      assert.equal(completed.subcontract_reason, 'SIN_UNIDADES_DISPONIBLES');

      await assert.rejects(
        () =>
          service.createMaintenance(
            {
              vehicleId: 'F5',
              requestDate: today,
              maintenanceType: 'Preventivo',
              details: 'No cert',
              subcontracted: true,
              subcontractReason: 'COSTO',
              providerId: 'not-certified',
              executionLocation: 'Taller no certificado',
            },
            user,
          ),
        /proveedores certificados/i,
      );

      await service.createRepair(
        {
          vehicleId: 'F9',
          repairDate: today,
          title: 'Reparación prueba',
          description: 'Descripción de reparación',
          cost: 275,
          warranty: '90 días',
          providerId: provider.id,
          subcontracted: true,
          subcontractReason: 'COSTO',
        },
        user,
      );
      await service.createFuel(
        {
          vehicleId: 'F9',
          recordDate: today,
          liters: 30,
          cost: 6000,
          mileage: 120000,
          dispenser: 'Prueba',
        },
        user,
      );
      await service.createAssignment(
        {
          vehicleId: 'F9',
          assignmentDate: today,
          assignedTo: 'Ruta de prueba',
          destination: 'Destino',
          providerId: provider.id,
          subcontracted: true,
          subcontractReason: 'COSTO',
        },
        user,
      );
      assert.ok((await service.repairs()).some((row) => row.vehicle_id === 'F9'));
      assert.ok((await service.fuel()).some((row) => row.vehicle_id === 'F9'));
      assert.ok(
        (await service.assignments()).some(
          (row) => row.vehicle_id === 'F9' && row.provider_certified,
        ),
      );

      await repository.query(
        'UPDATE now_vehicles SET next_maintenance=$1 WHERE company_id=$2 AND id=$3',
        [addDays(today, -2), 'now', 'F5'],
      );
      assert.ok(
        (await service.alerts()).some(
          (item) => item.vehicleId === 'F5' && item.status === 'VENCIDO',
        ),
      );
      await service.reschedule(
        'F5',
        {
          plannedDate: addDays(today, 20),
          providerId: provider.id,
          executionLocation: 'Taller certificado',
        },
        user,
      );
      assert.ok(
        !(await service.alerts()).some(
          (item) => item.vehicleId === 'F5' && item.status === 'VENCIDO',
        ),
      );
      assert.ok(
        (await service.maintenance()).some(
          (row) => row.vehicle_id === 'F5' && row.status === 'PROGRAMADO',
        ),
      );
      assert.ok((await service.auditLog()).length > 0);
    } finally {
      delete process.env.NOW_YAIFRYN_PASSWORD;
      delete process.env.NOW_YAN_PASSWORD;
      await repository.close();
    }
  },
);
