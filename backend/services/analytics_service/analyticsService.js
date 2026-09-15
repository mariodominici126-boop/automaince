function costBreakdown(data) {
  const maintenance = data.maintenance.reduce((s,x)=>s+x.cost,0);
  const fuel = data.fuel.reduce((s,x)=>s+x.cost,0);
  const repairs = data.repairs.reduce((s,x)=>s+x.cost,0);
  return { maintenance, fuel, repairs, parts: 468, other: 180, total: maintenance+fuel+repairs+648 };
}
function metrics(data) {
  const costs = costBreakdown(data); const active = data.vehicles.filter(v=>v.status==='Activo').length;
  const avgConsumption = data.vehicles.reduce((s,v)=>s+v.recentConsumption,0)/data.vehicles.length;
  return { active, maintenance:data.vehicles.filter(v=>v.status==='Mantenimiento').length, outOfService:data.vehicles.filter(v=>v.status==='Fuera de servicio').length, averageConsumption:+avgConsumption.toFixed(1), costs, monthly:[1450,1890,1710,2140,1980,2410], topCost:[...data.vehicles].sort((a,b)=>b.monthlyCost-a.monthlyCost).slice(0,5) };
}
module.exports = { costBreakdown, metrics };
