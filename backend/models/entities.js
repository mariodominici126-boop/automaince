/** Modelos de dominio. La capa de datos puede sustituir el origen local sin afectar a servicios. */
const entity = (fields) => fields;
module.exports = {
  Vehicle: (data) => entity(data), Driver: (data) => entity(data), Maintenance: (data) => entity(data),
  Repair: (data) => entity(data), MaintenanceOrder: (data) => entity(data), Part: (data) => entity(data), FuelRecord: (data) => entity(data), Provider: (data) => entity(data), User: (data) => entity(data),
  Cost: (data) => entity(data), Document: (data) => entity(data), Alert: (data) => entity(data)
};
