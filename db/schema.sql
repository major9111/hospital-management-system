-- Hospital Management System — Core Schema
-- Multi-tenant (multi-hospital) design using tenant_id + row-level security

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============ TENANCY ============
CREATE TABLE hospitals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    address TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ============ USERS & AUTH ============
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    hospital_id UUID REFERENCES hospitals(id),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(30),
    is_active BOOLEAN DEFAULT true,
    mfa_enabled BOOLEAN DEFAULT false,
    mfa_secret TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE refresh_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    revoked BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ============ RBAC ============
-- Roles: Admin, Doctor, Nurse, Receptionist, Patient (seeded, extensible)
CREATE TABLE roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(50) UNIQUE NOT NULL,   -- 'admin', 'doctor', 'nurse', 'receptionist', 'patient'
    description TEXT
);

-- Permissions are resource+action scoped, e.g. 'patient_record:read:own_department'
CREATE TABLE permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    resource VARCHAR(100) NOT NULL,     -- e.g. 'patient_record', 'billing', 'inventory'
    action VARCHAR(50) NOT NULL,        -- e.g. 'read', 'write', 'delete'
    scope VARCHAR(50) NOT NULL DEFAULT 'own', -- 'own' | 'department' | 'hospital' | 'all'
    UNIQUE(resource, action, scope)
);

CREATE TABLE role_permissions (
    role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
    permission_id UUID REFERENCES permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE user_roles (
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
    hospital_id UUID REFERENCES hospitals(id), -- role can be scoped per hospital branch
    PRIMARY KEY (user_id, role_id, hospital_id)
);

-- ============ CLINICAL STAFF DETAILS ============
CREATE TABLE staff_profiles (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    department VARCHAR(100),
    specialty VARCHAR(100),
    license_number VARCHAR(100)
);

-- ============ PATIENTS & APPOINTMENTS (EHR core lives mainly in ehr-service DB or schema) ============
CREATE TABLE patients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    hospital_id UUID REFERENCES hospitals(id),
    user_id UUID REFERENCES users(id), -- nullable: patient may not have login
    full_name VARCHAR(255) NOT NULL,
    date_of_birth DATE,
    gender VARCHAR(20),
    phone VARCHAR(30),
    email VARCHAR(255),
    emergency_contact VARCHAR(255),
    insurance_provider VARCHAR(255),
    insurance_policy_number VARCHAR(100),
    insurance_verified BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE appointments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    hospital_id UUID REFERENCES hospitals(id),
    patient_id UUID REFERENCES patients(id),
    doctor_id UUID REFERENCES users(id),
    department VARCHAR(100),
    scheduled_at TIMESTAMPTZ NOT NULL,
    status VARCHAR(30) DEFAULT 'scheduled', -- scheduled | checked_in | completed | cancelled | no_show
    booked_via VARCHAR(30) DEFAULT 'staff', -- 'staff' | 'ai_receptionist' | 'patient_portal'
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ============ AUDIT LOG ============
-- Every access to sensitive resources gets logged for compliance (NDPR / HIPAA-style)
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    hospital_id UUID REFERENCES hospitals(id),
    resource VARCHAR(100) NOT NULL,
    resource_id UUID,
    action VARCHAR(50) NOT NULL,
    ip_address VARCHAR(45),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ============ ROW LEVEL SECURITY ============
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

-- Example policy: restrict rows to the caller's hospital_id (set via SET LOCAL app.current_hospital_id)
CREATE POLICY tenant_isolation_patients ON patients
    USING (hospital_id = current_setting('app.current_hospital_id')::UUID);

CREATE POLICY tenant_isolation_appointments ON appointments
    USING (hospital_id = current_setting('app.current_hospital_id')::UUID);

-- ============ BILLING ============
-- Kept in the same Postgres instance for this scaffold, but scoped into
-- its own schema so it can be split to a separate PCI-scoped database
-- later without touching application code beyond the connection string.
CREATE SCHEMA IF NOT EXISTS billing;

CREATE TABLE billing.invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    hospital_id UUID REFERENCES hospitals(id),
    patient_id UUID REFERENCES patients(id),
    appointment_id UUID REFERENCES appointments(id),
    status VARCHAR(30) DEFAULT 'draft', -- draft | issued | paid | partially_paid | void
    currency VARCHAR(10) DEFAULT 'NGN',
    total_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
    amount_paid NUMERIC(12, 2) NOT NULL DEFAULT 0,
    insurance_provider VARCHAR(255),
    insurance_claim_ref VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE billing.invoice_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_id UUID REFERENCES billing.invoices(id) ON DELETE CASCADE,
    description VARCHAR(255) NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price NUMERIC(12, 2) NOT NULL,
    line_total NUMERIC(12, 2) GENERATED ALWAYS AS (quantity * unit_price) STORED
);

CREATE TABLE billing.payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_id UUID REFERENCES billing.invoices(id) ON DELETE CASCADE,
    amount NUMERIC(12, 2) NOT NULL,
    method VARCHAR(30) NOT NULL, -- 'cash' | 'card' | 'transfer' | 'insurance'
    reference VARCHAR(255),
    paid_at TIMESTAMPTZ DEFAULT now()
);

-- ============ INVENTORY ============
CREATE SCHEMA IF NOT EXISTS inventory;

CREATE TABLE inventory.items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    hospital_id UUID REFERENCES hospitals(id),
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100), -- 'medication' | 'consumable' | 'equipment'
    unit VARCHAR(30) DEFAULT 'unit',
    quantity_on_hand INTEGER NOT NULL DEFAULT 0,
    reorder_threshold INTEGER NOT NULL DEFAULT 10,
    expiry_date DATE, -- nullable, applies mainly to medication
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE inventory.stock_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    item_id UUID REFERENCES inventory.items(id) ON DELETE CASCADE,
    change_quantity INTEGER NOT NULL, -- positive = restock, negative = consumption
    reason VARCHAR(100), -- 'restock' | 'dispensed' | 'expired' | 'adjustment'
    performed_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Items at or below their reorder threshold — the notification service
-- (not yet built) would poll or trigger off this to alert procurement staff.
CREATE VIEW inventory.low_stock_items AS
    SELECT * FROM inventory.items WHERE quantity_on_hand <= reorder_threshold;

-- ============ SEED ROLES ============
INSERT INTO roles (name, description) VALUES
    ('admin', 'Full administrative access across hospital or network'),
    ('doctor', 'Clinical staff — manages own patients and records'),
    ('nurse', 'Clinical support staff — department-scoped access'),
    ('receptionist', 'Front-desk — scheduling and patient intake, no clinical notes'),
    ('patient', 'End user — access to own records and appointments only')
ON CONFLICT (name) DO NOTHING;

-- ============ E-PRESCRIPTIONS ============
CREATE TABLE prescriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    hospital_id UUID REFERENCES hospitals(id),
    patient_id UUID REFERENCES patients(id),
    doctor_id UUID REFERENCES users(id),
    appointment_id UUID REFERENCES appointments(id),
    status VARCHAR(30) DEFAULT 'pending', -- pending | partially_fulfilled | fulfilled | cancelled
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE prescription_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    prescription_id UUID REFERENCES prescriptions(id) ON DELETE CASCADE,
    inventory_item_id UUID REFERENCES inventory.items(id), -- links to the dispensing stock, nullable if not stocked in-house
    medication_name VARCHAR(255) NOT NULL,
    dosage VARCHAR(100) NOT NULL,       -- e.g. '500mg'
    frequency VARCHAR(100) NOT NULL,    -- e.g. 'twice daily'
    duration VARCHAR(100),              -- e.g. '7 days'
    quantity INTEGER NOT NULL,
    fulfilled BOOLEAN DEFAULT false,
    fulfilled_by UUID REFERENCES users(id),
    fulfilled_at TIMESTAMPTZ
);

-- ============ LAB RESULTS ============
CREATE TABLE lab_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    hospital_id UUID REFERENCES hospitals(id),
    patient_id UUID REFERENCES patients(id),
    ordered_by UUID REFERENCES users(id), -- doctor
    appointment_id UUID REFERENCES appointments(id),
    test_name VARCHAR(255) NOT NULL,      -- e.g. 'Complete Blood Count'
    priority VARCHAR(20) DEFAULT 'routine', -- 'routine' | 'urgent' | 'stat'
    status VARCHAR(30) DEFAULT 'ordered',   -- ordered | in_progress | completed | cancelled
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE lab_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lab_order_id UUID REFERENCES lab_orders(id) ON DELETE CASCADE,
    result_summary TEXT NOT NULL,
    result_data JSONB, -- structured values, e.g. {"hemoglobin": "13.2 g/dL", "wbc": "6.1 x10^9/L"}
    is_abnormal BOOLEAN DEFAULT false,
    reported_by UUID REFERENCES users(id), -- lab tech / pathologist
    reported_at TIMESTAMPTZ DEFAULT now(),
    attachment_url TEXT -- external storage link (e.g. S3/Vercel Blob) for scanned reports/imaging
);

-- ============ TELEMEDICINE ============
CREATE TABLE telemedicine_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    appointment_id UUID REFERENCES appointments(id) ON DELETE CASCADE,
    room_url TEXT NOT NULL,
    provider VARCHAR(50) DEFAULT 'stub', -- swap point: 'daily_co' | 'twilio_video' | 'stub'
    status VARCHAR(30) DEFAULT 'scheduled', -- scheduled | active | ended
    started_at TIMESTAMPTZ,
    ended_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ============ FULL-TEXT SEARCH FALLBACK ============
-- Elasticsearch (via search-sync) is the primary search path, but this
-- generated column + GIN index let ehr-service fall back to Postgres
-- full-text search if Elasticsearch is unreachable — no separate service
-- to keep alive for search to keep working at all.
ALTER TABLE patients ADD COLUMN search_vector tsvector
    GENERATED ALWAYS AS (to_tsvector('english', full_name)) STORED;

CREATE INDEX patients_search_idx ON patients USING GIN (search_vector);

-- ============ CHANGE NOTIFICATIONS FOR SEARCH SYNC ============
-- Lightweight alternative to a full Debezium/Kafka CDC pipeline: a trigger
-- emits NOTIFY on every write to a synced table, and the search-sync
-- service (apps/search-sync) LISTENs on this channel and re-indexes the
-- affected row into Elasticsearch. Good enough at hospital-network scale;
-- revisit with Debezium if write volume grows past what LISTEN/NOTIFY
-- comfortably handles (NOTIFY payloads are capped at 8000 bytes, so we
-- only send table+id+op, never the row itself).
CREATE OR REPLACE FUNCTION notify_record_change() RETURNS TRIGGER AS $$
DECLARE
    payload JSON;
    record_id UUID;
BEGIN
    record_id := COALESCE(NEW.id, OLD.id);
    payload := json_build_object(
        'table', TG_TABLE_NAME,
        'op', TG_OP,
        'id', record_id
    );
    PERFORM pg_notify('record_changes', payload::text);
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER patients_notify_change
    AFTER INSERT OR UPDATE OR DELETE ON patients
    FOR EACH ROW EXECUTE FUNCTION notify_record_change();

CREATE TRIGGER appointments_notify_change
    AFTER INSERT OR UPDATE OR DELETE ON appointments
    FOR EACH ROW EXECUTE FUNCTION notify_record_change();
