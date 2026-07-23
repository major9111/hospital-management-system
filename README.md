# Hospital Management System — Monorepo Scaffold

Multi-tenant (multi-hospital), role-based hospital platform.

## Structure

```
apps/
  web/            Next.js frontend (patient portal, doctor/nurse/receptionist/admin dashboards)
  gateway/        NestJS — Auth, RBAC enforcement, API gateway to internal services
  ehr-service/    FastAPI — patients, appointments, clinical records
  ai-service/     FastAPI — AI receptionist / triage, wraps Claude API
packages/
  shared-types/   TypeScript types shared between web and gateway
db/
  schema.sql      Postgres schema: tenancy, auth, RBAC, patients, appointments, audit log, RLS policies
infra/            (place for docker/k8s/terraform configs as the system grows)
docker-compose.yml  Local Postgres + Elasticsearch (dev only — no Redis; see "No Redis" section)
```

## How requests flow

1. **Next.js (web)** calls the **gateway** (NestJS) — never talks to ehr-service or ai-service directly.
2. **Gateway** validates the JWT (`AuthGuard('jwt')`), then checks the declared
   permission on the route (`RbacGuard` + `@RequirePermission(...)`).
3. If allowed, gateway forwards the request to **ehr-service** or **ai-service**
   via `apps/gateway/src/proxy/`, attaching a signed short-lived internal JWT
   (`x-internal-token`) carrying the caller's identity and resolved scope.
   Downstream services verify this signature rather than trusting headers.
4. Each downstream service applies **Postgres row-level security** (tenant
   isolation) plus its own scope filter (own / department / hospital / all).
5. Every access to `patient_record` gets written to `audit_logs`.

## RBAC model

Permissions are `resource:action:scope`, not just role names — e.g. a doctor
gets `patient_record:write:own` (only their assigned patients), while a nurse
gets `patient_record:write:department`. See `apps/gateway/src/rbac/roles.enum.ts`
for the full matrix, and `db/schema.sql` for the equivalent DB-backed tables
(`roles`, `permissions`, `role_permissions`, `user_roles`) — the enum is a fast
in-memory mirror of what's in Postgres.

## AI receptionist safety pattern

`apps/ai-service/app/routers/receptionist.py` shows the core rule: certain
symptom keywords always escalate to a human, and the AI is never allowed to
produce a diagnosis — only triage severity and book/route appointments.

## Local dev (Vercel/Render/Neon still power production — see DEPLOYMENT.md)

```bash
docker-compose up -d          # postgres, elasticsearch, search-sync, notification-service — LOCAL ONLY
psql $DATABASE_URL -f db/schema.sql
npm install
npm run dev:gateway           # NestJS on :3000
npm run dev:ehr               # FastAPI on :8001
npm run dev:ai                # FastAPI on :8002
```

## Auth is fully wired

- `PostgresUsersRepository` implements login lookups, refresh-token storage,
  and revocation directly against the `db/schema.sql` tables.
- `/auth/login`, `/auth/refresh` (rotation), `/auth/logout` (revoke-all) are live.
- `POST /users` creates staff/patient accounts — gated by
  `user_management:write:all`, which only `admin` holds.
- `helmet` + CORS + global rate limiting (100 req/min/IP, tighter on
  `/auth/login`) are wired in `main.ts` / `app.module.ts`.

## Gateway → service proxy is now wired

- `apps/gateway/src/proxy/` — explicit per-resource routes (`/ehr/patients/:id`,
  `/ehr/appointments`, `/ai/receptionist/chat`, etc.), each with its own
  `@RequirePermission`. This is deliberately **not** a blind wildcard proxy —
  the gateway is the API contract, so every externally-reachable path is
  declared and permission-checked individually.
- `InternalTokenService` signs a 30-second `x-internal-token` JWT carrying
  `{ userId, hospitalId, roles, scope }` on every forwarded call.
- `ehr-service` and `ai-service` verify that token (`app/deps.py`, via PyJWT)
  instead of trusting plain headers — closes the spoofing gap that existed
  when downstream services trusted whatever headers arrived.

## Next.js app is now scaffolded

- Design identity: warm paper background, near-black ink, a single muted
  clinical-teal accent, amber reserved strictly for urgent/escalation states.
  Serif display type (institutional feel) + IBM Plex Sans/Mono for body/data —
  see `tailwind.config.ts` for the full token set.
- `middleware.ts` enforces role-based access to `/dashboard/<role>` at the
  edge by verifying the JWT cookie's `roles` claim before the page even
  renders (the gateway still re-checks everything on the actual API calls).
- `app/login/page.tsx` calls the gateway's `/auth/login` directly and stores
  the access token in a cookie; `app/dashboard/layout.tsx` decodes it
  server-side to drive the sidebar + role badge.
- One page per role (`app/dashboard/{admin,doctor,nurse,receptionist,patient}`),
  each documenting which proxy endpoint it should call — `doctor/page.tsx`
  is wired for real to `GET /ehr/appointments` as the reference example.

## Deployment

**Deploying to Vercel + Render + Neon (the actual target for this
project)?** See `DEPLOYMENT.md` — services are created manually in the
Render dashboard (no Blueprint/`render.yaml`), every backend service runs
as a free `type: web` service, and there's no Redis (see the "No Redis"
section below for what that trades away).

**Going live with real patients?** See `PRODUCTION_CHECKLIST.md` first —
secrets rotation, the self-registration hospital-validation fix, CORS
lockdown, audit logging (now wired), and the two remaining stubs
(telemedicine/insurance) that need a real decision before launch, not
after.

`infra/terraform` and `infra/nginx` are an AWS-flavored alternative for a
self-managed deployment, kept in the repo in case that ever becomes
relevant, but not needed for the Vercel/Render/Neon path.

## Production infra is now scaffolded (Terraform + NGINX/WAF) — AWS alternative only

- `infra/terraform/` — multi-AZ VPC, ALB + AWS WAFv2 (managed rule set +
  per-IP rate limiting) in front of the gateway, ECS Fargate autoscaling on
  CPU (so latency stays low under load instead of requests queueing),
  Multi-AZ RDS Postgres with encryption at rest, and Multi-AZ ElastiCache
  Redis. Security groups enforce that the internet only ever reaches the
  ALB — gateway, internal services, and the database are each one hop
  further in and unreachable from the layer before.
- `infra/nginx/` + `infra/waf/modsecurity.conf` — a self-hosted alternative
  to AWS WAF/ALB (useful if not deploying to AWS): NGINX load-balances
  across gateway replicas with `least_conn`, rate-limits `/auth/login`
  separately and more tightly than everything else, and ModSecurity with
  the OWASP Core Rule Set sits in front of it. Use one stack or the other,
  not both.
- Secrets (DB URL, JWT secrets, internal service secret) are pulled from
  Secrets Manager in the ECS task definition — never baked into the image
  or committed as plain env vars in production.

## Elasticsearch sync pipeline is now wired

- `db/schema.sql` adds a trigger (`notify_record_change`) on `patients` and
  `appointments` that fires `pg_notify('record_changes', ...)` on every
  insert/update/delete, sending only `{table, op, id}` (NOTIFY payloads cap
  at 8000 bytes, so never the full row).
- `apps/search-sync` (Python worker) LISTENs on that channel, re-fetches the
  full row from Postgres by id, and upserts it into the matching
  Elasticsearch index — a lighter-weight alternative to a full Debezium/Kafka
  CDC pipeline, good enough at hospital-network scale. It also does a full
  reindex on startup in case the channel was down and events were missed.
- `ehr-service`'s new `search.py` router queries Elasticsearch directly, with
  `hospital_id` as a hard `filter` clause (not a scored `should`) so tenant
  isolation holds regardless of query relevance — proxied through the
  gateway at `GET /ehr/search/patients?q=...`, RBAC-checked like every other
  route.
- Postgres stays the system of record throughout; Elasticsearch is a
  read-optimized mirror, never written to directly by the app.

## Billing and inventory services are now wired

- `apps/billing-service` (NestJS, port 3001) — separate service so it can
  move to its own PCI-scoped database later without touching other
  services; tables live under the `billing` and `inventory` Postgres
  schemas (`db/schema.sql`) as a scaffold-stage stand-in for that split.
- **Invoices**: create with line items, record payments (partial payments
  update status to `partially_paid`, full payment to `paid`), fetch with
  items included.
- **Inventory**: stock adjustment is transactional (`SELECT ... FOR UPDATE`
  so concurrent dispenses can't oversell stock) and logs every change to
  `stock_transactions`; `inventory.low_stock_items` is a view the
  not-yet-built notification service will alert off of.
- Every route trusts `hospitalId` only from the verified internal token
  (`InternalAuthGuard`, mirrors the Python services' `deps.py` pattern) —
  never from the request body, so a caller can't invoice against a
  hospital they don't belong to.
- Proxied through the gateway at `/billing/*` and `/inventory/*`, gated by
  `billing:write:all` / `inventory:write:all` — only `admin` holds those in
  the seeded role matrix right now; add a dedicated billing-staff role in
  `roles.enum.ts` + `db/schema.sql` if front-desk staff should invoice
  directly without going through an admin.

## Notification service — now HTTP-based, no Redis

Originally built on Redis pub/sub + BullMQ. Rebuilt to drop Redis entirely
(see "No Redis on this deployment" below for why) — `ehr-service`,
`billing-service`, and `ai-service` now call `notification-service`'s HTTP
endpoints directly instead of publishing events:

- `POST /notify/appointment-booked` — called from `ehr-service`'s
  `notify_client.py` right after a successful booking
- `POST /notify/inventory-low-stock` — called from `billing-service`'s
  `NotifyClient` when a stock adjustment leaves an item at or below its
  reorder threshold
- `POST /notify/ai-escalation` — called from `ai-service`'s
  `internal_client.py` the moment the urgent-keyword check fires

All three are guarded by the same `x-internal-token` signature check used
everywhere else in this system (`InternalAuthGuard`) — now the *actual*
security boundary for this service rather than a defense-in-depth layer,
since there's no private networking on this deployment.

Delivery itself: one attempt, one retry after a short delay, then log and
give up (no queue, no backoff, no dead-letter view — that's the real
tradeoff of not having Redis backing this). Channel adapters
(`channel-adapters.ts`) are still console-log stubs with the real provider
swap point commented directly in each one (SendGrid/SES for email,
Twilio/Termii/Africa's Talking for SMS, FCM/OneSignal for push).

## No Redis on this deployment

This system was originally designed with Redis (BullMQ queues, pub/sub
events, rate-limit state). It's been rebuilt without it because Render's
free tier requires a card on file for Redis/Key Value, Private Services,
and Background Workers — only plain `type: web` services are free without
one. Every backend service is now a public Render web service, and
`search-sync` (fundamentally a background job) is wrapped in a minimal
FastAPI app just so it qualifies as a `type: web` service. See
`DEPLOYMENT.md` for the full writeup of what this trades away and how to
add Redis back later if you outgrow the free tier.

## AI receptionist is now fully wired

- `app/claude_client.py` calls Claude for the non-urgent intake conversation
  under a system prompt that hard-forbids diagnosis, medication advice, or
  discouraging in-person/emergency care — kept short (2-3 sentences) and
  told to treat ambiguity as urgent.
- Two independent safety layers, not one: a keyword check runs *before* any
  model call and escalates instantly on emergency language (no round-trip
  needed), and the system prompt constrains everything the model says for
  everything else.
- Escalation calls `POST /notify/ai-escalation` directly (previously a
  Redis publish), so the notification service's handler — previously
  unreachable since nothing called it — now fires for real.
- **Booking is deliberately not something the model does.** `POST
  /ai/receptionist/book` is a separate, deterministic endpoint — the chat
  only gathers department/time conversationally; booking itself goes
  through `ai-service`'s `internal_client.py`, which signs its own
  short-lived internal JWT (same `INTERNAL_SERVICE_SECRET` the gateway

  uses) to call `ehr-service` directly. This means there's always a
  concrete, non-AI-generated API call responsible for creating the
  appointment record — useful both for audit and for keeping "the model
  decided to write to the database" out of the picture entirely.
- `ehr-service`'s `POST /appointments` now actually accepts the booking
  payload (department, time, `bookedVia`) instead of ignoring the request
  body, so the AI-booked path and the real endpoint agree on a shape.

## Demo seed data + route testing

- `db/seed.sql` — one hospital, one login per role (admin/doctor/nurse/
  receptionist/patient, all sharing password `Password123!`), two patients
  (one with a login, one walk-in with none — exercises both the
  self-service and staff-booking paths), two appointments, an inventory
  item already at its reorder threshold (fires the low-stock event
  immediately), and a partially-paid invoice.
- `infra/test-routes.sh` — logs in as every seeded role and exercises
  auth, RBAC (including a deliberate 403 for a receptionist trying an
  admin-only action), EHR search, appointment booking (staff path and
  AI-receptionist path), billing, inventory adjustment, and both AI
  receptionist branches (urgent → escalates without calling Claude,
  non-urgent → calls Claude). Requires `ANTHROPIC_API_KEY` set for the
  non-urgent chat step to succeed.

To run the demo end to end:
```bash
docker-compose up -d
psql $DATABASE_URL -f db/schema.sql
psql $DATABASE_URL -f db/seed.sql
npm install
npm run dev:gateway & npm run dev:billing & npm run dev:notifications &
npm run dev:ehr & npm run dev:ai &
./infra/test-routes.sh
```

`patients.py` and `appointments.py` in `ehr-service` now do real Postgres
reads/writes (previously stubs) — this is what makes the seed data actually
visible through the API rather than just sitting in the database unused.

## Search now uses both backends — Elasticsearch primary, Postgres fallback

- `patients.search_vector` (generated `tsvector` column + GIN index,
  `db/schema.sql`) gives Postgres native full-text search with zero extra
  infrastructure.
- `search.py` tries Elasticsearch first (better relevance ranking, more
  typo-tolerant); if the ES connection fails, it transparently falls back
  to the Postgres full-text query instead of erroring out. The response
  includes `"source": "elasticsearch"` or `"source": "postgres_fallback"`
  so the caller can tell which path answered.
- Net effect: search keeps working even if Elastic Cloud has an outage or
  you haven't set it up yet — you get better results when it's healthy,
  degraded-but-functional results when it's not.

## Four new feature areas added

- **E-prescriptions** (`prescriptions`/`prescription_items` tables,
  `ehr-service/routers/prescriptions.py`, proxied at `/prescriptions/*`):
  doctor writes a prescription with one or more line items; each item
  optionally links to an `inventory.items` row so dispensing has a real
  stock trail. Nurses (department scope) fulfill items one at a time; the
  prescription's overall status rolls up automatically to
  `partially_fulfilled` or `fulfilled`. Fulfillment now actually calls
  billing-service's `POST /inventory/:id/adjust` to decrement real stock —
  `ehr-service` signs its own short-lived internal token
  (`internal_client.py`, same pattern as `ai-service`'s) to make that
  cross-service call. If the stock decrement fails, the fulfillment itself
  is NOT rolled back (the patient already has the medication) — the
  failure is surfaced in the response instead, for manual reconciliation.
  Items with no linked inventory record (external/non-stocked meds) skip
  the adjustment entirely.
- **Lab results** (`lab_orders`/`lab_results`, `routers/lab.py`, proxied at
  `/lab/*`): doctor orders a test with a priority; results (structured
  JSONB + free-text summary + optional attachment URL for scans/imaging)
  get reported back, which flips the order to `completed`. `is_abnormal`
  is a flag, not itself an AI judgment — nothing here diagnoses.
- **Telemedicine** (`telemedicine_sessions`, `routers/telemedicine.py`,
  proxied at `/telemedicine/*`): one session per appointment, with a clearly
  marked stub room-URL generator and comments showing the exact swap point
  for Daily.co or Twilio Video. Start/end endpoints track session status.
- **Patient self-registration + insurance** (`SelfRegistrationController`,
  public `POST /auth/register` — deliberately outside the RBAC guard, since
  this is how a patient gets into the system before they have an account).
  Creates both the login and the `patients` row in one transaction.
  Insurance "verification" is an honest stub: presence of a provider +
  policy number sets `insurance_verified = true`; wire a real eligibility
  API before trusting that flag for anything financial.
- `patients` gained an `email` column (closes the earlier gap where
  appointment-booked notifications only had a phone number).
- All four are RBAC-permissioned the same way as everything else —
  `prescription`, `lab_order`, `telemedicine` resources added to
  `roles.enum.ts`'s permission matrix.

## Dashboard UI for the four new features

- `/register` — public self-registration page, no login required
- **Doctor dashboard**: forms to write a prescription, order a lab test,
  and start/join a telemedicine session — all posting straight to the
  gateway proxy routes built earlier
- **Nurse dashboard**: fulfill a prescription item (shows the resulting
  stock level from the real inventory adjustment) and report a lab result
- **Patient dashboard**: real appointments list, plus prescriptions and lab
  results — resolved via a new `GET /ehr/patients/me` (and proxied
  `/ehr/patients/me`) that looks up the caller's own patient row from their
  `user_id`, so the frontend never has to know or pass a raw patient id
  itself.
- All forms use a shared `authFetch` helper (`lib/api.ts`) that reads the
  access-token cookie client-side and calls the gateway directly

## All four remaining gaps addressed

- **Admin dashboard**: `GET /admin/metrics` (gateway, queries Postgres
  directly + proxies billing-service for low-stock count) replaces the old
  placeholder dashes with real numbers — staff accounts, patients,
  today's appointments, low-stock items, active hospitals network-wide.
- **Receptionist dashboard**: booking form, patient search, and invoice
  creation, all wired to live endpoints. This required actually widening
  the RBAC matrix — receptionist now holds `billing:read/write:hospital`
  (previously billing was admin-only at `:all` scope); the billing proxy
  routes' required scope dropped from `all` to `hospital` so both roles
  still pass the `scopeRank` check.
- **RLS session variable**: `scoped_connection()` in `ehr-service/db.py`
  now sets `app.current_hospital_id` via `SET LOCAL` inside a transaction
  before every query in `patients.py` and `appointments.py` — the two most
  PII-sensitive routers. This activates the RLS policies that were sitting
  unused in `db/schema.sql` since the beginning, as defense-in-depth on top
  of (not instead of) the explicit `WHERE hospital_id = $1` filtering.
  Prescriptions/lab/telemedicine routers haven't been switched over yet —
  same pattern, straightforward to extend.
- **Telemedicine**: real Daily.co integration (`DAILY_API_KEY` env var) —
  creates an actual room via their API when the key is set, and falls back
  to the stub URL generator automatically when it isn't, so the flow keeps
  working either way.
- **Insurance verification**: pulled out of the registration controller
  into its own `insurance-verification.ts`, matching the notification
  adapter pattern — same honest stub behavior as before (format check, not
  real eligibility), but now isolated behind a clean interface so swapping
  in a real insurer/clearinghouse integration later doesn't touch the
  registration flow itself.

## Both remaining gaps closed

- **RLS everywhere**: `scoped_connection()` now covers `prescriptions.py`,
  `lab.py`, and `telemedicine.py` too, not just `patients.py`/`appointments.py`
  — every ehr-service router activates the tenant-isolation RLS policies as
  defense-in-depth now.
- **AI receptionist chat widget**: `components/ReceptionistChat.tsx`, added
  to the patient dashboard. Real conversation loop against
  `POST /ai/receptionist/chat`, disables the input and shows an "escalated
  to human" badge the moment the backend's keyword check fires — the UI
  doesn't decide that, it just reflects what the backend already decided.

## UI overhaul + installable PWA + a real bug fix

- **Fixed a genuine infinite-redirect-loop bug** in `middleware.ts`: any
  role other than admin/patient hitting a page it wasn't allowed on used
  to get redirected to a hardcoded `/dashboard/patient` — which is itself
  gated to admin/patient, so anyone else looped forever. Fixed by computing
  the redirect target from the caller's actual role.
- **Added a sign-out button** — there wasn't one anywhere before.
- **Real component library** (`components/ui/`): `Card`, `Button`, `Badge`,
  `Field`, `StatCard`, `EmptyState`, `Spinner` — every dashboard page now
  shares the same building blocks instead of one-off inline markup.
  `EmptyState` treats a blank list as "an invitation to act" rather than
  just blank space — each one names what's missing and what to do about it.
- **Icons throughout** (`lucide-react`) — sidebar nav, card headers, status
  badges (AI-receptionist-booked flag, escalation indicator, etc.).
- **Installable as a PWA**: `public/manifest.json` + a deliberately minimal
  `public/sw.js` + an `InstallAppButton` that captures the browser's native
  `beforeinstallprompt` for a real one-click install (except iOS Safari,
  which never fires that event — there it's manual via the Share sheet).
  The service worker **only** caches static shell assets (icons, manifest)
  — it never touches API/data responses. Caching patient data on disk in a
  service worker would outlive the session and could leak across users on
  a shared device — that boundary is deliberate, not an oversight.
- Same design identity as before (warm paper, muted clinical teal, amber
  reserved strictly for urgency) — this was a depth pass, not a rebrand.

## Genuinely remaining next steps

- Per-hospital procurement contact instead of the placeholder email in
  `inventory.service.ts`
- Terraform ECS task definitions for ehr-service/ai-service/search-sync/
  billing-service/notification-service (only the gateway's is written out
  so far) and a CI/CD pipeline to build/push images
- Insurance verification and telemedicine both have real swap points now
  (see `insurance-verification.ts` and `DAILY_API_KEY`) but still run in
  stub mode until those are actually configured
