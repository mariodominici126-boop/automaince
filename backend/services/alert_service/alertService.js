const { anomalies } = require('../../../intelligence/anomaly_detection/anomalyService');
// Configuración local intercambiable por preferencias de la empresa en una futura base de datos.
const rules = { maintenanceDays: 30, documentDays: 30, highRepairCount: 5, highCost: 2500, enabled: { maintenance: true, documents: true, repairs: true, costs: true, anomalies: true, openOrders: true } };
const make = (id, type, level, vehicleId, reason, action) => ({ id, type, severity: level, level, vehicleId, date: new Date().toISOString().slice(0,10), reason, message: reason, status: 'ABIERTA', recommendedAction: action });
function alerts(data) {
  const now = Date.now(), list = [];
  data.vehicles.forEach(v => {
    const days = Math.ceil((new Date(v.nextMaintenance) - now) / 86400000);
    if (rules.enabled.maintenance && days < 0) list.push(make(`A-M-${v.id}`, 'Mantenimiento vencido', 'ROJO', v.id, `Mantenimiento vencido hace ${-days} días.`, 'Crear o priorizar una orden de mantenimiento.'));
    else if (rules.enabled.maintenance && days <= rules.maintenanceDays) list.push(make(`A-P-${v.id}`, 'Mantenimiento próximo', 'AMARILLO', v.id, `Mantenimiento programado en ${days} días.`, 'Programar el servicio y asignar un proveedor.'));
    if (rules.enabled.repairs && v.failures >= rules.highRepairCount) list.push(make(`A-R-${v.id}`, 'Reparaciones frecuentes', 'AMARILLO', v.id, `${v.failures} fallas registradas en el historial.`, 'Revisar fallas recurrentes y el plan preventivo.'));
    if (rules.enabled.costs && v.monthlyCost >= rules.highCost) list.push(make(`A-C-${v.id}`, 'Costo elevado', 'AMARILLO', v.id, `Costo mensual de $${v.monthlyCost.toLocaleString()}, superior al umbral.`, 'Validar costos y evaluar disponibilidad del vehículo.'));
  });
  if (rules.enabled.documents) data.documents.forEach(d => { const days = Math.ceil((new Date(d.expires) - now) / 86400000); if (days <= 0) list.push(make(`A-D-${d.id}`, 'Documento vencido', 'ROJO', d.vehicleId, `${d.type} vencido.`, 'Renovar el documento antes de operar el vehículo.')); else if (days <= rules.documentDays) list.push(make(`A-D-${d.id}`, 'Documento próximo a vencer', 'AMARILLO', d.vehicleId, `${d.type} vence en ${days} días.`, 'Iniciar el proceso de renovación.')); });
  if (rules.enabled.openOrders) data.maintenanceOrders.filter(o => !['COMPLETADA','CERRADA'].includes(o.status)).forEach(o => list.push(make(`A-O-${o.id}`, 'Orden sin cerrar', o.priority === 'Crítica' ? 'ROJO' : 'AMARILLO', o.vehicleId, `${o.id} continúa en estado ${o.status}.`, 'Revisar responsable, autorización y fecha comprometida.')));
  if (rules.enabled.anomalies) anomalies(data).forEach(a => list.push(make(`A-I-${a.vehicleId}`, 'Comportamiento operativo anormal', a.severity === 'Crítica' ? 'ROJO' : 'AMARILLO', a.vehicleId, a.message, 'Revisar el historial de mantenimiento, las reparaciones y los costos.')));
  return list;
}
module.exports = { alerts, rules };
