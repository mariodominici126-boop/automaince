CREATE TABLE IF NOT EXISTS companies (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS app_records (
  company_id TEXT NOT NULL REFERENCES companies(id),
  collection TEXT NOT NULL,
  record_id TEXT NOT NULL,
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (company_id, collection, record_id)
);
CREATE INDEX IF NOT EXISTS app_records_collection_idx ON app_records(company_id, collection, created_at);

CREATE TABLE IF NOT EXISTS schema_migrations (
  id TEXT PRIMARY KEY,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS technicians (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL REFERENCES companies(id),
  username TEXT NOT NULL,
  name TEXT NOT NULL,
  national_id TEXT,
  company_name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'TECNICO',
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(company_id, username)
);
CREATE UNIQUE INDEX IF NOT EXISTS technicians_company_national_id_uq
  ON technicians(company_id, national_id) WHERE national_id IS NOT NULL AND national_id <> '';

CREATE TABLE IF NOT EXISTS assets (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL REFERENCES companies(id),
  code TEXT NOT NULL,
  category TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  manufacturer TEXT NOT NULL DEFAULT '',
  model TEXT NOT NULL DEFAULT '',
  serial_number TEXT NOT NULL DEFAULT '',
  acquired_on DATE,
  location TEXT NOT NULL DEFAULT '',
  department TEXT NOT NULL DEFAULT '',
  responsible TEXT NOT NULL DEFAULT '',
  criticality TEXT NOT NULL DEFAULT 'MEDIA',
  operational_status TEXT NOT NULL DEFAULT 'OPERATIVO',
  meter_value NUMERIC NOT NULL DEFAULT 0,
  meter_unit TEXT NOT NULL DEFAULT '',
  technical_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(company_id, code)
);
CREATE INDEX IF NOT EXISTS assets_company_category_idx ON assets(company_id, category, name);

CREATE TABLE IF NOT EXISTS maintenance_plans (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL REFERENCES companies(id),
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT '',
  interval_months INTEGER,
  interval_days INTEGER,
  usage_interval NUMERIC,
  usage_unit TEXT,
  next_due_at DATE,
  tasks JSONB NOT NULL DEFAULT '[]'::jsonb,
  active BOOLEAN NOT NULL DEFAULT true,
  created_by TEXT REFERENCES technicians(id),
  assigned_to TEXT REFERENCES technicians(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS plan_assets (
  plan_id TEXT NOT NULL REFERENCES maintenance_plans(id) ON DELETE CASCADE,
  asset_id TEXT NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  next_usage_due NUMERIC,
  PRIMARY KEY(plan_id, asset_id)
);

CREATE TABLE IF NOT EXISTS maintenance_records (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL REFERENCES companies(id),
  work_order_id TEXT UNIQUE,
  asset_id TEXT NOT NULL REFERENCES assets(id),
  plan_id TEXT REFERENCES maintenance_plans(id),
  kind TEXT NOT NULL DEFAULT 'PREVENTIVO',
  status TEXT NOT NULL DEFAULT 'COMPLETADA',
  planned_at DATE,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  technician_id TEXT REFERENCES technicians(id),
  checklist JSONB NOT NULL DEFAULT '[]'::jsonb,
  observations TEXT NOT NULL DEFAULT '',
  findings TEXT NOT NULL DEFAULT '',
  recommendations TEXT NOT NULL DEFAULT '',
  materials JSONB NOT NULL DEFAULT '[]'::jsonb,
  labor_hours NUMERIC NOT NULL DEFAULT 0 CHECK (labor_hours >= 0),
  labor_cost NUMERIC NOT NULL DEFAULT 0 CHECK (labor_cost >= 0),
  total_cost NUMERIC NOT NULL DEFAULT 0 CHECK (total_cost >= 0),
  description TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS maintenance_records_asset_idx ON maintenance_records(company_id, asset_id, completed_at DESC);

CREATE TABLE IF NOT EXISTS work_orders (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL REFERENCES companies(id),
  asset_id TEXT NOT NULL REFERENCES assets(id),
  plan_id TEXT REFERENCES maintenance_plans(id),
  kind TEXT NOT NULL DEFAULT 'PREVENTIVO',
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'PROGRAMADA',
  priority TEXT NOT NULL DEFAULT 'MEDIA',
  planned_at DATE,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  technician_id TEXT REFERENCES technicians(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS work_orders_company_planned_idx ON work_orders(company_id, planned_at, status);
CREATE UNIQUE INDEX IF NOT EXISTS work_orders_plan_occurrence_uq
  ON work_orders(company_id, plan_id, asset_id, planned_at) WHERE plan_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS countermeasures (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL REFERENCES companies(id),
  asset_id TEXT NOT NULL REFERENCES assets(id),
  maintenance_record_id TEXT REFERENCES maintenance_records(id),
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDIENTE',
  priority TEXT NOT NULL DEFAULT 'MEDIA',
  issue TEXT NOT NULL DEFAULT '',
  root_cause TEXT NOT NULL DEFAULT '',
  action_taken TEXT NOT NULL DEFAULT '',
  electronic_changes TEXT NOT NULL DEFAULT '',
  parts JSONB NOT NULL DEFAULT '[]'::jsonb,
  checklist JSONB NOT NULL DEFAULT '[]'::jsonb,
  technician_id TEXT REFERENCES technicians(id),
  provider TEXT NOT NULL DEFAULT '',
  planned_at DATE,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  labor_hours NUMERIC NOT NULL DEFAULT 0 CHECK (labor_hours >= 0),
  labor_cost NUMERIC NOT NULL DEFAULT 0 CHECK (labor_cost >= 0),
  parts_cost NUMERIC NOT NULL DEFAULT 0 CHECK (parts_cost >= 0),
  total_cost NUMERIC NOT NULL DEFAULT 0 CHECK (total_cost >= 0),
  notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS countermeasures_company_status_idx ON countermeasures(company_id, status, planned_at);

CREATE TABLE IF NOT EXISTS supplies (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL REFERENCES companies(id),
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  kind TEXT NOT NULL,
  unit TEXT NOT NULL,
  quantity NUMERIC NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  minimum_quantity NUMERIC NOT NULL DEFAULT 0 CHECK (minimum_quantity >= 0),
  unit_cost NUMERIC NOT NULL DEFAULT 0 CHECK (unit_cost >= 0),
  supplier TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(company_id, code)
);

CREATE TABLE IF NOT EXISTS supply_movements (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL REFERENCES companies(id),
  supply_id TEXT NOT NULL REFERENCES supplies(id),
  movement_type TEXT NOT NULL,
  quantity NUMERIC NOT NULL CHECK (quantity > 0),
  unit_cost NUMERIC NOT NULL DEFAULT 0,
  countermeasure_id TEXT REFERENCES countermeasures(id),
  technician_id TEXT REFERENCES technicians(id),
  note TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS purchase_requests (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL REFERENCES companies(id),
  supply_id TEXT NOT NULL REFERENCES supplies(id),
  quantity NUMERIC NOT NULL,
  recipient TEXT NOT NULL,
  email_status TEXT NOT NULL,
  email_message_id TEXT,
  requested_by TEXT REFERENCES technicians(id),
  note TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS documents (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL REFERENCES companies(id),
  asset_id TEXT REFERENCES assets(id),
  maintenance_record_id TEXT REFERENCES maintenance_records(id),
  countermeasure_id TEXT REFERENCES countermeasures(id),
  name TEXT NOT NULL,
  document_type TEXT NOT NULL DEFAULT 'GENERAL',
  original_filename TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size_bytes BIGINT NOT NULL,
  contents BYTEA NOT NULL,
  uploaded_by TEXT REFERENCES technicians(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS documents_company_asset_idx ON documents(company_id, asset_id, document_type);

CREATE TABLE IF NOT EXISTS audit_log (
  id BIGSERIAL PRIMARY KEY,
  company_id TEXT NOT NULL REFERENCES companies(id),
  actor_id TEXT,
  actor_name TEXT NOT NULL DEFAULT '',
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  before_state JSONB,
  after_state JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS asset_readings (
  id BIGSERIAL PRIMARY KEY,
  company_id TEXT NOT NULL REFERENCES companies(id),
  asset_id TEXT NOT NULL REFERENCES assets(id),
  reading NUMERIC NOT NULL CHECK (reading >= 0),
  unit TEXT NOT NULL,
  recorded_by TEXT REFERENCES technicians(id),
  note TEXT NOT NULL DEFAULT '',
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
