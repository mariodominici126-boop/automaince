// Adaptador temporal. Los servicios reciben este contrato, no fleetData.js directamente.
const store = require('../../data/mock/fleetData');
const collections = ['vehicles', 'drivers', 'maintenance', 'maintenanceOrders', 'repairs', 'parts', 'documents'];

function list(name) { return store[name] || []; }
function find(name, id) { return list(name).find((item) => item.id === id); }
function create(name, item) { list(name).unshift(item); return item; }
function update(name, id, changes) { const item = find(name, id); return item && Object.assign(item, changes); }

module.exports = { list, find, create, update, collections };
