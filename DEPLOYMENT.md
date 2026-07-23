# Deploying on Vercel + Render + Neon — no card, no Blueprint

This path avoids Render's payment-verification prompt entirely by using
only `type: web` services (the one service type Render's free plan doesn't
require a card for) and dropping Redis (BullMQ/pub-sub needed it; direct
HTTP calls between services don't). Each service is created manually in
the Render dashboard — no `render.yaml` blueprint.

**The real tradeoff, stated plainly:** every backend service is now
public on the internet, not just the gateway. There's no private
networking on Render's free tier to fall back on. The `x-internal-token`
signature check (already present on every cross-service call in this
system) is now the *only* thing stopping a random internet request from
reaching `ehr-service`, `ai-service`, `billing-service`, or
`notification-service` directly — not a defense-in-depth layer on top of
network isolation, but the actual boundary. Keep `INTERNAL_SERVICE_SECRET`
exactly as guarded as your JWT secrets.

## 1. Neon (Postgres)

Same as before — create a Neon project, run `db/schema.sql` (not
`db/seed.sql` in production), and use the **pooled** connection string for
every service except `search-sync`, which needs the **direct** one for
LISTEN/NOTIFY.

## 2. Render — create five Web Services manually

For each service below: Render dashboard → **New +** → **Web Service** →
connect this repo → set the fields shown → **Free** instance type → Create.

| Service | Root Directory | Build Command | Start Command |
|---|---|---|---|
| gateway | `apps/gateway` | `npm install && npm run build` | `node dist/main.js` |
| ehr-service | `apps/ehr-service` | `pip install -r requirements.txt` | `uvicorn app.main:app --host 0.0.0.0 --port $PORT` |
| ai-service | `apps/ai-service` | `pip install -r requirements.txt` | `uvicorn app.main:app --host 0.0.0.0 --port $PORT` |
| billing-service | `apps/billing-service` | `npm install && npm run build` | `node dist/main.js` |
| notification-service | `apps/notification-service` | `npm install && npm run build` | `node dist/main.js` |
| search-sync | `apps/search-sync` | `pip install -r requirements.txt` | `uvicorn app.main:app --host 0.0.0.0 --port $PORT` |

That's six, not five — `search-sync` is a background job wrapped in a
minimal FastAPI app (see the comment at the top of its `main.py`) purely so
it qualifies as a free Web Service instead of a paid Background Worker.

After each is created, note its public `https://<name>.onrender.com` URL —
you'll need them for the next step.

## 3. Environment variables per service

Copy `.env.example` values into each service's Render dashboard (Settings →
Environment), pointing the `*_SERVICE_URL` vars at the real `.onrender.com`
URLs from step 2 instead of `localhost`:

- **gateway**: `DATABASE_URL` (Neon pooled), `JWT_ACCESS_SECRET`,
  `JWT_REFRESH_SECRET`, `INTERNAL_SERVICE_SECRET`, `ALLOWED_ORIGINS` (your
  Vercel domain), `EHR_SERVICE_URL`, `AI_SERVICE_URL`, `BILLING_SERVICE_URL`
- **ehr-service**: `DATABASE_URL` (pooled), `INTERNAL_SERVICE_SECRET`,
  `ELASTICSEARCH_URL`, `BILLING_SERVICE_URL`, `NOTIFICATION_SERVICE_URL`
- **ai-service**: `INTERNAL_SERVICE_SECRET`, `ANTHROPIC_API_KEY`,
  `EHR_SERVICE_URL`, `NOTIFICATION_SERVICE_URL`
- **billing-service**: `DATABASE_URL` (pooled), `INTERNAL_SERVICE_SECRET`,
  `NOTIFICATION_SERVICE_URL`
- **notification-service**: `INTERNAL_SERVICE_SECRET` only
- **search-sync**: `DATABASE_URL` (**direct**, not pooled),
  `ELASTICSEARCH_URL`

Generate `INTERNAL_SERVICE_SECRET` once (e.g. `openssl rand -hex 32`) and
paste the exact same value into all six services.

## 4. Vercel (unchanged from before)

Root Directory `apps/web`; env vars `NEXT_PUBLIC_GATEWAY_URL`,
`GATEWAY_INTERNAL_URL` (both = your gateway's `.onrender.com` URL),
`JWT_ACCESS_SECRET` (must match the gateway's). Set `ALLOWED_ORIGINS` on
the gateway to your Vercel domain.

## 5. What you lose by skipping Redis

- **Notifications no longer retry with backoff** — each send attempts
  once, retries once after a short delay, then gives up and logs. No
  queue, no dead-letter view. Acceptable for a demo; add Redis back
  (Render's free Key Value tier, or Upstash) and restore the BullMQ
  version in `notification-service` if you need real delivery guarantees.
- **Free services sleep after 15 minutes idle.** `search-sync` in
  particular has no inbound traffic of its own, so it'll sleep and its
  LISTEN connection drops. Its startup sequence re-runs a full reindex
  every time it wakes (see the comment in `search-sync/app/main.py`), and
  the dual-backend search design (Elasticsearch primary, Postgres
  full-text fallback) means search keeps working with slightly stale
  results in between — this was already the fallback path for an ES
  outage, and now doubles as the fallback for search-sync being asleep.
  If staleness matters, an external free cron pinger (e.g. cron-job.org
  hitting each service's `/health` every 10 minutes) keeps them all awake.

## 6. Elasticsearch

Unchanged — Render has no managed Elasticsearch either way. Elastic Cloud,
or skip it and rely on the Postgres full-text fallback exclusively (drop
`search-sync` and `ELASTICSEARCH_URL` entirely if you go this route).

## 7. Firewall / WAF

Unchanged — Cloudflare in front of your custom domain, proxying to the
gateway's `.onrender.com` URL.

## What you no longer need

- `infra/terraform/*`, `infra/nginx/*`, `infra/waf/modsecurity.conf` — AWS-specific
- `render.yaml` — deliberately not used on this path; services are created
  manually per the table above
- `docker-compose.yml`'s Redis references — already removed; it's still
  useful for local dev (Postgres + Elasticsearch)
