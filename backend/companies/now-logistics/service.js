const { randomUUID } = require('crypto');
const db = require('../../../database/adapters/postgresRepository');
const { todayInSantoDomingo, addMonthsClamped } = require('../printpilot/dateUtils');

const COMPANY = 'now';
const dateString = (value) => value?.toISOString?.().slice(0, 10) || value || null;
const actorId = (user) => user?.id || 'NOW-SYSTEM';
const clean = (value) => String(value ?? '').trim();

async function transaction(work) {
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    const result = await work(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

function audit(client, user, action, entityType, entityId, before, after) {
  return client.query(
    `INSERT INTO audit_log(company_id,actor_id,actor_name,action,entity_type,entity_id,before_state,after_state)
     VALUES($1,$2,$3,$4,$5,$6,$7::jsonb,$8::jsonb)`,
    [
      COMPANY,
      actorId(user),
      user?.displayName || 'Sistema NOW Logistics',
      action,
      entityType,
      String(entityId),
      before ? JSON.stringify(before) : null,
      after ? JSON.stringify(after) : null,
    ],
  );
}

function id(value) {
  const result = String(value || '');
  if (!/^[A-Za-z0-9][A-Za-z0-9_-]{0,99}$/.test(result))
    throw new Error('El identificador no tiene un formato válido.');
  return result;
}

function date(value, label, required = false) {
  if (!value && !required) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || '')))
    throw new Error(`${label} es obligatoria y debe tener una fecha válida.`);
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value)
    throw new Error(`${label} no es válida.`);
  return value;
}

async function providers() {
  return (
    await db.query(
      `SELECT id,name,tax_id,certified,services,active FROM now_providers
       WHERE company_id=$1 AND active=true ORDER BY name`,
      [COMPANY],
    )
  ).rows;
}

async function vehicles() {
  const { rows } = await db.query(
    `SELECT v.*,
      (SELECT count(*) FROM now_maintenance_records m WHERE m.company_id=v.company_id AND m.vehicle_id=v.id) maintenance_count,
      (SELECT count(*) FROM now_repairs r WHERE r.company_id=v.company_id AND r.vehicle_id=v.id) repair_count
     FROM now_vehicles v WHERE v.company_id=$1 ORDER BY
      CASE WHEN v.id ~ '^F[0-9]+$' THEN substring(v.id from 2)::integer ELSE 999 END, v.id`,
    [COMPANY],
  );
  return rows.map((row) => ({
    ...row,
    last_maintenance: dateString(row.last_maintenance),
    next_maintenance: dateString(row.next_maintenance),
  }));
}

async function updateVehicle(vehicleIdValue, input, user) {
  const vehicleId = id(vehicleIdValue);
  const brand = clean(input.brand),
    model = clean(input.model);
  const allowedStatuses = new Set(['ACTIVO', 'MANTENIMIENTO', 'FUERA DE SERVICIO']);
  const status = clean(input.status || 'ACTIVO');
  if (!allowedStatuses.has(status)) throw new Error('Estado de unidad no válido.');
  return transaction(async (client) => {
    const before = await client.query(
      'SELECT * FROM now_vehicles WHERE company_id=$1 AND id=$2 FOR UPDATE',
      [COMPANY, vehicleId],
    );
    if (!before.rowCount) throw new Error('Vehículo no encontrado.');
    const { rows } = await client.query(
      `UPDATE now_vehicles SET brand=$1,model=$2,status=$3,updated_at=now()
       WHERE company_id=$4 AND id=$5 RETURNING *`,
      [brand, model, status, COMPANY, vehicleId],
    );
    await audit(client, user, 'ACTUALIZAR', 'VEHICULO', vehicleId, before.rows[0], rows[0]);
    return rows[0];
  });
}

async function maintenance() {
  const { rows } = await db.query(
    `SELECT m.*,v.name vehicle_name,p.name provider_name,p.tax_id provider_tax_id,p.certified provider_certified
     FROM now_maintenance_records m JOIN now_vehicles v ON v.id=m.vehicle_id AND v.company_id=m.company_id
     LEFT JOIN now_providers p ON p.id=m.provider_id AND p.company_id=m.company_id
     WHERE m.company_id=$1 ORDER BY COALESCE(m.planned_date,m.request_date,m.execution_date) DESC NULLS LAST,m.created_at DESC`,
    [COMPANY],
  );
  return rows.map((row) => ({
    ...row,
    request_date: dateString(row.request_date),
    planned_date: dateString(row.planned_date),
    execution_date: dateString(row.execution_date),
    last_maintenance: dateString(row.last_maintenance),
    next_maintenance: dateString(row.next_maintenance),
  }));
}

async function repairs() {
  const { rows } = await db.query(
    `SELECT r.*,v.name vehicle_name,p.name provider_name,p.certified provider_certified
     FROM now_repairs r JOIN now_vehicles v ON v.id=r.vehicle_id AND v.company_id=r.company_id
     LEFT JOIN now_providers p ON p.id=r.provider_id AND p.company_id=r.company_id
     WHERE r.company_id=$1 ORDER BY r.repair_date DESC,r.created_at DESC`,
    [COMPANY],
  );
  return rows.map((row) => ({ ...row, repair_date: dateString(row.repair_date) }));
}

async function fuel() {
  const { rows } = await db.query(
    `SELECT f.*,v.name vehicle_name FROM now_fuel_records f
     JOIN now_vehicles v ON v.id=f.vehicle_id AND v.company_id=f.company_id
     WHERE f.company_id=$1 ORDER BY f.record_date DESC,f.created_at DESC`,
    [COMPANY],
  );
  return rows.map((row) => ({ ...row, record_date: dateString(row.record_date) }));
}

async function assignments() {
  const { rows } = await db.query(
    `SELECT a.*,v.name vehicle_name,p.name provider_name,p.certified provider_certified
     FROM now_transport_assignments a JOIN now_vehicles v ON v.id=a.vehicle_id AND v.company_id=a.company_id
     LEFT JOIN now_providers p ON p.id=a.provider_id AND p.company_id=a.company_id
     WHERE a.company_id=$1 ORDER BY a.assignment_date DESC,a.created_at DESC`,
    [COMPANY],
  );
  return rows.map((row) => ({ ...row, assignment_date: dateString(row.assignment_date) }));
}

async function certifiedProvider(client, providerId, serviceType) {
  if (!providerId) throw new Error('Selecciona un proveedor certificado.');
  const { rows } = await client.query(
    `SELECT id,name,certified,services FROM now_providers
     WHERE company_id=$1 AND id=$2 AND active=true`,
    [COMPANY, id(providerId)],
  );
  const provider = rows[0];
  if (!provider?.certified || !provider.services.includes(serviceType))
    throw new Error('Solo se permiten proveedores certificados para este servicio.');
  return provider;
}

function subcontractReason(input) {
  if (!input.subcontracted) return '';
  const reason = clean(input.subcontractReason);
  if (!['COSTO', 'SIN_UNIDADES_DISPONIBLES'].includes(reason))
    throw new Error(
      'Indica si la subcontratación se debe a costo o falta de unidades disponibles.',
    );
  return reason;
}

async function createMaintenance(input, user) {
  const vehicleId = id(input.vehicleId),
    requestDate = date(input.requestDate, 'La fecha de solicitud', true),
    executionDate = date(input.executionDate, 'La fecha de ejecución'),
    plannedDate = date(input.plannedDate, 'La fecha programada'),
    maintenanceType = clean(input.maintenanceType),
    details = clean(input.details),
    location = clean(input.executionLocation),
    cost = Number(input.cost || 0),
    isSubcontracted = Boolean(input.subcontracted),
    reason = subcontractReason(input);
  if (!maintenanceType || !details)
    throw new Error('Indica el tipo y el detalle del mantenimiento.');
  if (!Number.isFinite(cost) || cost < 0)
    throw new Error('El costo debe ser un número no negativo.');
  if (isSubcontracted && !location)
    throw new Error('Indica el lugar donde trabajará el proveedor externo.');

  return transaction(async (client) => {
    const found = await client.query(
      'SELECT * FROM now_vehicles WHERE company_id=$1 AND id=$2 FOR UPDATE',
      [COMPANY, vehicleId],
    );
    const vehicle = found.rows[0];
    if (!vehicle) throw new Error('Selecciona un vehículo válido de NOW Logistics.');
    let provider = null;
    if (isSubcontracted)
      provider = await certifiedProvider(client, input.providerId, 'MANTENIMIENTO');
    else if (input.providerId)
      provider = await certifiedProvider(client, input.providerId, 'MANTENIMIENTO');

    const nextMaintenance =
      date(input.nextMaintenance, 'La próxima fecha de mantenimiento') ||
      (executionDate ? addMonthsClamped(executionDate, 3) : plannedDate);
    const newStatus = executionDate ? 'COMPLETADO' : plannedDate ? 'PROGRAMADO' : 'SOLICITADO';
    const recordId = `NOW-MT-${randomUUID()}`;
    const result = await client.query(
      `INSERT INTO now_maintenance_records(
        id,company_id,vehicle_id,request_date,planned_date,execution_date,vehicle_type,brand,model,
        last_maintenance,next_maintenance,maintenance_type,details,provider_id,execution_location,
        status,subcontracted,subcontract_reason,cost,created_by
      ) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)
      RETURNING *`,
      [
        recordId,
        COMPANY,
        vehicleId,
        requestDate,
        plannedDate,
        executionDate,
        vehicle.vehicle_type,
        vehicle.brand,
        vehicle.model,
        executionDate || vehicle.last_maintenance,
        nextMaintenance,
        maintenanceType,
        details,
        provider?.id || null,
        location,
        newStatus,
        isSubcontracted,
        reason,
        cost,
        actorId(user),
      ],
    );
    if (executionDate || plannedDate) {
      const updated = await client.query(
        `UPDATE now_vehicles SET last_maintenance=COALESCE($1,last_maintenance),
          next_maintenance=COALESCE($2,next_maintenance),updated_at=now()
         WHERE company_id=$3 AND id=$4 RETURNING *`,
        [executionDate, nextMaintenance, COMPANY, vehicleId],
      );
      await audit(
        client,
        user,
        'ACTUALIZAR_FECHAS_MANTENIMIENTO',
        'VEHICULO',
        vehicleId,
        vehicle,
        updated.rows[0],
      );
    }
    await audit(client, user, 'CREAR', 'MANTENIMIENTO_NOW', recordId, null, result.rows[0]);
    return result.rows[0];
  });
}

async function createRepair(input, user) {
  const vehicleId = id(input.vehicleId),
    repairDate = date(input.repairDate, 'La fecha de reparación', true),
    title = clean(input.title),
    description = clean(input.description),
    cost = Number(input.cost),
    warranty = clean(input.warranty),
    isSubcontracted = Boolean(input.subcontracted),
    reason = subcontractReason(input);
  if (!title || !description)
    throw new Error('Indica el nombre y la descripción de la reparación.');
  if (!Number.isFinite(cost) || cost < 0)
    throw new Error('El costo debe ser un número no negativo.');
  if (isSubcontracted && !warranty) warranty = 'No indicada';
  return transaction(async (client) => {
    const vehicle = await client.query(
      'SELECT id FROM now_vehicles WHERE company_id=$1 AND id=$2',
      [COMPANY, vehicleId],
    );
    if (!vehicle.rowCount) throw new Error('Selecciona un vehículo válido de NOW Logistics.');
    let provider = null;
    if (input.providerId)
      provider = await certifiedProvider(client, input.providerId, 'MANTENIMIENTO');
    if (isSubcontracted && !provider)
      throw new Error('La reparación subcontratada requiere un proveedor certificado.');
    const repairId = `NOW-RP-${randomUUID()}`;
    const { rows } = await client.query(
      `INSERT INTO now_repairs(id,company_id,vehicle_id,repair_date,title,description,cost,warranty,provider_id,subcontracted,subcontract_reason,created_by)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
      [
        repairId,
        COMPANY,
        vehicleId,
        repairDate,
        title,
        description,
        cost,
        warranty,
        provider?.id || null,
        isSubcontracted,
        reason,
        actorId(user),
      ],
    );
    await audit(client, user, 'CREAR', 'REPARACION_NOW', repairId, null, rows[0]);
    return rows[0];
  });
}

async function createFuel(input, user) {
  const vehicleId = id(input.vehicleId),
    recordDate = date(input.recordDate, 'La fecha de combustible', true),
    liters = Number(input.liters),
    cost = Number(input.cost || 0),
    mileage = input.mileage === '' || input.mileage == null ? null : Number(input.mileage);
  if (!Number.isFinite(liters) || liters <= 0 || !Number.isFinite(cost) || cost < 0)
    throw new Error('Los litros deben ser mayores que cero y el costo no puede ser negativo.');
  if (mileage !== null && (!Number.isFinite(mileage) || mileage < 0))
    throw new Error('El kilometraje no es válido.');
  return transaction(async (client) => {
    const vehicle = await client.query(
      'SELECT id FROM now_vehicles WHERE company_id=$1 AND id=$2',
      [COMPANY, vehicleId],
    );
    if (!vehicle.rowCount) throw new Error('Selecciona un vehículo válido de NOW Logistics.');
    const recordId = `NOW-FUEL-${randomUUID()}`;
    const { rows } = await client.query(
      `INSERT INTO now_fuel_records(id,company_id,vehicle_id,record_date,liters,cost,mileage,dispenser,notes,created_by)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [
        recordId,
        COMPANY,
        vehicleId,
        recordDate,
        liters,
        cost,
        mileage,
        clean(input.dispenser),
        clean(input.notes),
        actorId(user),
      ],
    );
    await audit(client, user, 'REGISTRAR', 'COMBUSTIBLE_NOW', recordId, null, rows[0]);
    return rows[0];
  });
}

async function createAssignment(input, user) {
  const vehicleId = id(input.vehicleId),
    assignmentDate = date(input.assignmentDate, 'La fecha de asignación', true),
    assignedTo = clean(input.assignedTo),
    origin = clean(input.origin),
    destination = clean(input.destination),
    isSubcontracted = Boolean(input.subcontracted),
    reason = subcontractReason(input);
  if (!assignedTo || !destination)
    throw new Error('Indica a quién se asigna la unidad y el destino.');
  return transaction(async (client) => {
    const vehicle = await client.query(
      'SELECT id FROM now_vehicles WHERE company_id=$1 AND id=$2',
      [COMPANY, vehicleId],
    );
    if (!vehicle.rowCount) throw new Error('Selecciona un vehículo válido de NOW Logistics.');
    let provider = null;
    if (input.providerId)
      provider = await certifiedProvider(client, input.providerId, 'TRANSPORTE');
    if (isSubcontracted && !provider)
      throw new Error('El transporte subcontratado requiere un proveedor certificado.');
    const recordId = `NOW-AS-${randomUUID()}`;
    const { rows } = await client.query(
      `INSERT INTO now_transport_assignments(id,company_id,vehicle_id,assignment_date,assigned_to,origin,destination,details,provider_id,subcontracted,subcontract_reason,created_by)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
      [
        recordId,
        COMPANY,
        vehicleId,
        assignmentDate,
        assignedTo,
        origin,
        destination,
        clean(input.details),
        provider?.id || null,
        isSubcontracted,
        reason,
        actorId(user),
      ],
    );
    await audit(client, user, 'ASIGNAR', 'TRANSPORTE_NOW', recordId, null, rows[0]);
    return rows[0];
  });
}

async function addProvider(input, user) {
  const name = clean(input.name),
    taxId = clean(input.taxId),
    services = Array.isArray(input.services) ? input.services : [];
  if (!name || !taxId || !services.length)
    throw new Error('Completa nombre, RNC y servicios certificados.');
  if (!/^\d{1,3}-\d{2}-\d{5}-\d$/.test(taxId))
    throw new Error('El RNC debe tener el formato 1-30-12345-6.');
  const allowed = new Set(['MANTENIMIENTO', 'TRANSPORTE']);
  if (services.some((service) => !allowed.has(service)))
    throw new Error('Selecciona servicios permitidos.');
  const providerId = `NOW-PROVIDER-${randomUUID()}`;
  return transaction(async (client) => {
    const { rows } = await client.query(
      `INSERT INTO now_providers(id,company_id,name,tax_id,certified,services) VALUES($1,$2,$3,$4,$5,$6) RETURNING *`,
      [providerId, COMPANY, name, taxId, Boolean(input.certified), services],
    );
    await audit(client, user, 'CREAR', 'PROVEEDOR_NOW', providerId, null, rows[0]);
    return rows[0];
  });
}

async function alerts() {
  const today = todayInSantoDomingo();
  const horizon = addMonthsClamped(today, 1);
  const items = await vehicles();
  return items.flatMap((vehicle) => {
    if (!vehicle.next_maintenance)
      return [
        {
          id: `NO-DATE-${vehicle.id}`,
          vehicleId: vehicle.id,
          vehicleName: vehicle.name,
          dueDate: null,
          level: 'AMARILLO',
          status: 'SIN_FECHA',
          message: 'Falta registrar el último mantenimiento o la próxima fecha preventiva.',
        },
      ];
    if (vehicle.next_maintenance < today)
      return [
        {
          id: `OVERDUE-${vehicle.id}`,
          vehicleId: vehicle.id,
          vehicleName: vehicle.name,
          dueDate: vehicle.next_maintenance,
          level: 'ROJO',
          status: 'VENCIDO',
          message: `Mantenimiento vencido desde ${vehicle.next_maintenance}; reprográmalo y genera la solicitud.`,
        },
      ];
    if (vehicle.next_maintenance <= horizon)
      return [
        {
          id: `DUE-${vehicle.id}`,
          vehicleId: vehicle.id,
          vehicleName: vehicle.name,
          dueDate: vehicle.next_maintenance,
          level: 'AMARILLO',
          status: 'PROXIMO',
          message: `Mantenimiento próximo para ${vehicle.next_maintenance}.`,
        },
      ];
    return [];
  });
}

async function reschedule(vehicleIdValue, input, user) {
  const vehicleId = id(vehicleIdValue),
    plannedDate = date(input.plannedDate, 'La nueva fecha programada', true),
    providerId = input.providerId ? id(input.providerId) : null;
  return transaction(async (client) => {
    const found = await client.query(
      'SELECT * FROM now_vehicles WHERE company_id=$1 AND id=$2 FOR UPDATE',
      [COMPANY, vehicleId],
    );
    const vehicle = found.rows[0];
    if (!vehicle) throw new Error('Vehículo no encontrado.');
    let provider = null;
    if (providerId) provider = await certifiedProvider(client, providerId, 'MANTENIMIENTO');
    const requestDate = todayInSantoDomingo(),
      recordId = `NOW-MT-${randomUUID()}`;
    const { rows } = await client.query(
      `INSERT INTO now_maintenance_records(id,company_id,vehicle_id,request_date,planned_date,vehicle_type,brand,model,last_maintenance,next_maintenance,maintenance_type,details,provider_id,execution_location,status,created_by)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'Mantenimiento preventivo','Reprogramación de alerta vencida',$11,$12,'PROGRAMADO',$13) RETURNING *`,
      [
        recordId,
        COMPANY,
        vehicleId,
        requestDate,
        plannedDate,
        vehicle.vehicle_type,
        vehicle.brand,
        vehicle.model,
        vehicle.last_maintenance,
        plannedDate,
        provider?.id || null,
        clean(input.executionLocation),
        actorId(user),
      ],
    );
    const updated = await client.query(
      'UPDATE now_vehicles SET next_maintenance=$1,updated_at=now() WHERE company_id=$2 AND id=$3 RETURNING *',
      [plannedDate, COMPANY, vehicleId],
    );
    await audit(client, user, 'REPROGRAMAR', 'VEHICULO', vehicleId, vehicle, updated.rows[0]);
    await audit(client, user, 'CREAR', 'MANTENIMIENTO_NOW', recordId, null, rows[0]);
    return rows[0];
  });
}

async function dashboard() {
  const [allVehicles, allAlerts, allMaintenance, allRepairs, allFuel, allAssignments] =
    await Promise.all([vehicles(), alerts(), maintenance(), repairs(), fuel(), assignments()]);
  const today = todayInSantoDomingo(),
    horizon = addMonthsClamped(today, 1);
  return {
    vehicles: {
      total: allVehicles.length,
      active: allVehicles.filter((v) => v.status === 'ACTIVO').length,
    },
    maintenance: {
      total: allMaintenance.length,
      due: allVehicles.filter((v) => v.next_maintenance && v.next_maintenance <= horizon).length,
      overdue: allVehicles.filter((v) => v.next_maintenance && v.next_maintenance < today).length,
    },
    alerts: allAlerts,
    recentMaintenance: allMaintenance.slice(0, 5),
    recentRepairs: allRepairs.slice(0, 5),
    fuelCount: allFuel.length,
    assignmentCount: allAssignments.length,
  };
}

async function auditLog() {
  return (
    await db.query(
      `SELECT actor_name,action,entity_type,entity_id,before_state,after_state,created_at
     FROM audit_log WHERE company_id=$1 ORDER BY created_at DESC LIMIT 300`,
      [COMPANY],
    )
  ).rows;
}

module.exports = {
  vehicles,
  updateVehicle,
  maintenance,
  repairs,
  fuel,
  assignments,
  providers,
  dashboard,
  alerts,
  createMaintenance,
  createRepair,
  createFuel,
  createAssignment,
  addProvider,
  reschedule,
  auditLog,
};
