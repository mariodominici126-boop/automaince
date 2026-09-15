const today = new Date();
const date = (days) => { const d = new Date(today); d.setDate(d.getDate() + days); return d.toISOString().slice(0, 10); };
module.exports = {
  vehicles: [
    { id:'V-014', plate:'ABC-142', brand:'Toyota', model:'Hilux', year:2021, type:'Pickup', mileage:88420, status:'Activo', driver:'Carlos Méndez', acquired:'2021-03-12', lastMaintenance:date(-104), nextMaintenance:date(-14), maintenanceKm:10000, maintenanceMonths:6, baseConsumption:10.4, recentConsumption:8.5, monthlyCost:2860, failures:5, downtime:8 },
    { id:'V-022', plate:'CDE-778', brand:'Hyundai', model:'H-1', year:2020, type:'Van', mileage:125980, status:'Mantenimiento', driver:'Laura Rojas', acquired:'2020-08-22', lastMaintenance:date(-195), nextMaintenance:date(-38), maintenanceKm:10000, maintenanceMonths:6, baseConsumption:9.1, recentConsumption:7.4, monthlyCost:3320, failures:7, downtime:13 },
    { id:'V-031', plate:'EFG-619', brand:'Ford', model:'Ranger', year:2023, type:'Pickup', mileage:40120, status:'Activo', driver:'Ana Torres', acquired:'2023-02-10', lastMaintenance:date(-62), nextMaintenance:date(25), maintenanceKm:10000, maintenanceMonths:6, baseConsumption:10.8, recentConsumption:10.5, monthlyCost:1260, failures:1, downtime:1 },
    { id:'V-045', plate:'HIJ-305', brand:'Mercedes', model:'Sprinter', year:2019, type:'Van', mileage:167210, status:'Fuera de servicio', driver:'Jorge Lima', acquired:'2019-07-18', lastMaintenance:date(-240), nextMaintenance:date(-55), maintenanceKm:8000, maintenanceMonths:5, baseConsumption:8.6, recentConsumption:6.6, monthlyCost:4110, failures:9, downtime:26 },
    { id:'V-058', plate:'KLM-920', brand:'Chevrolet', model:'NPR', year:2022, type:'Camión', mileage:72300, status:'Activo', driver:'María Flores', acquired:'2022-05-08', lastMaintenance:date(-81), nextMaintenance:date(18), maintenanceKm:12000, maintenanceMonths:6, baseConsumption:6.9, recentConsumption:6.8, monthlyCost:1890, failures:2, downtime:3 },
    { id:'V-063', plate:'NOP-481', brand:'Nissan', model:'Frontier', year:2021, type:'Pickup', mileage:95600, status:'Activo', driver:'Diego Pérez', acquired:'2021-11-03', lastMaintenance:date(-49), nextMaintenance:date(43), maintenanceKm:10000, maintenanceMonths:6, baseConsumption:10.2, recentConsumption:10.0, monthlyCost:1180, failures:1, downtime:0 }
  ],
  drivers: [{id:'D-01',name:'Carlos Méndez',status:'Activo'},{id:'D-02',name:'Laura Rojas',status:'Activo'},{id:'D-03',name:'Ana Torres',status:'Activo'}],
  maintenance: [
    {id:'M-100',vehicleId:'V-014',date:date(-104),mileage:82000,type:'Preventivo',description:'Cambio de aceite, filtros y revisión de frenos',parts:'Filtro de aceite',labor:180,cost:640,provider:'Taller Central',nextMaintenance:date(-14),responsible:'Carlos Méndez'},
    {id:'M-101',vehicleId:'V-022',date:date(-195),mileage:118000,type:'Correctivo',description:'Reparación de sistema de inyección',parts:'Inyectores',labor:420,cost:1380,provider:'Diesel Pro',nextMaintenance:date(-38),responsible:'Laura Rojas'},
    {id:'M-102',vehicleId:'V-031',date:date(-62),mileage:36500,type:'Preventivo',description:'Servicio programado',parts:'Aceite y filtro',labor:120,cost:390,provider:'Taller Central',nextMaintenance:date(25),responsible:'Ana Torres'}
  ],
  fuel: [
    {id:'F-1',vehicleId:'V-014',date:date(-5),mileage:88020,liters:67,cost:402,pricePerLiter:6,provider:'Estación Norte'},
    {id:'F-2',vehicleId:'V-014',date:date(-17),mileage:87500,liters:71,cost:426,pricePerLiter:6,provider:'Estación Norte'},
    {id:'F-3',vehicleId:'V-031',date:date(-4),mileage:40010,liters:45,cost:270,pricePerLiter:6,provider:'Energía Sur'},
    {id:'F-4',vehicleId:'V-058',date:date(-6),mileage:72010,liters:84,cost:504,pricePerLiter:6,provider:'Estación Norte'}
  ],
  repairs: [{id:'R-1',vehicleId:'V-014',date:date(-23),problem:'Consumo elevado',diagnosis:'Inyectores desgastados',repair:'Limpieza y calibración',parts:'Kit de inyección',cost:880,downtime:2,priority:'Alta'},{id:'R-2',vehicleId:'V-045',date:date(-12),problem:'Falla de transmisión',diagnosis:'Desgaste interno',repair:'Pendiente de reparación',parts:'Kit transmisión',cost:2400,downtime:12,priority:'Crítica'}],
  parts: [{id:'P-01',name:'Filtro de aceite',code:'FIL-001',category:'Filtros',quantity:24,cost:18,provider:'Partes Andinas',compatible:'Toyota, Nissan',life:'10.000 km'}, {id:'P-02',name:'Pastillas de freno',code:'FRE-204',category:'Frenos',quantity:8,cost:75,provider:'Frenos Pro',compatible:'Ford, Hyundai',life:'35.000 km'}],
  documents: [{id:'DOC-1',vehicleId:'V-014',type:'Seguro',expires:date(12)},{id:'DOC-2',vehicleId:'V-022',type:'Inspección',expires:date(-4)},{id:'DOC-3',vehicleId:'V-045',type:'Matrícula',expires:date(-19)}]
};
