function anomalies(data) { return data.vehicles.filter(v => v.recentConsumption < v.baseConsumption*.85 || v.monthlyCost > 2500 || v.failures >= 5).map(v => {
  const consumption = Math.round((1-v.recentConsumption/v.baseConsumption)*100);
  const reasons=[]; if(consumption>=15) reasons.push(`consumo ${consumption}% inferior a su promedio histórico`); if(v.monthlyCost>2500) reasons.push(`costo mensual elevado ($${v.monthlyCost.toLocaleString()})`); if(v.failures>=5) reasons.push(`${v.failures} fallas registradas`);
  return {vehicleId:v.id, vehicle:`${v.brand} ${v.model}`, severity: v.status==='Fuera de servicio'||v.failures>=7?'Crítica':'Alta', reasons, message:`Posible anomalía detectada: ${v.id} presenta ${reasons.join(' y ')}.`};
}); }
module.exports = { anomalies };
