function anomalies(data) { return data.vehicles.filter(v => v.monthlyCost > 2500 || v.failures >= 5).map(v => {
  const reasons=[]; if(v.monthlyCost>2500) reasons.push(`costo mensual elevado ($${v.monthlyCost.toLocaleString()})`); if(v.failures>=5) reasons.push(`${v.failures} fallas registradas`);
  return {vehicleId:v.id, vehicle:`${v.brand} ${v.model}`, severity: v.status==='Fuera de servicio'||v.failures>=7?'Crítica':'Alta', reasons, message:`Posible anomalía detectada: ${v.id} presenta ${reasons.join(' y ')}.`};
}); }
module.exports = { anomalies };
