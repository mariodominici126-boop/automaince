const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const root = path.resolve(__dirname, '../..');
const databasePath = path.resolve(process.env.AUTOMAINCE_DB_PATH || path.join(root, 'data', 'sqlite', 'automaince.sqlite'));
const companies = [
  { id: 'gtg', name: 'Global Technology Group' },
  { id: 'notions', name: 'Notions Group' },
  { id: 'now', name: 'NOW Logistics' },
  { id: 'printpilot', name: 'PrintPilot' },
];
const definitions = {
  vehicles: {
    table: 'vehicles',
    fields: {
      plate: 'TEXT', brand: 'TEXT', model: 'TEXT', year: 'INTEGER', type: 'TEXT', mileage: 'REAL',
      status: 'TEXT', driver: 'TEXT', acquired: 'TEXT', lastMaintenance: 'TEXT', nextMaintenance: 'TEXT',
      maintenanceKm: 'REAL', maintenanceMonths: 'INTEGER', baseConsumption: 'REAL', recentConsumption: 'REAL',
      monthlyCost: 'REAL', failures: 'INTEGER', downtime: 'REAL',
    },
    unique: ['plate'],
  },
  drivers: { table: 'drivers', fields: { name: 'TEXT', status: 'TEXT' } },
  maintenance: {
    table: 'maintenance', vehicleReference: true,
    fields: { vehicleId: 'TEXT', date: 'TEXT', mileage: 'REAL', type: 'TEXT', description: 'TEXT', parts: 'TEXT', labor: 'REAL', cost: 'REAL', provider: 'TEXT', nextMaintenance: 'TEXT', responsible: 'TEXT' },
  },
  maintenanceOrders: {
    table: 'maintenance_orders', vehicleReference: true,
    fields: { vehicleId: 'TEXT', type: 'TEXT', description: 'TEXT', status: 'TEXT', priority: 'TEXT', provider: 'TEXT', createdAt: 'TEXT', estimatedCost: 'REAL' },
  },
  fuel: {
    table: 'fuel', vehicleReference: true,
    fields: { vehicleId: 'TEXT', date: 'TEXT', mileage: 'REAL', liters: 'REAL', cost: 'REAL', pricePerLiter: 'REAL', provider: 'TEXT' },
  },
  repairs: {
    table: 'repairs', vehicleReference: true,
    fields: { vehicleId: 'TEXT', date: 'TEXT', problem: 'TEXT', diagnosis: 'TEXT', repair: 'TEXT', parts: 'TEXT', cost: 'REAL', downtime: 'REAL', priority: 'TEXT' },
  },
  parts: { table: 'parts', fields: { name: 'TEXT', code: 'TEXT', category: 'TEXT', quantity: 'REAL', cost: 'REAL', provider: 'TEXT', compatible: 'TEXT', life: 'TEXT' }, unique: ['code'] },
  documents: {
    table: 'documents', vehicleReference: true,
    fields: { vehicleId: 'TEXT', type: 'TEXT', number: 'TEXT', issued: 'TEXT', expires: 'TEXT', status: 'TEXT' },
  },
};
const collections = Object.keys(definitions);

fs.mkdirSync(path.dirname(databasePath), { recursive: true });
const db = new Database(databasePath);
db.pragma('foreign_keys = ON');
db.pragma('journal_mode = WAL');
db.exec(`
  CREATE TABLE IF NOT EXISTS companies (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS migrations (
    id TEXT PRIMARY KEY,
    applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
`);

function columnName(field) {
  return field.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
}

for (const definition of Object.values(definitions)) {
  const columns = Object.entries(definition.fields).map(([field, type]) => `"${columnName(field)}" ${type}`).join(',\n    ');
  const unique = (definition.unique || []).map(field => `,\n    UNIQUE (company_id, "${columnName(field)}")`).join('');
  const vehicleReference = definition.vehicleReference
    ? ',\n    FOREIGN KEY (company_id, vehicle_id) REFERENCES vehicles(company_id, id) ON DELETE RESTRICT'
    : '';
  db.exec(`
    CREATE TABLE IF NOT EXISTS "${definition.table}" (
      company_id TEXT NOT NULL REFERENCES companies(id),
      id TEXT NOT NULL,
      ${columns},
      payload TEXT NOT NULL CHECK (json_valid(payload)),
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (company_id, id)${unique}${vehicleReference}
    );
    CREATE INDEX IF NOT EXISTS "${definition.table}_by_company" ON "${definition.table}" (company_id);
  `);
  if (definition.vehicleReference) {
    db.exec(`CREATE INDEX IF NOT EXISTS "${definition.table}_by_vehicle" ON "${definition.table}" (company_id, vehicle_id);`);
  }
}

const insertCompany = db.prepare('INSERT OR IGNORE INTO companies (id, name) VALUES (?, ?)');
companies.forEach(({ id, name }) => insertCompany.run(id, name));

const seedMigration = 'seed-mock-data-gtg-v1';
if (!db.prepare('SELECT 1 FROM migrations WHERE id = ?').get(seedMigration)) {
  const seedData = require('../../data/mock/fleetData');
  const seed = db.transaction(() => {
    for (const collection of collections) {
      for (const item of seedData[collection] || []) create(collection, item, 'gtg');
    }
    db.prepare('INSERT INTO migrations (id) VALUES (?)').run(seedMigration);
  });
  seed();
}

function definitionFor(name) {
  const definition = definitions[name];
  if (!definition) throw new Error(`Colección SQLite desconocida: ${name}`);
  return definition;
}

function assertCompany(companyId) {
  if (!db.prepare('SELECT 1 FROM companies WHERE id = ?').get(companyId)) throw new Error('Empresa no válida para esta sesión.');
}

function list(name, companyId = 'gtg') {
  const definition = definitionFor(name);
  assertCompany(companyId);
  return db.prepare(`SELECT payload FROM "${definition.table}" WHERE company_id = ? ORDER BY created_at, id`)
    .all(companyId).map(({ payload }) => JSON.parse(payload));
}

function find(name, id, companyId = 'gtg') {
  const definition = definitionFor(name);
  assertCompany(companyId);
  const row = db.prepare(`SELECT payload FROM "${definition.table}" WHERE company_id = ? AND id = ?`)
    .get(companyId, String(id));
  return row ? JSON.parse(row.payload) : null;
}

function create(name, item, companyId = 'gtg') {
  const definition = definitionFor(name);
  assertCompany(companyId);
  const safeItem = { ...item };
  delete safeItem.companyId;
  const fields = Object.keys(definition.fields);
  const columns = ['company_id', 'id', ...fields.map(columnName), 'payload'];
  const placeholders = columns.map(() => '?').join(', ');
  const values = [companyId, String(safeItem.id), ...fields.map(field => safeItem[field] ?? null), JSON.stringify(safeItem)];
  db.prepare(`INSERT INTO "${definition.table}" (${columns.map(column => `"${column}"`).join(', ')}) VALUES (${placeholders})`).run(...values);
  return safeItem;
}

function update(name, id, changes, companyId = 'gtg') {
  const definition = definitionFor(name);
  const current = find(name, id, companyId);
  if (!current) return null;
  const updated = { ...current, ...changes };
  delete updated.companyId;
  const fields = Object.keys(definition.fields);
  const assignments = [...fields.map(field => `"${columnName(field)}" = ?`), 'payload = ?', 'updated_at = CURRENT_TIMESTAMP'];
  const values = [...fields.map(field => updated[field] ?? null), JSON.stringify(updated), companyId, String(id)];
  db.prepare(`UPDATE "${definition.table}" SET ${assignments.join(', ')} WHERE company_id = ? AND id = ?`).run(...values);
  return updated;
}

function listCompanies() {
  return db.prepare('SELECT id, name FROM companies ORDER BY name').all();
}

module.exports = { list, find, create, update, listCompanies, collections, databasePath };
