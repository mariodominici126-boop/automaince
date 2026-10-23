const today = new Date();
const date = (days) => { const d = new Date(today); d.setDate(d.getDate() + days); return d.toISOString().slice(0, 10); };
module.exports = {
  vehicles: [
    { id:'V-014', plate:'ABC-142', brand:'Toyota', model:'Hilux', year:2021, type:'Camioneta', mileage:88420, status:'Activo', driver:'Carlos Méndez', acquired:'2021-03-12', lastMaintenance:date(-104), nextMaintenance:date(-14), maintenanceKm:10000, maintenanceMonths:6, monthlyCost:2860, failures:5, downtime:8 },
    { id:'V-022', plate:'CDE-778', brand:'Nissan', model:'Frontier', year:2020, type:'Camioneta', mileage:125980, status:'Mantenimiento', driver:'Laura Rojas', acquired:'2020-08-22', lastMaintenance:date(-195), nextMaintenance:date(-38), maintenanceKm:10000, maintenanceMonths:6, monthlyCost:3320, failures:7, downtime:13 },
    { id:'V-031', plate:'EFG-619', brand:'Ford', model:'Ranger', year:2023, type:'Camioneta', mileage:40120, status:'Activo', driver:'Ana Torres', acquired:'2023-02-10', lastMaintenance:date(-62), nextMaintenance:date(25), maintenanceKm:10000, maintenanceMonths:6, monthlyCost:1260, failures:1, downtime:1 },
    { id:'V-045', plate:'HIJ-305', brand:'Mitsubishi', model:'L200', year:2019, type:'Camioneta', mileage:167210, status:'Fuera de servicio', driver:'Jorge Lima', acquired:'2019-07-18', lastMaintenance:date(-240), nextMaintenance:date(-55), maintenanceKm:8000, maintenanceMonths:5, monthlyCost:4110, failures:9, downtime:26 },
    { id:'V-058', plate:'KLM-920', brand:'Chevrolet', model:'Colorado', year:2022, type:'Camioneta', mileage:72300, status:'Activo', driver:'María Flores', acquired:'2022-05-08', lastMaintenance:date(-81), nextMaintenance:date(18), maintenanceKm:12000, maintenanceMonths:6, monthlyCost:1890, failures:2, downtime:3 },
    { id:'V-063', plate:'NOP-481', brand:'Isuzu', model:'D-Max', year:2021, type:'Camioneta', mileage:95600, status:'Activo', driver:'Diego Pérez', acquired:'2021-11-03', lastMaintenance:date(-49), nextMaintenance:date(43), maintenanceKm:10000, maintenanceMonths:6, monthlyCost:1180, failures:1, downtime:0 }
  ],
  drivers: [{id:'D-01',name:'Carlos Méndez',status:'Activo'},{id:'D-02',name:'Laura Rojas',status:'Activo'},{id:'D-03',name:'Ana Torres',status:'Activo'}],
  maintenance: [
    {id:'M-100',vehicleId:'V-014',date:date(-104),mileage:82000,type:'Preventivo',description:'Cambio de aceite, filtros y revisión de frenos',parts:'Filtro de aceite',labor:180,cost:640,provider:'Taller Central',nextMaintenance:date(-14),responsible:'Carlos Méndez'},
    {id:'M-101',vehicleId:'V-022',date:date(-195),mileage:118000,type:'Correctivo',description:'Reparación de sistema de inyección',parts:'Inyectores',labor:420,cost:1380,provider:'Diesel Pro',nextMaintenance:date(-38),responsible:'Laura Rojas'},
    {id:'M-102',vehicleId:'V-031',date:date(-62),mileage:36500,type:'Preventivo',description:'Servicio programado',parts:'Aceite y filtro',labor:120,cost:390,provider:'Taller Central',nextMaintenance:date(25),responsible:'Ana Torres'}
  ],
  maintenanceOrders: [
    {id:'OM-101',vehicleId:'V-014',type:'Preventivo',description:'Servicio de 90.000 km',status:'PENDIENTE DE REVISIÓN',priority:'Alta',provider:'Taller Central',createdAt:date(-2),estimatedCost:640},
    {id:'OM-102',vehicleId:'V-022',type:'Correctivo',description:'Revisión de inyección diésel',status:'AUTORIZADA',priority:'Crítica',provider:'Diesel Pro',createdAt:date(-1),estimatedCost:1380},
    {id:'OM-103',vehicleId:'V-045',type:'Correctivo',description:'Diagnóstico de transmisión',status:'EN PROCESO',priority:'Crítica',provider:'Transmisiones Norte',createdAt:date(-5),estimatedCost:2400}
  ],
  repairs: [{id:'R-1',vehicleId:'V-014',date:date(-23),problem:'Falla de motor',diagnosis:'Inyectores desgastados',repair:'Limpieza y calibración',parts:'Kit de inyección',cost:880,downtime:2,priority:'Alta'},{id:'R-2',vehicleId:'V-045',date:date(-12),problem:'Falla de transmisión',diagnosis:'Desgaste interno',repair:'Pendiente de reparación',parts:'Kit transmisión',cost:2400,downtime:12,priority:'Crítica'}],
  parts: [{id:'P-01',name:'Filtro de aceite',code:'FIL-001',category:'Filtros',quantity:24,cost:18,provider:'Partes Andinas',compatible:'Toyota, Nissan',life:'10.000 km'}, {id:'P-02',name:'Pastillas de freno',code:'FRE-204',category:'Frenos',quantity:8,cost:75,provider:'Frenos Pro',compatible:'Ford, Hyundai',life:'35.000 km'}],
  documents: [{id:'DOC-1',vehicleId:'V-014',type:'Seguro',number:'SEG-2026-014',issued:date(-353),expires:date(12),status:'Próximo a vencer'},{id:'DOC-2',vehicleId:'V-022',type:'Inspección',number:'INS-2025-022',issued:date(-370),expires:date(-4),status:'Vencido'},{id:'DOC-3',vehicleId:'V-045',type:'Matrícula',number:'MAT-2019-045',issued:date(-180),expires:date(-19),status:'Vencido'}]
};
