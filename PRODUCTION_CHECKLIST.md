# Going to production — checklist

This scaffold is functionally complete (see README.md for what's real vs
stub), but "works in a demo" and "safe with real patient data" are
different bars. Work through this before opening it to real users.

## 1. Secrets — rotate everything, trust nothing from this repo

- [ ] `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `INTERNAL_SERVICE_SECRET` —
      generate fresh values for production (Render's `generateValue: true`
      in `render.yaml` does this automatically on first deploy; don't reuse
      whatever you tested locally with).
- [ ] `ANTHROPIC_API_KEY`, `DAILY_API_KEY` — production keys, not dev/test ones.
- [ ] Every seeded demo password (`Password123!`) is exactly that — a demo
      password. **Do not run `db/seed.sql` against production.** Run
      `db/schema.sql` only. If a demo/staging environment needs sample
      data, run seed.sql there specifically, never against the prod DB.
- [ ] Confirm `.env`, `.env.local` are gitignored and were never committed
      with real values.

## 2. Fixed a real gap just now: self-registration hospital validation

`self-registration.controller.ts` used to accept any `hospitalId` string
from the client without checking it existed — now validates the hospital
exists and `is_active = true` before creating an account against it.
Worth knowing this class of bug exists elsewhere too: **any endpoint that
accepts an id and trusts it without an existence/ownership check is a
potential IDOR.** Worth a deliberate pass over `prescriptions.py`, `lab.py`,
and `telemedicine.py` looking for the same pattern (e.g., does
`create_appointment`'s explicit `patientId` path get this same treatment?
Yes, already checked — but new endpoints added later should get the same
scrutiny).

## 3. CORS and network exposure

- [ ] `ALLOWED_ORIGINS` on the gateway — set to your actual production
      domain(s) only, not `localhost`.
- [ ] Confirm on Render that `ehr-service`, `ai-service`, `billing-service`,
      `notification-service` are genuinely `pserv` (private) and not
      accidentally deployed as `web` — a private service accidentally made
      public defeats the whole point of the architecture.
- [ ] Cloudflare (or equivalent) in front of the gateway's custom domain,
      per `DEPLOYMENT.md`.

## 4. Database

- [ ] Neon: enable point-in-time recovery / backups (check retention
      window matches your compliance needs).
- [ ] Confirm each service uses the **pooled** connection string except
      `search-sync`, which needs the **direct** one (LISTEN/NOTIFY).
- [ ] Run an actual migration tool (not just re-running `schema.sql`) for
      any future schema changes — this scaffold has no migration framework
      yet; adding one (e.g., node-pg-migrate, Alembic) before the schema
      changes again is worth doing now rather than after the first
      painful manual ALTER TABLE in production.

## 5. Observability — currently missing entirely

Nothing in this scaffold reports errors or metrics anywhere. Before real
traffic:
- [ ] Error tracking (Sentry or similar) in the gateway and both Python
      services at minimum — right now an unhandled exception just becomes
      a 500 with nothing recorded anywhere durable beyond Render's log
      retention window.
- [ ] Uptime monitoring on the gateway's public URL.
- [ ] At minimum, watch Render's built-in logs for each service during
      the first weeks of real traffic.

## 6. The two remaining stubs

- [ ] Telemedicine: either configure `DAILY_API_KEY` for real, or actively
      decide the stub is acceptable for launch (it isn't — the stub URL
      doesn't connect anyone to anyone).
- [ ] Insurance verification: decide whether format-checking is acceptable
      for launch, or whether you need a real eligibility check before
      trusting `insurance_verified` for any billing decision. Given no
      Nigerian insurer/HMO API is wired in yet, the honest default for
      launch is probably: treat every patient as self-pay regardless of
      this flag until a real integration exists.

## 7. Compliance

Patient health data in Nigeria falls under the NDPR (Nigeria Data
Protection Regulation) — analogous concerns to HIPAA in the US. Worth a
deliberate review (not something I can complete here) covering: data
retention policy, patient consent capture on registration, and breach
notification process.

`audit_logs` now actually gets written to (`app/audit.py`) — single-record
patient reads and prescription writes are covered; extend the same
`log_access()` call to lab results and telemedicine access if your
compliance review calls for it. Writes fail silently (by design — a
logging failure shouldn't break the request) but that also means a real
deployment needs alerting on audit-write failures specifically, or gaps in
the trail go unnoticed.

## 8. Load testing and rehearsal

- [ ] Run `infra/test-routes.sh` against the actual staging deployment
      (not just locally) before the first real patient touches it.
- [ ] Test the failure paths deliberately: what happens if Elasticsearch is
      down (should fall back to Postgres — verify it actually does), what
      happens if notification-service is down (bookings should still
      succeed — verify), what happens if billing-service is unreachable
      during prescription fulfillment (should surface the error, not lose
      the fulfillment — verify).

## What's already handled

- RBAC enforced server-side on every route, not just hidden in the UI
- RLS activated as defense-in-depth across all clinical routers
- Passwords bcrypt-hashed, refresh tokens rotated and revocable
- Rate limiting on login/register at the app level (`@Throttle`)
- Internal services unreachable from the public internet (Render private
  services / AWS security groups, depending on which path you deploy)
- SSL enforced automatically against Neon
