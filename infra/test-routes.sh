#!/usr/bin/env bash
# End-to-end smoke test against the seeded demo data. Requires the gateway
# (port 3000), ehr-service (8001), ai-service (8002), billing-service (3001),
# and notification-service (3002) all running, plus db/schema.sql and
# db/seed.sql already applied.
#
# Usage: ./infra/test-routes.sh [gateway_url]

set -euo pipefail
GATEWAY_URL="${1:-http://localhost:3000}"
PASSWORD="Password123!"

bold() { printf "\n\033[1m%s\033[0m\n" "$1"; }
login() {
  curl -sS -X POST "$GATEWAY_URL/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$1\",\"password\":\"$PASSWORD\"}" \
    | python3 -c "import sys, json; print(json.load(sys.stdin)['accessToken'])"
}

bold "1. Logging in as each seeded role"
ADMIN_TOKEN=$(login admin@demo.hospital)
DOCTOR_TOKEN=$(login doctor@demo.hospital)
NURSE_TOKEN=$(login nurse@demo.hospital)
RECEPTIONIST_TOKEN=$(login receptionist@demo.hospital)
PATIENT_TOKEN=$(login patient@demo.hospital)
echo "All five logins succeeded."

bold "2. Doctor: list own appointments (GET /ehr/appointments)"
curl -sS "$GATEWAY_URL/ehr/appointments" -H "Authorization: Bearer $DOCTOR_TOKEN" | python3 -m json.tool

bold "3. Patient: list own appointments (should only see their own)"
curl -sS "$GATEWAY_URL/ehr/appointments" -H "Authorization: Bearer $PATIENT_TOKEN" | python3 -m json.tool

bold "4. Receptionist: search patients (GET /ehr/search/patients?q=Musa)"
curl -sS "$GATEWAY_URL/ehr/search/patients?q=Musa" -H "Authorization: Bearer $RECEPTIONIST_TOKEN" | python3 -m json.tool

bold "5. Receptionist: book a new appointment for the walk-in patient"
curl -sS -X POST "$GATEWAY_URL/ehr/appointments" \
  -H "Authorization: Bearer $RECEPTIONIST_TOKEN" -H "Content-Type: application/json" \
  -d '{"department":"Cardiology","scheduledAt":"2026-08-01T10:00:00Z","bookedVia":"staff","patientId":"30000000-0000-0000-0000-000000000002"}' \
  | python3 -m json.tool

bold "6. Admin: view the seeded invoice"
curl -sS "$GATEWAY_URL/billing/invoices/60000000-0000-0000-0000-000000000001" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | python3 -m json.tool

bold "7. Admin: check low-stock inventory (Surgical Gloves seeded below threshold)"
curl -sS "$GATEWAY_URL/inventory/low-stock" -H "Authorization: Bearer $ADMIN_TOKEN" | python3 -m json.tool

bold "8. Admin: adjust stock and trigger the low-stock event again"
curl -sS -X POST "$GATEWAY_URL/inventory/50000000-0000-0000-0000-000000000002/adjust" \
  -H "Authorization: Bearer $ADMIN_TOKEN" -H "Content-Type: application/json" \
  -d '{"changeQuantity":-1,"reason":"dispensed"}' | python3 -m json.tool

bold "9. Patient: AI receptionist chat — non-urgent message"
curl -sS -X POST "$GATEWAY_URL/ai/receptionist/chat" \
  -H "Authorization: Bearer $PATIENT_TOKEN" -H "Content-Type: application/json" \
  -d '{"patient_message":"I need to see a doctor about ongoing joint pain","session_id":"demo-session-1","history":[]}' \
  | python3 -m json.tool

bold "10. Patient: AI receptionist chat — urgent message (should escalate, not call Claude)"
curl -sS -X POST "$GATEWAY_URL/ai/receptionist/chat" \
  -H "Authorization: Bearer $PATIENT_TOKEN" -H "Content-Type: application/json" \
  -d '{"patient_message":"I am having severe chest pain","session_id":"demo-session-2","history":[]}' \
  | python3 -m json.tool

bold "11. Patient: book via the AI receptionist's deterministic /book endpoint"
curl -sS -X POST "$GATEWAY_URL/ai/receptionist/book" \
  -H "Authorization: Bearer $PATIENT_TOKEN" -H "Content-Type: application/json" \
  -d '{"department":"Cardiology","scheduled_at":"2026-08-03T09:00:00Z"}' | python3 -m json.tool

bold "12. Admin: create a staff account (POST /users) — RBAC should allow this"
curl -sS -X POST "$GATEWAY_URL/users" \
  -H "Authorization: Bearer $ADMIN_TOKEN" -H "Content-Type: application/json" \
  -d '{"email":"newdoctor@demo.hospital","password":"Password123!","fullName":"Dr. Test User","hospitalId":"11111111-1111-1111-1111-111111111111","role":"doctor"}' \
  | python3 -m json.tool

bold "13. Receptionist: attempt the same (should 403 — RBAC denies it)"
set +e
curl -sS -o /dev/null -w "HTTP %{http_code} (expect 403)\n" -X POST "$GATEWAY_URL/users" \
  -H "Authorization: Bearer $RECEPTIONIST_TOKEN" -H "Content-Type: application/json" \
  -d '{"email":"shouldfail@demo.hospital","password":"Password123!","fullName":"Should Fail","hospitalId":"11111111-1111-1111-1111-111111111111","role":"doctor"}'
set -e

bold "14. Public: self-register a new patient (no token needed)"
curl -sS -X POST "$GATEWAY_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d '{"email":"newpatient@demo.hospital","password":"Password123!","fullName":"New Patient","hospitalId":"11111111-1111-1111-1111-111111111111","insuranceProvider":"NHIS","insurancePolicyNumber":"NHIS-12345"}' \
  | python3 -m json.tool

bold "15. Doctor: view the seeded prescription"
curl -sS "$GATEWAY_URL/prescriptions/70000000-0000-0000-0000-000000000001" \
  -H "Authorization: Bearer $DOCTOR_TOKEN" | python3 -m json.tool

bold "16. Nurse: fulfill the prescription item (dispenses medication, should decrement Paracetamol stock by 10)"
curl -sS -X POST "$GATEWAY_URL/prescriptions/items/70000000-0000-0000-0000-000000000002/fulfill" \
  -H "Authorization: Bearer $NURSE_TOKEN" | python3 -m json.tool

bold "16b. Admin: low-stock list (Paracetamol should NOT appear — 190 remaining is still above its threshold of 20; Surgical Gloves should)"
curl -sS "$GATEWAY_URL/inventory/low-stock" -H "Authorization: Bearer $ADMIN_TOKEN" | python3 -m json.tool

bold "17. Doctor: order a new lab test"
curl -sS -X POST "$GATEWAY_URL/lab/orders" \
  -H "Authorization: Bearer $DOCTOR_TOKEN" -H "Content-Type: application/json" \
  -d '{"patientId":"30000000-0000-0000-0000-000000000001","testName":"Lipid Panel","priority":"routine"}' \
  | python3 -m json.tool

bold "18. Patient: view own lab orders"
curl -sS "$GATEWAY_URL/lab/orders/patient/30000000-0000-0000-0000-000000000001" \
  -H "Authorization: Bearer $PATIENT_TOKEN" | python3 -m json.tool

bold "19. Doctor: create a telemedicine session for the second appointment"
curl -sS -X POST "$GATEWAY_URL/telemedicine/sessions" \
  -H "Authorization: Bearer $DOCTOR_TOKEN" -H "Content-Type: application/json" \
  -d '{"appointmentId":"40000000-0000-0000-0000-000000000002"}' | python3 -m json.tool

bold "All routes exercised. Check notification-service logs for the SMS/email/low-stock jobs it just processed."
