const { randomUUID } = require('crypto');
const nodemailer = require('nodemailer');
const db = require('../../../database/adapters/postgresRepository');

const COMPANY = 'printpilot';
const CATEGORIES = ['AIRES','IMPRESORAS','HORNO_SECADO','INFRAESTRUCTURA','CORTADORAS'];
const toJson = value => (typeof value === 'string' ? JSON.parse(value) : value);
const actorId = user => user?.id || 'PP-TECH-001';
const asDate = value => value ? new Date(value) : null;
const dateString = value => value?.toISOString?.().slice(0,10) || value;
const addMonths = (date, months) => { const next = new Date(`${date}T12:00:00Z`); next.setUTCMonth(next.getUTCMonth()+months); return next.toISOString().slice(0,10); };
function audit(client, user, action, kind, id, beforeState, afterState) {
  return client.query(`INSERT INTO audit_log(company_id,actor_id,actor_name,action,entity_type,entity_id,before_state,after_state)
    VALUES($1,$2,$3,$4,$5,$6,$7::jsonb,$8::jsonb)`, [COMPANY,actorId(user),user?.displayName || user?.name || 'Emmanuel',action,kind,String(id),beforeState?JSON.stringify(beforeState):null,afterState?JSON.stringify(afterState):null]);
}
async function listAssets(category) {
  const { rows } = await db.query(`SELECT * FROM assets WHERE company_id=$1 AND ($2::text IS NULL OR category=$2) ORDER BY category,name`,[COMPANY,category || null]);
  return rows.map(row => ({...row, technicalData:row.technical_data, acquiredOn:dateString(row.acquired_on),meterValue:Number(row.meter_value||0),meterUnit:row.meter_unit}));
}
async function addAsset(input,user) {
  if(!input.code?.trim()||!input.name?.trim()||!CATEGORIES.includes(input.category))throw new Error('Código, nombre y categoría válida son obligatorios.');
  const code=input.code.trim().toUpperCase(),id=`PP-${code}`;
  const {rows}=await db.query(`INSERT INTO assets(id,company_id,code,category,name,description,manufacturer,model,serial_number,acquired_on,location,department,responsible,criticality,operational_status,technical_data)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16::jsonb) RETURNING *`,[id,COMPANY,code,input.category,input.name.trim(),input.description||'',input.manufacturer||'',input.model||'',input.serialNumber||'',input.acquiredOn||null,input.location||'',input.department||'',input.responsible||'',input.criticality||'MEDIA',input.operationalStatus||'OPERATIVO',JSON.stringify(input.technicalData||{})]);
  await db.query(`INSERT INTO audit_log(company_id,actor_id,actor_name,action,entity_type,entity_id,after_state) VALUES($1,$2,$3,'CREAR','ACTIVO',$4,$5::jsonb)`,[COMPANY,actorId(user),user?.displayName||'Emmanuel',id,JSON.stringify(rows[0])]);return rows[0];
}
async function updateAsset(id, input, user) {
  const allowed = ['description','manufacturer','model','serialNumber','acquiredOn','location','department','responsible','criticality','operationalStatus','technicalData'];
  const cols = {serialNumber:'serial_number',acquiredOn:'acquired_on',operationalStatus:'operational_status',technicalData:'technical_data'};
  const current = await db.query('SELECT * FROM assets WHERE company_id=$1 AND id=$2',[COMPANY,id]);
  if (!current.rowCount) return null;
  const before = current.rows[0];
  const fields=[],values=[];
  for (const key of allowed) if (Object.hasOwn(input,key)) {
    const col=cols[key]||key.replace(/[A-Z]/g,c=>`_${c.toLowerCase()}`);
    values.push(key==='technicalData'?JSON.stringify(input[key]):input[key]);
    fields.push(`"${col}"=$${values.length}${key==='technicalData'?'::jsonb':''}`);
  }
  if (!fields.length) return before;
  values.push(id,COMPANY);
  const { rows } = await db.query(`UPDATE assets SET ${fields.join(',')},updated_at=now() WHERE id=$${values.length-1} AND company_id=$${values.length} RETURNING *`,values);
  await audit(db,user,'ACTUALIZAR','ACTIVO',id,before,rows[0]);
  return rows[0];
}
async function listTechnicians() {
  const { rows } = await db.query('SELECT id,username,name,national_id,company_name,role,active,created_at FROM technicians WHERE company_id=$1 ORDER BY name',[COMPANY]);
  return rows;
}
async function listAssetReadings(assetId) {
  if(!(await db.query('SELECT 1 FROM assets WHERE company_id=$1 AND id=$2',[COMPANY,assetId])).rowCount)throw new Error('El activo no pertenece a PrintPilot.');
  return (await db.query(`SELECT r.id,r.reading,r.unit,r.note,r.recorded_at,t.name technician_name
    FROM asset_readings r LEFT JOIN technicians t ON t.id=r.recorded_by WHERE r.company_id=$1 AND r.asset_id=$2 ORDER BY r.recorded_at DESC LIMIT 100`,[COMPANY,assetId])).rows;
}
async function addAssetReading(assetId,input,user) {
  const reading=Number(input.reading),unit=String(input.unit||'').trim().toUpperCase();
  if(!Number.isFinite(reading)||reading<0||!['HORAS','CICLOS','IMPRESIONES'].includes(unit))throw new Error('Lectura y unidad de uso válidas son obligatorias.');
  const client=await db.pool.connect();
  try {
    await client.query('BEGIN');
    const asset=await client.query('SELECT meter_value,meter_unit,name FROM assets WHERE company_id=$1 AND id=$2 FOR UPDATE',[COMPANY,assetId]);
    if(!asset.rowCount)throw new Error('El activo no pertenece a PrintPilot.');
    if(reading<Number(asset.rows[0].meter_value||0))throw new Error('La lectura no puede ser menor que la última registrada.');
    if(asset.rows[0].meter_unit&&asset.rows[0].meter_unit!==unit)throw new Error(`La unidad de lectura de este activo ya está configurada como ${asset.rows[0].meter_unit}.`);
    const {rows}=await client.query(`INSERT INTO asset_readings(company_id,asset_id,reading,unit,recorded_by,note)
      VALUES($1,$2,$3,$4,$5,$6) RETURNING *`,[COMPANY,assetId,reading,unit,actorId(user),input.note||'']);
    await client.query('UPDATE assets SET meter_value=$1,meter_unit=$2,updated_at=now() WHERE id=$3 AND company_id=$4',[reading,unit,assetId,COMPANY]);
    const duePlans=await client.query(`SELECT p.id plan_id,p.name,p.usage_interval,p.usage_unit,pa.next_usage_due FROM maintenance_plans p
      JOIN plan_assets pa ON pa.plan_id=p.id WHERE p.company_id=$1 AND p.active=true AND pa.asset_id=$2 AND p.usage_interval IS NOT NULL AND pa.next_usage_due <= $3 FOR UPDATE OF pa`,[COMPANY,assetId,reading]);
    for(const plan of duePlans.rows){
      const firstDue=Number(plan.next_usage_due),interval=Number(plan.usage_interval);let nextDue=firstDue;
      while(nextDue<=reading)nextDue+=interval;
      const clean=value=>String(value).replace(/[^0-9.]/g,'_');
      const orderId=`PP-OT-${plan.plan_id}-${assetId}-U${clean(firstDue)}-${clean(nextDue-interval)}`;
      await client.query(`INSERT INTO work_orders(id,company_id,asset_id,plan_id,kind,description,status,planned_at,technician_id)
        VALUES($1,$2,$3,$4,'PREVENTIVO',$5,'PROGRAMADA',current_date,(SELECT assigned_to FROM maintenance_plans WHERE id=$4)) ON CONFLICT DO NOTHING`,[orderId,COMPANY,assetId,plan.plan_id,`Mantenimiento por ${plan.usage_unit||unit}: ${plan.name}. Lectura registrada: ${reading} ${unit}.`]);
      await client.query('UPDATE plan_assets SET next_usage_due=$1 WHERE plan_id=$2 AND asset_id=$3',[nextDue,plan.plan_id,assetId]);
    }
    await audit(client,user,'REGISTRAR_LECTURA','ACTIVO',assetId,asset.rows[0],{reading,unit,note:input.note||'',scheduledOrders:duePlans.rowCount});
    await client.query('COMMIT');return {...rows[0],scheduledOrders:duePlans.rowCount};
  }catch(error){await client.query('ROLLBACK');throw error}finally{client.release()}
}
async function addTechnician(input,user) {
  if (!input.name?.trim() || !input.nationalId?.trim() || !input.companyName?.trim()) throw new Error('Nombre, cédula y empresa son obligatorios.');
  const id=`PP-TECH-${randomUUID()}`;
  const { rows }=await db.query(`INSERT INTO technicians(id,company_id,username,name,national_id,company_name,password_hash,role)
    VALUES($1,$2,$3,$4,$5,$6,'disabled','TECNICO') RETURNING id,username,name,national_id,company_name,role,active`,
  [id,COMPANY,input.username?.trim()||id,input.name.trim(),input.nationalId.trim(),input.companyName.trim()]);
  await db.query(`INSERT INTO audit_log(company_id,actor_id,actor_name,action,entity_type,entity_id,after_state)
    VALUES($1,$2,$3,'CREAR','TECNICO',$4,$5::jsonb)`,[COMPANY,actorId(user),user?.displayName||'Emmanuel',id,JSON.stringify(rows[0])]);
  return rows[0];
}
async function updateTechnician(id,input,user) {
  if(!input.name?.trim()||!input.nationalId?.trim()||!input.companyName?.trim())throw new Error('Nombre, cédula y empresa son obligatorios.');
  const before=await db.query('SELECT id,username,name,national_id,company_name,role,active FROM technicians WHERE company_id=$1 AND id=$2',[COMPANY,id]);if(!before.rowCount)return null;
  const {rows}=await db.query(`UPDATE technicians SET name=$1,national_id=$2,company_name=$3 WHERE company_id=$4 AND id=$5
    RETURNING id,username,name,national_id,company_name,role,active`,[input.name.trim(),input.nationalId.trim(),input.companyName.trim(),COMPANY,id]);
  await db.query(`INSERT INTO audit_log(company_id,actor_id,actor_name,action,entity_type,entity_id,before_state,after_state)
    VALUES($1,$2,$3,'ACTUALIZAR','TECNICO',$4,$5::jsonb,$6::jsonb)`,[COMPANY,actorId(user),user?.displayName||'Emmanuel',id,JSON.stringify(before.rows[0]),JSON.stringify(rows[0])]);return rows[0];
}
async function listPlans() {
  const { rows } = await db.query(`SELECT p.*,COALESCE(json_agg(pa.asset_id) FILTER(WHERE pa.asset_id IS NOT NULL),'[]') asset_ids
    FROM maintenance_plans p LEFT JOIN plan_assets pa ON pa.plan_id=p.id WHERE p.company_id=$1 GROUP BY p.id ORDER BY p.next_due_at,p.name`,[COMPANY]);
  return rows.map(r=>({...r,tasks:toJson(r.tasks),assetIds:r.asset_ids,nextDueAt:dateString(r.next_due_at)}));
}
async function createPlan(input,user) {
  if (!input.name?.trim() || !Array.isArray(input.assetIds) || !input.assetIds.length || !Array.isArray(input.tasks) || !input.tasks.some(t=>String(t.label||t).trim())) throw new Error('Nombre, activos y al menos una tarea son obligatorios.');
  const intervalMonths=Number(input.intervalMonths)||null,intervalDays=Number(input.intervalDays)||null,usageInterval=Number(input.usageInterval)||null;
  if ((!intervalMonths&&!intervalDays&&!usageInterval)||intervalMonths<0||intervalDays<0||usageInterval<0) throw new Error('Defina una frecuencia por días, meses o unidad de uso.');
  if(intervalMonths&&intervalDays)throw new Error('Elija una frecuencia de calendario: días o meses.');
  if(usageInterval&&!['HORAS','CICLOS','IMPRESIONES'].includes(input.usageUnit))throw new Error('Elija la unidad de uso del plan.');
  if(input.technicianId&&!(await db.query('SELECT 1 FROM technicians WHERE company_id=$1 AND id=$2',[COMPANY,input.technicianId])).rowCount)throw new Error('El técnico no pertenece a PrintPilot.');
  const id=`PP-PLAN-${randomUUID()}`,client=await db.pool?.connect?.();
  if (!client) {
    const { rows }=await db.query(`INSERT INTO maintenance_plans(id,company_id,name,category,interval_months,interval_days,usage_interval,usage_unit,next_due_at,tasks,created_by,assigned_to)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb,$11,$12) RETURNING *`,[id,COMPANY,input.name.trim(),input.category||'',intervalMonths,intervalDays,usageInterval,input.usageUnit||null,input.nextDueAt||null,JSON.stringify(input.tasks),actorId(user),input.technicianId||null]);
    for (const assetId of input.assetIds) {
      const asset=await db.query('SELECT meter_value,meter_unit FROM assets WHERE company_id=$1 AND id=$2',[COMPANY,assetId]);
      if(!asset.rowCount)throw new Error('Uno de los activos no pertenece a PrintPilot.');
      if(usageInterval&&asset.rows[0].meter_unit&&asset.rows[0].meter_unit!==input.usageUnit)throw new Error('La unidad del plan debe coincidir con la unidad de lectura actual del activo.');
      await db.query('INSERT INTO plan_assets(plan_id,asset_id,next_usage_due) VALUES($1,$2,$3)',[id,assetId,usageInterval?Number(asset.rows[0].meter_value||0)+usageInterval:null]);
    }
    await db.query(`INSERT INTO audit_log(company_id,actor_id,actor_name,action,entity_type,entity_id,after_state) VALUES($1,$2,$3,'CREAR','PLAN',$4,$5::jsonb)`,[COMPANY,actorId(user),user?.displayName||'Emmanuel',id,JSON.stringify(rows[0])]);
    return rows[0];
  }
  try {
    await client.query('BEGIN');
    const { rows }=await client.query(`INSERT INTO maintenance_plans(id,company_id,name,category,interval_months,interval_days,usage_interval,usage_unit,next_due_at,tasks,created_by,assigned_to)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb,$11,$12) RETURNING *`,[id,COMPANY,input.name.trim(),input.category||'',intervalMonths,intervalDays,usageInterval,input.usageUnit||null,input.nextDueAt||null,JSON.stringify(input.tasks),actorId(user),input.technicianId||null]);
    for (const assetId of input.assetIds) {
      const asset=await client.query('SELECT meter_value,meter_unit FROM assets WHERE company_id=$1 AND id=$2',[COMPANY,assetId]);
      if(!asset.rowCount)throw new Error('Uno de los activos no pertenece a PrintPilot.');
      if(usageInterval&&asset.rows[0].meter_unit&&asset.rows[0].meter_unit!==input.usageUnit)throw new Error('La unidad del plan debe coincidir con la unidad de lectura actual del activo.');
      await client.query('INSERT INTO plan_assets(plan_id,asset_id,next_usage_due) VALUES($1,$2,$3)',[id,assetId,usageInterval?Number(asset.rows[0].meter_value||0)+usageInterval:null]);
    }
    await audit(client,user,'CREAR','PLAN',id,null,rows[0]);
    await client.query('COMMIT'); return rows[0];
  } catch(error) { await client.query('ROLLBACK'); throw error; } finally { client.release(); }
}
async function generateScheduledOrders() {
  const plans = await db.query(`SELECT p.*,pa.asset_id FROM maintenance_plans p JOIN plan_assets pa ON pa.plan_id=p.id
    WHERE p.company_id=$1 AND p.active=true AND p.next_due_at IS NOT NULL AND p.next_due_at <= current_date + 30`,[COMPANY]);
  for (const plan of plans.rows) {
    const orderId=`PP-OT-${plan.id}-${plan.asset_id}-${String(plan.next_due_at).replaceAll('-','')}`;
    const {rows:assetRows}=await db.query('SELECT name FROM assets WHERE id=$1',[plan.asset_id]);
    await db.query(`INSERT INTO work_orders(id,company_id,asset_id,plan_id,kind,description,status,planned_at,technician_id)
      VALUES($1,$2,$3,$4,'PREVENTIVO',$5,'PROGRAMADA',$6,$7) ON CONFLICT DO NOTHING`,[orderId,COMPANY,plan.asset_id,plan.id,`Mantenimiento programado: ${plan.name}${assetRows[0]?` · ${assetRows[0].name}`:''}`,dateString(plan.next_due_at),plan.assigned_to||null]);
    const interval=plan.interval_months ? Number(plan.interval_months) : 0;
    if (interval) {
      let next=dateString(plan.next_due_at);
      while (next <= new Date(Date.now()+30*86400000).toISOString().slice(0,10)) next=addMonths(next,interval);
      if (next!==dateString(plan.next_due_at)) await db.query('UPDATE maintenance_plans SET next_due_at=$1 WHERE id=$2',[next,plan.id]);
    } else if (plan.interval_days) {
      const nextDate=new Date(`${dateString(plan.next_due_at)}T12:00:00Z`);
      while (nextDate.toISOString().slice(0,10) <= new Date(Date.now()+30*86400000).toISOString().slice(0,10)) nextDate.setUTCDate(nextDate.getUTCDate()+Number(plan.interval_days));
      await db.query('UPDATE maintenance_plans SET next_due_at=$1 WHERE id=$2',[nextDate.toISOString().slice(0,10),plan.id]);
    }
  }
}
async function listOrders(from,to) {
  await generateScheduledOrders();
  const {rows}=await db.query(`SELECT o.*,a.code asset_code,a.name asset_name,t.name technician_name,p.tasks
    FROM work_orders o JOIN assets a ON a.id=o.asset_id LEFT JOIN technicians t ON t.id=o.technician_id LEFT JOIN maintenance_plans p ON p.id=o.plan_id
    WHERE o.company_id=$1 AND ($2::date IS NULL OR o.planned_at >= $2) AND ($3::date IS NULL OR o.planned_at < $3)
    ORDER BY o.planned_at,a.name`,[COMPANY,from||null,to||null]);
  return rows.map(r=>({...r,tasks:toJson(r.tasks||[]),plannedAt:dateString(r.planned_at),startedAt:r.started_at,completedAt:r.completed_at}));
}
async function dashboard() {
  const now=new Date(),weekEnd=new Date(now); weekEnd.setDate(weekEnd.getDate()+7);
  const monthEnd=new Date(now); monthEnd.setDate(monthEnd.getDate()+30);
  const [week,month]=await Promise.all([listOrders(now.toISOString().slice(0,10),weekEnd.toISOString().slice(0,10)),listOrders(now.toISOString().slice(0,10),monthEnd.toISOString().slice(0,10))]);
  const [{rows:counts},{rows:totals}]=await Promise.all([
    db.query(`SELECT count(*) FILTER(WHERE status='PROGRAMADA') scheduled,count(*) FILTER(WHERE status='EN PROCESO') in_progress,count(*) FILTER(WHERE status='COMPLETADA') completed,count(*) FILTER(WHERE status NOT IN('COMPLETADA','CANCELADA') AND planned_at<current_date) overdue FROM work_orders WHERE company_id=$1`,[COMPANY]),
    db.query(`SELECT count(*) total,count(*) FILTER(WHERE operational_status='OPERATIVO') operating FROM assets WHERE company_id=$1`,[COMPANY]),
  ]);
  return {counts:counts[0],assets:totals[0],week,month};
}
async function listMaintenance() {
  const {rows}=await db.query(`SELECT m.*,a.code asset_code,a.name asset_name,t.name technician_name FROM maintenance_records m
    JOIN assets a ON a.id=m.asset_id LEFT JOIN technicians t ON t.id=m.technician_id WHERE m.company_id=$1 ORDER BY m.completed_at DESC NULLS LAST,m.created_at DESC`,[COMPANY]);
  return rows.map(r=>({...r,checklist:toJson(r.checklist),materials:toJson(r.materials),plannedAt:dateString(r.planned_at)}));
}
async function completeOrder(input,user) {
  if (!input.orderId) throw new Error('Seleccione una orden programada.');
  const client=await db.pool.connect();
  try {
    await client.query('BEGIN');
    const found=await client.query(`SELECT o.*,p.tasks FROM work_orders o LEFT JOIN maintenance_plans p ON p.id=o.plan_id WHERE o.company_id=$1 AND o.id=$2 FOR UPDATE`,[COMPANY,input.orderId]);
    if (!found.rowCount) throw new Error('No se encontró la orden.');
    const order=found.rows[0],tasks=toJson(order.tasks||[]),checked=Array.isArray(input.checklist)?input.checklist:[];
    if(order.status==='COMPLETADA')throw new Error('Esta orden ya está completada y registrada en el historial.');
    const hasIncompleteTasks=tasks.some(task=>{
      const label=typeof task==='string'?task:task.label;
      return !checked.some(done=>done.label===label&&done.done===true);
    });
    if (hasIncompleteTasks) throw new Error('Complete todas las tareas obligatorias de la lista antes de cerrar el mantenimiento.');
    const id=`PP-MT-${randomUUID()}`;
    const values=[id,COMPANY,input.orderId,order.asset_id,order.plan_id,order.kind,'COMPLETADA',order.planned_at,input.startedAt||null,new Date().toISOString(),actorId(user),JSON.stringify(checked),input.observations||'',input.findings||'',input.recommendations||'',JSON.stringify(input.materials||[]),Number(input.laborHours||0),Number(input.laborCost||0),Number(input.totalCost||0),input.description||order.description];
    const {rows}=await client.query(`INSERT INTO maintenance_records(id,company_id,work_order_id,asset_id,plan_id,kind,status,planned_at,started_at,completed_at,technician_id,checklist,observations,findings,recommendations,materials,labor_hours,labor_cost,total_cost,description)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12::jsonb,$13,$14,$15,$16::jsonb,$17,$18,$19,$20) RETURNING *`,values);
    await client.query("UPDATE work_orders SET status='COMPLETADA',completed_at=now(),started_at=COALESCE(started_at,$1),technician_id=$2 WHERE id=$3",[input.startedAt||new Date().toISOString(),actorId(user),input.orderId]);
    await audit(client,user,'COMPLETAR','MANTENIMIENTO',id,null,rows[0]);
    await client.query('COMMIT'); return rows[0];
  } catch(error) { await client.query('ROLLBACK'); throw error; } finally { client.release(); }
}
async function createCountermeasure(input,user) {
  if (!input.assetId || !input.title?.trim() || !input.issue?.trim()) throw new Error('Activo, título y hallazgo son obligatorios.');
  const asset=await db.query('SELECT 1 FROM assets WHERE company_id=$1 AND id=$2',[COMPANY,input.assetId]);if(!asset.rowCount)throw new Error('El activo no pertenece a PrintPilot.');
  if(input.technicianId&&!(await db.query('SELECT 1 FROM technicians WHERE company_id=$1 AND id=$2',[COMPANY,input.technicianId])).rowCount)throw new Error('El técnico no pertenece a PrintPilot.');
  const id=`PP-CM-${randomUUID()}`;
  const {rows}=await db.query(`INSERT INTO countermeasures(id,company_id,asset_id,title,status,priority,issue,root_cause,action_taken,electronic_changes,parts,checklist,technician_id,provider,planned_at,labor_hours,labor_cost,parts_cost,total_cost,notes)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::jsonb,$12::jsonb,$13,$14,$15,$16,$17,$18,$19,$20) RETURNING *`,
  [id,COMPANY,input.assetId,input.title.trim(),input.status||'PENDIENTE',input.priority||'MEDIA',input.issue.trim(),input.rootCause||'',input.actionTaken||'',input.electronicChanges||'',JSON.stringify(input.parts||[]),JSON.stringify(input.checklist||[]),input.technicianId||actorId(user),input.provider||'',input.plannedAt||null,Number(input.laborHours||0),Number(input.laborCost||0),Number(input.partsCost||0),Number(input.totalCost||0),input.notes||'']);
  await db.query(`INSERT INTO audit_log(company_id,actor_id,actor_name,action,entity_type,entity_id,after_state) VALUES($1,$2,$3,'CREAR','CONTRAMEDIDA',$4,$5::jsonb)`,[COMPANY,actorId(user),user?.displayName||'Emmanuel',id,JSON.stringify(rows[0])]);
  return rows[0];
}
async function listCountermeasures() {
  const {rows}=await db.query(`SELECT c.*,a.code asset_code,a.name asset_name,t.name technician_name FROM countermeasures c JOIN assets a ON a.id=c.asset_id LEFT JOIN technicians t ON t.id=c.technician_id WHERE c.company_id=$1 ORDER BY c.created_at DESC`,[COMPANY]);
  return rows.map(r=>({...r,parts:toJson(r.parts),checklist:toJson(r.checklist)}));
}
async function updateCountermeasure(id,input,user) {
  const editable=['status','priority','rootCause','actionTaken','electronicChanges','parts','checklist','technicianId','provider','plannedAt','startedAt','completedAt','laborHours','laborCost','partsCost','totalCost','notes'];
  const columns={rootCause:'root_cause',actionTaken:'action_taken',electronicChanges:'electronic_changes',technicianId:'technician_id',plannedAt:'planned_at',startedAt:'started_at',completedAt:'completed_at',laborHours:'labor_hours',laborCost:'labor_cost',partsCost:'parts_cost',totalCost:'total_cost'};
  const before=await db.query('SELECT * FROM countermeasures WHERE company_id=$1 AND id=$2',[COMPANY,id]);
  if(!before.rowCount)return null;
  if(input.technicianId&&!(await db.query('SELECT 1 FROM technicians WHERE company_id=$1 AND id=$2',[COMPANY,input.technicianId])).rowCount)throw new Error('El técnico no pertenece a PrintPilot.');
  const sets=[],values=[];
  for(const key of editable) if(Object.hasOwn(input,key)){const col=columns[key]||key.replace(/[A-Z]/g,c=>`_${c.toLowerCase()}`); values.push(['parts','checklist'].includes(key)?JSON.stringify(input[key]):key==='plannedAt'||key==='startedAt'||key==='completedAt'?input[key]||null:input[key]);sets.push(`"${col}"=$${values.length}${['parts','checklist'].includes(key)?'::jsonb':''}`)}
  if(!sets.length)return before.rows[0];
  values.push(id,COMPANY);const {rows}=await db.query(`UPDATE countermeasures SET ${sets.join(',')},updated_at=now() WHERE id=$${values.length-1} AND company_id=$${values.length} RETURNING *`,values);
  await db.query(`INSERT INTO audit_log(company_id,actor_id,actor_name,action,entity_type,entity_id,before_state,after_state) VALUES($1,$2,$3,'ACTUALIZAR','CONTRAMEDIDA',$4,$5::jsonb,$6::jsonb)`,[COMPANY,actorId(user),user?.displayName||'Emmanuel',id,JSON.stringify(before.rows[0]),JSON.stringify(rows[0])]);
  return rows[0];
}
async function listSupplies() {
  const {rows}=await db.query('SELECT * FROM supplies WHERE company_id=$1 ORDER BY kind,name',[COMPANY]);return rows;
}
async function recordSupplyMovement(id,input,user) {
  const quantity=Number(input.quantity); if(!Number.isFinite(quantity)||quantity<=0)throw new Error('La cantidad debe ser mayor que cero.');
  const type=input.movementType||'CONSUMO';if(!['ENTRADA','CONSUMO'].includes(type))throw new Error('Tipo de movimiento no válido.');
  const client=await db.pool.connect();
  try {
    await client.query('BEGIN');
    const found=await client.query('SELECT * FROM supplies WHERE id=$1 AND company_id=$2 FOR UPDATE',[id,COMPANY]);
    if(!found.rowCount)throw new Error('Insumo no encontrado.');
    const supply=found.rows[0],delta=type==='ENTRADA'?quantity:-quantity;
    if(input.countermeasureId&&!(await client.query('SELECT 1 FROM countermeasures WHERE company_id=$1 AND id=$2',[COMPANY,input.countermeasureId])).rowCount)throw new Error('La contramedida no pertenece a PrintPilot.');
    if(Number(supply.quantity)+delta<0)throw new Error('No hay existencia suficiente.');
    await client.query('UPDATE supplies SET quantity=quantity+$1,updated_at=now() WHERE id=$2',[delta,id]);
    const movementId=`PP-MV-${randomUUID()}`;
    await client.query('INSERT INTO supply_movements(id,company_id,supply_id,movement_type,quantity,unit_cost,countermeasure_id,technician_id,note) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)',[movementId,COMPANY,id,type,quantity,Number(input.unitCost||0),input.countermeasureId||null,actorId(user),input.note||'']);
    await audit(client,user,type,'INSUMO',id,supply,{...supply,quantity:Number(supply.quantity)+delta});
    await client.query('COMMIT');return {id:movementId,quantity:Number(supply.quantity)+delta};
  }catch(error){await client.query('ROLLBACK');throw error}finally{client.release()}
}
async function requestPurchase(id,input,user) {
  const quantity=Number(input.quantity);if(!Number.isFinite(quantity)||quantity<=0)throw new Error('Indique la cantidad que se va a solicitar.');
  const {rows}=await db.query('SELECT * FROM supplies WHERE id=$1 AND company_id=$2',[id,COMPANY]);if(!rows.length)throw new Error('Insumo no encontrado.');
  const supply=rows[0],recipient=process.env.PURCHASE_EMAIL||'printpilot@notions.com.do';
  let messageId=null,status='NO_REQUERIDO';
  if(supply.kind==='GAS') {
    const sender=process.env.GMAIL_USER,appPassword=process.env.GMAIL_APP_PASSWORD?.replace(/\s/g,'');
    if(!sender||!appPassword){const e=new Error('El envío a Compras no está listo. Configura GMAIL_USER y GMAIL_APP_PASSWORD localmente; no se registró el pedido de gas.');e.code='MAIL_NOT_CONFIGURED';throw e;}
    const transporter=nodemailer.createTransport({service:'gmail',auth:{user:sender,pass:appPassword}});
    try {
      const info=await transporter.sendMail({from:process.env.MAIL_FROM||sender,to:recipient,subject:`Solicitud de compra de gas · PrintPilot`,text:`Compras:\n\nSolicitamos ordenar ${quantity} ${supply.unit} de gas para PrintPilot.\nExistencia actual: ${supply.quantity} ${supply.unit}.\nSolicitante: ${user?.displayName||'Emmanuel'}.\nNota: ${input.note||'—'}\n\nEste aviso fue generado desde AutoMaince.`});
      messageId=info.messageId;status='ENVIADO';
    } catch { const e=new Error('Gmail no pudo enviar el aviso a Compras. El pedido de gas no se registró.');e.code='MAIL_SEND_FAILED';throw e; }
  }
  const idRequest=`PP-OC-${randomUUID()}`;
  await db.query(`INSERT INTO purchase_requests(id,company_id,supply_id,quantity,recipient,email_status,email_message_id,requested_by,note)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)`,[idRequest,COMPANY,id,quantity,recipient,status,messageId,actorId(user),input.note||'']);
  return {id:idRequest,emailStatus:status,recipient};
}
async function supplyMovements() { return (await db.query(`SELECT m.*,s.name supply_name,t.name technician_name FROM supply_movements m JOIN supplies s ON s.id=m.supply_id LEFT JOIN technicians t ON t.id=m.technician_id WHERE m.company_id=$1 ORDER BY m.created_at DESC LIMIT 200`,[COMPANY])).rows; }
async function documents() { return (await db.query(`SELECT id,asset_id,maintenance_record_id,countermeasure_id,name,document_type,original_filename,mime_type,size_bytes,uploaded_by,created_at FROM documents WHERE company_id=$1 ORDER BY created_at DESC`,[COMPANY])).rows; }
async function addDocument(input,user) {
  const allowedTypes=new Set(['application/pdf','image/png','image/jpeg','image/webp','text/plain','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/msword']);
  if(!input.name?.trim()||!input.filename||!input.mimeType||!input.contentBase64)throw new Error('Nombre y archivo son obligatorios.');
  if(!allowedTypes.has(input.mimeType))throw new Error('Tipo no permitido. Adjunte PDF, Word, texto o imagen.');
  const contents=Buffer.from(input.contentBase64,'base64');if(!contents.length||contents.length>8*1024*1024)throw new Error('El archivo está vacío o supera el máximo de 8 MB.');
  if(input.assetId && !(await db.query('SELECT 1 FROM assets WHERE company_id=$1 AND id=$2',[COMPANY,input.assetId])).rowCount)throw new Error('El activo no pertenece a PrintPilot.');
  if(input.countermeasureId && !(await db.query('SELECT 1 FROM countermeasures WHERE company_id=$1 AND id=$2',[COMPANY,input.countermeasureId])).rowCount)throw new Error('La contramedida no pertenece a PrintPilot.');
  if(input.maintenanceId && !(await db.query('SELECT 1 FROM maintenance_records WHERE company_id=$1 AND id=$2',[COMPANY,input.maintenanceId])).rowCount)throw new Error('El mantenimiento no pertenece a PrintPilot.');
  const id=`PP-DOC-${randomUUID()}`;
  const {rows}=await db.query(`INSERT INTO documents(id,company_id,asset_id,maintenance_record_id,countermeasure_id,name,document_type,original_filename,mime_type,size_bytes,contents,uploaded_by)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING id,name,document_type,original_filename,mime_type,size_bytes,asset_id,countermeasure_id,created_at`,[id,COMPANY,input.assetId||null,input.maintenanceId||null,input.countermeasureId||null,input.name.trim(),input.documentType||'GENERAL',input.filename,input.mimeType,contents.length,contents,actorId(user)]);
  await db.query(`INSERT INTO audit_log(company_id,actor_id,actor_name,action,entity_type,entity_id,after_state) VALUES($1,$2,$3,'ADJUNTAR','DOCUMENTO',$4,$5::jsonb)`,[COMPANY,actorId(user),user?.displayName||'Emmanuel',id,JSON.stringify(rows[0])]);return rows[0];
}
async function documentContent(id) { const {rows}=await db.query('SELECT original_filename,mime_type,contents FROM documents WHERE company_id=$1 AND id=$2',[COMPANY,id]);return rows[0]||null; }
async function report(filters={}) {
  const {rows}=await db.query(`SELECT m.id,m.kind,m.status,m.planned_at,m.started_at,m.completed_at,m.total_cost,m.labor_hours,m.description,a.code asset_code,a.name asset_name,a.category,a.location,t.name technician_name
    FROM maintenance_records m JOIN assets a ON a.id=m.asset_id LEFT JOIN technicians t ON t.id=m.technician_id
    WHERE m.company_id=$1 AND ($2::text IS NULL OR a.id=$2) AND ($3::date IS NULL OR COALESCE(m.completed_at::date,m.planned_at)>= $3)
    AND ($4::date IS NULL OR COALESCE(m.completed_at::date,m.planned_at)<= $4) AND ($5::text IS NULL OR t.id=$5) AND ($6::text IS NULL OR m.kind=$6)
    ORDER BY COALESCE(m.completed_at::date,m.planned_at) DESC NULLS LAST`,[COMPANY,filters.assetId||null,filters.from||null,filters.to||null,filters.technicianId||null,filters.kind||null]);return rows;
}
async function auditLog() { return (await db.query('SELECT id,actor_name,action,entity_type,entity_id,before_state,after_state,created_at FROM audit_log WHERE company_id=$1 ORDER BY created_at DESC LIMIT 300',[COMPANY])).rows; }

module.exports = { COMPANY,CATEGORIES,listAssets,addAsset,updateAsset,listAssetReadings,addAssetReading,listTechnicians,addTechnician,updateTechnician,listPlans,createPlan,listOrders,dashboard,listMaintenance,completeOrder,createCountermeasure,listCountermeasures,updateCountermeasure,listSupplies,recordSupplyMovement,requestPurchase,supplyMovements,documents,addDocument,documentContent,report,auditLog };
