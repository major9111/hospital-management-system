-- Demo seed data — covers one hospital with one user per role, patients,
-- appointments, inventory (including one item already below its reorder
-- threshold, to exercise the low-stock notification path), and a billing
-- invoice. Every account shares the password: Password123!
--
-- Run after db/schema.sql:
--   psql $DATABASE_URL -f db/schema.sql
--   psql $DATABASE_URL -f db/seed.sql

-- Fixed IDs (rather than uuid_generate_v4()) so the accompanying
-- infra/test-routes.sh script can reference them directly without a
-- lookup step.
INSERT INTO hospitals (id, name, slug, address) VALUES
    ('11111111-1111-1111-1111-111111111111', 'Zamfara General Hospital', 'zamfara-general', 'Gusau, Zamfara State')
ON CONFLICT (id) DO NOTHING;

-- Password for every seeded account: Password123!
-- (bcrypt hash, cost 12 — generated once, safe to reuse across a demo seed
-- since none of these are real credentials)
INSERT INTO users (id, hospital_id, email, password_hash, full_name, phone) VALUES
    ('20000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'admin@demo.hospital', '$2b$12$ObZq05GqaWTrxCSA5OXgtu1I7VteuvI3O7atta.xxuo2S9iKnhtjm', 'Amina Bello (Admin)', '+2348010000001'),
    ('20000000-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'doctor@demo.hospital', '$2b$12$ObZq05GqaWTrxCSA5OXgtu1I7VteuvI3O7atta.xxuo2S9iKnhtjm', 'Dr. Ibrahim Sani', '+2348010000002'),
    ('20000000-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', 'nurse@demo.hospital', '$2b$12$ObZq05GqaWTrxCSA5OXgtu1I7VteuvI3O7atta.xxuo2S9iKnhtjm', 'Nurse Hauwa Musa', '+2348010000003'),
    ('20000000-0000-0000-0000-000000000004', '11111111-1111-1111-1111-111111111111', 'receptionist@demo.hospital', '$2b$12$ObZq05GqaWTrxCSA5OXgtu1I7VteuvI3O7atta.xxuo2S9iKnhtjm', 'Fatima Yusuf (Front Desk)', '+2348010000004'),
    ('20000000-0000-0000-0000-000000000005', '11111111-1111-1111-1111-111111111111', 'patient@demo.hospital', '$2b$12$ObZq05GqaWTrxCSA5OXgtu1I7VteuvI3O7atta.xxuo2S9iKnhtjm', 'Musa Abdullahi (Patient)', '+2348010000005')
ON CONFLICT (id) DO NOTHING;

INSERT INTO user_roles (user_id, role_id, hospital_id)
SELECT '20000000-0000-0000-0000-000000000001', id, '11111111-1111-1111-1111-111111111111' FROM roles WHERE name = 'admin'
UNION ALL
SELECT '20000000-0000-0000-0000-000000000002', id, '11111111-1111-1111-1111-111111111111' FROM roles WHERE name = 'doctor'
UNION ALL
SELECT '20000000-0000-0000-0000-000000000003', id, '11111111-1111-1111-1111-111111111111' FROM roles WHERE name = 'nurse'
UNION ALL
SELECT '20000000-0000-0000-0000-000000000004', id, '11111111-1111-1111-1111-111111111111' FROM roles WHERE name = 'receptionist'
UNION ALL
SELECT '20000000-0000-0000-0000-000000000005', id, '11111111-1111-1111-1111-111111111111' FROM roles WHERE name = 'patient'
ON CONFLICT DO NOTHING;

INSERT INTO staff_profiles (user_id, department, specialty, license_number) VALUES
    ('20000000-0000-0000-0000-000000000002', 'Cardiology', 'Cardiologist', 'MDCN-10023'),
    ('20000000-0000-0000-0000-000000000003', 'Cardiology', 'Registered Nurse', 'NMCN-88231')
ON CONFLICT (user_id) DO NOTHING;

-- Patient record linked to the seeded patient login, plus one walk-in
-- patient with no login (tests the receptionist/staff-booking path where
-- patientId is supplied explicitly rather than resolved from ctx.user_id).
INSERT INTO patients (id, hospital_id, user_id, full_name, date_of_birth, gender, phone, emergency_contact) VALUES
    ('30000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', '20000000-0000-0000-0000-000000000005', 'Musa Abdullahi', '1990-04-12', 'male', '+2348010000005', '+2348010009999'),
    ('30000000-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', NULL, 'Zainab Umar', '1985-11-03', 'female', '+2348010000006', '+2348010009998')
ON CONFLICT (id) DO NOTHING;

INSERT INTO appointments (id, hospital_id, patient_id, doctor_id, department, scheduled_at, status, booked_via) VALUES
    ('40000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', '30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000002', 'Cardiology', now() + interval '1 day', 'scheduled', 'staff'),
    ('40000000-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', '30000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000002', 'Cardiology', now() + interval '2 days', 'scheduled', 'ai_receptionist')
ON CONFLICT (id) DO NOTHING;

-- Inventory: one healthy item, one already at/below its reorder threshold
-- (exercises the low-stock event -> notification-service path the moment
-- anyone calls POST /inventory/:id/adjust on it, or GET /inventory/low-stock).
INSERT INTO inventory.items (id, hospital_id, name, category, unit, quantity_on_hand, reorder_threshold) VALUES
    ('50000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'Paracetamol 500mg', 'medication', 'box', 200, 20),
    ('50000000-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'Surgical Gloves (M)', 'consumable', 'box', 5, 15)
ON CONFLICT (id) DO NOTHING;

-- A billing invoice for the first appointment, partially paid — exercises
-- GET /billing/invoices/:id showing status = 'partially_paid'.
INSERT INTO billing.invoices (id, hospital_id, patient_id, appointment_id, status, total_amount, amount_paid) VALUES
    ('60000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', '30000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', 'partially_paid', 15000.00, 5000.00)
ON CONFLICT (id) DO NOTHING;

INSERT INTO billing.invoice_items (invoice_id, description, quantity, unit_price) VALUES
    ('60000000-0000-0000-0000-000000000001', 'Cardiology consultation', 1, 10000.00),
    ('60000000-0000-0000-0000-000000000001', 'ECG', 1, 5000.00)
ON CONFLICT DO NOTHING;

INSERT INTO billing.payments (invoice_id, amount, method, reference) VALUES
    ('60000000-0000-0000-0000-000000000001', 5000.00, 'cash', 'seed-demo-payment-1')
ON CONFLICT DO NOTHING;

-- Prescription for the seeded patient, one item linked to the seeded
-- Paracetamol inventory item (exercises the fulfill -> stock-adjust flow).
INSERT INTO prescriptions (id, hospital_id, patient_id, doctor_id, appointment_id, notes) VALUES
    ('70000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', '30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000001', 'Take with food')
ON CONFLICT (id) DO NOTHING;

INSERT INTO prescription_items (id, prescription_id, inventory_item_id, medication_name, dosage, frequency, duration, quantity) VALUES
    ('70000000-0000-0000-0000-000000000002', '70000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001', 'Paracetamol', '500mg', 'twice daily', '5 days', 10)
ON CONFLICT (id) DO NOTHING;

-- Lab order + result for the seeded patient.
INSERT INTO lab_orders (id, hospital_id, patient_id, ordered_by, appointment_id, test_name, priority, status) VALUES
    ('80000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', '30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000001', 'Complete Blood Count', 'routine', 'completed')
ON CONFLICT (id) DO NOTHING;

INSERT INTO lab_results (lab_order_id, result_summary, result_data, is_abnormal, reported_by) VALUES
    ('80000000-0000-0000-0000-000000000001', 'Within normal limits', '{"hemoglobin": "14.1 g/dL", "wbc": "6.4 x10^9/L"}', false, '20000000-0000-0000-0000-000000000003')
ON CONFLICT DO NOTHING;

-- Telemedicine session for the second appointment.
INSERT INTO telemedicine_sessions (id, appointment_id, room_url, status) VALUES
    ('90000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000002', 'https://meet.stub-provider.example/demo-seed-room', 'scheduled')
ON CONFLICT (id) DO NOTHING;
