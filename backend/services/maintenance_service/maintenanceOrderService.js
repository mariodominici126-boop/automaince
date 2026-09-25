const repository = require('../../../database/adapters/localRepository');
const STATES = ['CREADA', 'PENDIENTE DE REVISIÓN', 'AUTORIZADA', 'EN PROCESO', 'COMPLETADA', 'CERRADA'];

function list() { return repository.list('maintenanceOrders'); }
function create(input) {
  if (!input.vehicleId || !input.type || !input.description) throw new Error('Vehículo, tipo y descripción son obligatorios.');
  return repository.create('maintenanceOrders', {
    id: `OM-${String(list().length + 101).padStart(3, '0')}`,
    status: 'CREADA', createdAt: new Date().toISOString().slice(0, 10), priority: 'Media', ...input
  });
}
function advance(id) {
  const order = repository.find('maintenanceOrders', id);
  if (!order) return null;
  const next = STATES.indexOf(order.status) + 1;
  return next < STATES.length ? repository.update('maintenanceOrders', id, { status: STATES[next] }) : order;
}
module.exports = { STATES, list, create, advance };
