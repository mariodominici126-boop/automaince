const repository = require('../../../database/adapters/localRepository');
const STATES = ['CREADA', 'PENDIENTE DE REVISIÓN', 'AUTORIZADA', 'EN PROCESO', 'COMPLETADA', 'CERRADA'];

async function list(companyId = 'gtg') { return repository.list('maintenanceOrders', companyId); }
async function create(input, companyId = 'gtg') {
  if (!input.vehicleId || !input.type || !input.description) throw new Error('Vehículo, tipo y descripción son obligatorios.');
  return repository.create('maintenanceOrders', {
    id: `OM-${String(list(companyId).length + 101).padStart(3, '0')}`,
    status: 'CREADA', createdAt: new Date().toISOString().slice(0, 10), priority: 'Media', ...input
  }, companyId);
}
async function advance(id, companyId = 'gtg') {
  const order = await repository.find('maintenanceOrders', id, companyId);
  if (!order) return null;
  const next = STATES.indexOf(order.status) + 1;
  return next < STATES.length ? repository.update('maintenanceOrders', id, { status: STATES[next] }, companyId) : order;
}
module.exports = { STATES, list, create, advance };
