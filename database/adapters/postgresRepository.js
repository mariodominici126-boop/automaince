const fs = require('fs');
const path = require('path');
const { randomBytes, scrypt } = require('crypto');
const { promisify } = require('util');
const { Pool } = require('pg');

const connectionString = process.env.DATABASE_URL || 'postgresql://automaince:automaince_dev@127.0.0.1:5432/automaince';
const ssl = process.env.PGSSLMODE === 'require' ? { rejectUnauthorized: true } : undefined;
const pool = new Pool({ connectionString, ssl, max: Number(process.env.PGPOOL_SIZE || 10) });
const companies = [
  { id: 'gtg', name: 'Global Technology Group' },
  { id: 'notions', name: 'Notions Group' },
  { id: 'now', name: 'NOW Logistics' },
  { id: 'printpilot', name: 'PrintPilot' },
];
const collections = ['vehicles', 'drivers', 'maintenance', 'maintenanceOrders', 'fuel', 'repairs', 'parts', 'documents'];
const root = path.resolve(__dirname, '../..');
let initialized = false;
const scryptAsync = promisify(scrypt);

async function hashPassword(password) {
  if (typeof password !== 'string' || !password.trim())
    throw new Error('La contraseña no puede estar vacía.');
  const salt = randomBytes(16).toString('hex');
  const hash = await scryptAsync(password, salt, 64);
  return `scrypt$${salt}$${hash.toString('hex')}`;
}

async function seedNowLogistics() {
  const provider = {
    id: 'NOW-PROVIDER-SEGURA',
    name: 'SOLUCIONES AUTOMOTRICES SEGURA SRL',
    taxId: '1-30-57318-2',
  };
  const vehicles = [
    { id: 'F9', name: 'Cabezote (ID F9)', type: 'Cabezote' },
    { id: 'F5', name: 'Camión de 26 pies (ID F5)', type: 'Camión de 26 pies' },
    { id: 'F4', name: 'Camión de 16 pies (ID F4)', type: 'Camión de 16 pies' },
    { id: 'F12', name: 'Mini van (ID F12)', type: 'Mini van', last: '2026-09-08', next: '2026-12-08' },
    { id: 'F13', name: 'Mini van (ID F13)', type: 'Mini van', last: '2026-11-12', next: '2027-02-12' },
    { id: 'F14', name: 'Mini van (ID F14)', type: 'Mini van', last: '2026-09-03', next: '2026-12-03' },
    { id: 'F15', name: 'Mini van (ID F15)', type: 'Mini van', last: '2026-09-11', next: '2026-12-11' },
    { id: 'NOW-MONTACARGA-01', name: 'Monta carga', type: 'Monta carga', last: '2026-10-27', next: '2027-01-27' },
  ];
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(
      `INSERT INTO now_providers(id,company_id,name,tax_id,certified,services)
       VALUES($1,'now',$2,$3,true,ARRAY['MANTENIMIENTO','TRANSPORTE'])
       ON CONFLICT(company_id,tax_id) DO NOTHING`,
      [provider.id, provider.name, provider.taxId],
    );
    for (const vehicle of vehicles) {
      await client.query(
        `INSERT INTO now_vehicles(id,company_id,name,vehicle_type,last_maintenance,next_maintenance)
         VALUES($1,'now',$2,$3,$4,$5) ON CONFLICT(company_id,id) DO NOTHING`,
        [vehicle.id, vehicle.name, vehicle.type, vehicle.last || null, vehicle.next || null],
      );
      if (vehicle.last) {
        await client.query(
          `INSERT INTO now_maintenance_records(
             id,company_id,vehicle_id,request_date,planned_date,execution_date,vehicle_type,
             last_maintenance,next_maintenance,maintenance_type,details,provider_id,
             execution_location,status
           ) VALUES($1,'now',$2,NULL,$3,$3,$4,$3,$5,'Mantenimiento preventivo',
             'Registro inicial de fecha proporcionada por NOW Logistics; detalles pendientes.',
             NULL,'Pendiente de confirmar','COMPLETADO') ON CONFLICT(id) DO NOTHING`,
          [`NOW-MT-INITIAL-${vehicle.id}`, vehicle.id, vehicle.last, vehicle.type, vehicle.next],
        );
      }
    }
    await client.query(
      `INSERT INTO schema_migrations(id) VALUES('seed-now-logistics-fleet-v1') ON CONFLICT DO NOTHING`,
    );
    const initialUsers = [
      {
        id: 'NOW-USER-YAIFRYN',
        username: 'yaifryn.lopez.sanchez',
        name: 'Yaifryn López Sánchez',
        nationalId: '07105563211',
      },
      {
        id: 'NOW-USER-YAN',
        username: 'yan.luis.la.hoz',
        name: 'Yan Luis La Hoz',
        nationalId: '40214552362',
      },
    ];
    const adminCredentialsMigration = 'seed-now-admin-name-login-v1';
    const migratedAdmins = await client.query('SELECT 1 FROM schema_migrations WHERE id=$1', [adminCredentialsMigration]);
    if (!migratedAdmins.rowCount) {
      for (const user of initialUsers) {
        const passwordHash = await hashPassword(user.nationalId);
        const updated = await client.query(
          `UPDATE technicians SET username=$1,name=$2,password_hash=$3,role='ADMINISTRADOR',active=true
           WHERE company_id='now' AND national_id=$4`,
          [user.username, user.name, passwordHash, user.nationalId],
        );
        if (!updated.rowCount) {
          await client.query(
            `INSERT INTO technicians(id,company_id,username,name,national_id,company_name,password_hash,role)
             VALUES($1,'now',$2,$3,$4,'NOW Logistics',$5,'ADMINISTRADOR')
             ON CONFLICT(company_id,username) DO NOTHING`,
            [user.id, user.username, user.name, user.nationalId, passwordHash],
          );
        }
      }
      await client.query('INSERT INTO schema_migrations(id) VALUES($1) ON CONFLICT DO NOTHING', [adminCredentialsMigration]);
    }
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function initialize(options = {}) {
  if (initialized) return;
  await pool.query(fs.readFileSync(path.join(root, 'database/postgres/schema.sql'), 'utf8'));
  for (const company of companies) {
    await pool.query('INSERT INTO companies(id,name) VALUES($1,$2) ON CONFLICT(id) DO NOTHING', [company.id, company.name]);
  }
  const seedId = 'seed-mock-data-gtg-v1';
  const seeded = await pool.query('SELECT 1 FROM schema_migrations WHERE id=$1', [seedId]);
  if (!seeded.rowCount && !options.deferGtgSeed) {
    const seed = require('../../data/mock/fleetData');
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      for (const collection of collections) {
        for (const item of seed[collection] || []) {
          await client.query(
            'INSERT INTO app_records(company_id,collection,record_id,payload) VALUES($1,$2,$3,$4::jsonb) ON CONFLICT DO NOTHING',
            ['gtg', collection, String(item.id), JSON.stringify(item)],
          );
        }
      }
      await client.query('INSERT INTO schema_migrations(id) VALUES($1) ON CONFLICT DO NOTHING', [seedId]);
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally { client.release(); }
  }
  await seedPrintPilot();
  await seedNowLogistics();
  initialized = true;
}

const assets = [
  ['PP-AIR-001','AIRES','Compresor','Compresor','', '', '', ''],
  ['PP-AIR-002','AIRES','Aire industrial','Aire industrial','', '', '', ''],
  ['PP-AIR-003','AIRES','Aire de oficina del cuarto frío','Aire acondicionado de oficina del cuarto frío','Trane','Inverter','',''],
  ['PP-AIR-004','AIRES','Aire de oficina del showroom','Aire acondicionado de oficina del showroom','Trane','4TVW','',''],
  ['PP-AIR-005','AIRES','Aire de oficina del salón de conferencias','Aire acondicionado del salón de conferencias','Trane','4TVW','',''],
  ['PP-AIR-006','AIRES','Aire de oficina de diseño','Aire acondicionado de oficina de diseño','Trane','4TVW','',''],
  ['PP-AIR-007','AIRES','Aire de oficina de Juan Carlos','Aire acondicionado de la oficina de Juan Carlos','Trane','4TVW','',''],
  ['PP-PRN-001','IMPRESORAS','Impresora principal','Impresora principal de producción','Kornit','Atlas MAX POLY','',''],
  ['PP-PRN-002','IMPRESORAS','La prensa','Prensa de impresión','Ricoma','HP1620FP','',''],
  ['PP-PRN-003','IMPRESORAS','Impresora 3D TPU / resina','Impresora 3D para TPU y resina','Creality','Halot Mage 8K','',''],
  ['PP-PRN-004','IMPRESORAS','Impresora 3D 2 PLA filamento','Impresora 3D para filamento PLA','IIIP Printer 3D','Monoprice','','El PDF presenta proveedor/modelo en orden ambiguo.'],
  ['PP-PRN-005','IMPRESORAS','Impresora 3D 3 PLA','Impresora 3D para PLA','Monoprice','IIIP Printer 3D','',''],
  ['PP-PRN-006','IMPRESORAS','Impresora 3D 4 PLA ABS','Impresora 3D para PLA/ABS','Flashforge','Dual','',''],
  ['PP-HOR-001','HORNO_SECADO','Horno Pro-Cure','Horno Pro-Cure','Kornit','Adelco','',''],
  ['PP-HOR-002','HORNO_SECADO','Secadora','Secadora; el modelo indicado en el PDF aparece asociado a impresora 1.','Creality','Halot Mage 8K (dato por confirmar)','',''],
  ['PP-INF-001','INFRAESTRUCTURA','UPS','UPS','Eaton','93E','',''],
  ['PP-INF-002','INFRAESTRUCTURA','Servidor','Servidor; fabricante y modelo según PDF requieren confirmación.','Furman','Linkbasic','',''],
  ['PP-INF-003','INFRAESTRUCTURA','Router','Router','Print Pilot','','',''],
  ['PP-CUT-001','CORTADORAS','Cortadora RNC','Cortadora RNC','Print Pilot','','',''],
];

async function seedPrintPilot() {
  const seedId = 'seed-printpilot-assets-technician-v1';
  const result = await pool.query('SELECT 1 FROM schema_migrations WHERE id=$1', [seedId]);
  if (result.rowCount) return;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const [code, category, name, description, manufacturer, model, serial, note] of assets) {
      await client.query(`
        INSERT INTO assets(id,company_id,code,category,name,description,manufacturer,model,serial_number,technical_data)
        VALUES($1,'printpilot',$2,$3,$4,$5,$6,$7,$8,$9::jsonb) ON CONFLICT(company_id,code) DO NOTHING`,
      [code, code, category, name, description, manufacturer, model, serial, JSON.stringify(note ? { sourceNote: note } : {})]);
    }
    const salt = '3b2a1e477dbd673ef8d2d04ccb9df545';
    const hash = '5fd5bf13225fa466d28647f6639fd6d32f9bd3d6ce89bdd99f737b72db2ed67acb00285378ad02b810f2acac9b094222fbd94bb6c4d5ed3698dc2c184944046e';
    await client.query(`
      INSERT INTO technicians(id,company_id,username,name,national_id,company_name,password_hash,role)
      VALUES('PP-TECH-001','printpilot','emmanuel','Emmanuel',NULL,'PrintPilot',$1,'ADMINISTRADOR')
      ON CONFLICT(company_id,username) DO NOTHING`, [`scrypt$${salt}$${hash}`]);
    const airRows = await client.query("SELECT id FROM assets WHERE company_id='printpilot' AND category='AIRES'");
    const tasksMonthly = ['Inspeccionar filtro principal', 'Limpiar o sustituir filtro según condición', 'Registrar observaciones y evidencia'];
    const tasksSemiannual = ['Cambiar filtros principales', 'Revisar serpentines y drenajes', 'Registrar condición y repuestos utilizados'];
    for (const [id, name, interval, tasks] of [
      ['PP-PLAN-FILTER-M','Cambio de filtros principales · mensual',1,tasksMonthly],
      ['PP-PLAN-FILTER-6M','Mantenimiento preventivo de filtros principales · semestral',6,tasksSemiannual],
    ]) {
      await client.query(`INSERT INTO maintenance_plans(id,company_id,name,category,interval_months,next_due_at,tasks)
        VALUES($1,'printpilot',$2,'FILTROS',$3,current_date,$4::jsonb) ON CONFLICT(id) DO NOTHING`, [id,name,interval,JSON.stringify(tasks)]);
      for (const asset of airRows.rows) await client.query('INSERT INTO plan_assets(plan_id,asset_id) VALUES($1,$2) ON CONFLICT DO NOTHING',[id,asset.id]);
    }
    await client.query(`
      INSERT INTO supplies(id,company_id,code,name,kind,unit,quantity,minimum_quantity,unit_cost,supplier)
      VALUES ('PP-SUP-GAS','printpilot','GAS','Gas','GAS','unidad',0,0,0,''),
             ('PP-SUP-INK','printpilot','TINTA','Tinta','TINTA','litro',0,0,0,'')
      ON CONFLICT(company_id,code) DO NOTHING`);
    await client.query('INSERT INTO schema_migrations(id) VALUES($1) ON CONFLICT DO NOTHING',[seedId]);
    await client.query('COMMIT');
  } catch (error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); }
}

async function list(name, companyId = 'gtg') {
  if (!collections.includes(name)) throw new Error(`Colección desconocida: ${name}`);
  const { rows } = await pool.query('SELECT payload FROM app_records WHERE company_id=$1 AND collection=$2 ORDER BY created_at,record_id',[companyId,name]);
  return rows.map(row => row.payload);
}
async function find(name, id, companyId = 'gtg') {
  if (!collections.includes(name)) throw new Error(`Colección desconocida: ${name}`);
  const { rows } = await pool.query('SELECT payload FROM app_records WHERE company_id=$1 AND collection=$2 AND record_id=$3',[companyId,name,String(id)]);
  return rows[0]?.payload || null;
}
async function create(name, item, companyId = 'gtg') {
  if (!collections.includes(name)) throw new Error(`Colección desconocida: ${name}`);
  const safeItem = { ...item };
  delete safeItem.companyId;
  await pool.query('INSERT INTO app_records(company_id,collection,record_id,payload) VALUES($1,$2,$3,$4::jsonb)',[companyId,name,String(safeItem.id),JSON.stringify(safeItem)]);
  return safeItem;
}
async function update(name, id, changes, companyId = 'gtg') {
  if (!collections.includes(name)) throw new Error(`Colección desconocida: ${name}`);
  const { rows } = await pool.query(`UPDATE app_records SET payload=payload || $4::jsonb,updated_at=now()
    WHERE company_id=$1 AND collection=$2 AND record_id=$3 RETURNING payload`,[companyId,name,String(id),JSON.stringify(changes)]);
  return rows[0]?.payload || null;
}
async function listCompanies() { return (await pool.query('SELECT id,name FROM companies ORDER BY name')).rows; }
async function query(text, values = []) { return pool.query(text, values); }
async function close() { await pool.end(); }

module.exports = { initialize, list, find, create, update, listCompanies, collections, query, close, pool, connectionString };
