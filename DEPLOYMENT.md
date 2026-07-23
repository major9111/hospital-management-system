# Deploying on Vercel + Render + Neon

The `infra/terraform` and `infra/nginx` files in this repo assume a
self-managed AWS deployment. If you're deploying to Vercel/Render/Neon
instead (no AWS account, no servers to manage), ignore those two folders
entirely and use this guide + `render.yaml` instead.

## 1. Neon (Postgres)

1. Create a Neon project. Run `db/schema.sql` then `db/seed.sql` against it
   (Neon's SQL Editor works, or `psql <direct-connection-string> -f db/schema.sql`).
2. Neon gives you **two** connection strings — use them for different things:
   - **Pooled** (hostname contains `-pooler`): use this for the gateway,
     ehr-service, billing-service — anything doing normal request/response
     queries.
   - **Direct** (no `-pooler`): use this ONLY for `search-sync`. Its
     LISTEN/NOTIFY-based sync doesn't work reliably through Neon's pooled
     (PgBouncer transaction-mode) endpoint — the connection needs to stay a
     single dedicated session.
3. Both connection strings already include `?sslmode=require`; the pg
   pools in this repo detect `neon.tech` in the URL and enable SSL
   automatically either way.

## 2. Render (backend services)

`render.yaml` in the repo root is a Render Blueprint — connect this repo in
the Render dashboard ("New +" → "Blueprint") and it provisions:

- **`gateway`** — the only public-facing service (`type: web`)
- **`ehr-service`, `ai-service`, `billing-service`, `notification-service`**
  — private services (`type: pserv`), reachable only from other services
  in the same Render team via internal hostnames like `http://ehr-service:8001`
  — never from the public internet. This is what the AWS security-group
  setup in `infra/terraform` was doing with VPC subnets; Render's private
  services give you the same isolation without needing a VPC at all.
- **`search-sync`** — a background worker (`type: worker`), no HTTP port at all
- **`hospital-redis`** — Render's managed Redis, used for BullMQ queues,
  rate-limit state, and the pub/sub events between services

After the blueprint deploys, fill in the `sync: false` env vars in the
Render dashboard for each service (Neon connection strings, `ANTHROPIC_API_KEY`,
`ALLOWED_ORIGINS`, and the Elasticsearch URL — see below). Generate
`INTERNAL_SERVICE_SECRET` once and paste the *same* value into every
service that needs it (gateway generates it; copy it into ehr-service,
ai-service, billing-service).

## 3. Vercel (Next.js frontend)

1. Import the repo into Vercel, and in the project settings set **Root
   Directory** to `apps/web` (Vercel needs this since it's a monorepo).
2. Set these env vars in Vercel's dashboard:
   - `NEXT_PUBLIC_GATEWAY_URL` — your Render gateway service's public URL
   - `GATEWAY_INTERNAL_URL` — same URL (there's no private network between
     Vercel and Render, so both server and browser calls go over the public
     internet to the gateway — fine, since that's the one service designed
     to be public)
   - `JWT_ACCESS_SECRET` — must match the gateway's exactly (needed here
     only to decode roles for UI routing, never as an authorization
     decision by itself)
3. On the gateway (Render), set `ALLOWED_ORIGINS` to your Vercel domain(s),
   e.g. `https://your-app.vercel.app,https://your-custom-domain.com` — CORS
   in `main.ts` already reads this.

## 4. Elasticsearch

Render has no managed Elasticsearch. Two options:

- **Elastic Cloud** (elastic.co) — free trial, straightforward
  `ELASTICSEARCH_URL` to drop into `ehr-service` and `search-sync`.
- **Skip it entirely** — if search volume is modest, swap `search.py` and
  `search-sync` for Postgres full-text search (`tsvector` + a GIN index on
  `patients.full_name`) and drop the Elasticsearch service completely. This
  is a reasonable simplification if you'd rather not run/pay for a third
  data store — say the word and I'll make that swap.

## 5. Firewall / WAF

Render doesn't offer a WAF the way the AWS setup in `infra/terraform` did
with WAFv2. The straightforward equivalent on this stack: put your custom
domain in front of the Render gateway through **Cloudflare** (free tier
works) — its WAF rules, rate limiting, and DDoS protection sit in front of
Render the same way AWS WAF sat in front of the ALB. Point your domain's
DNS at Cloudflare, then Cloudflare proxies to your Render gateway URL.

## What you no longer need

- `infra/terraform/*` — AWS-specific, skip entirely on this stack
- `infra/nginx/*`, `infra/waf/modsecurity.conf` — Render terminates TLS and
  load-balances for you; there's no server to put NGINX in front of
- `docker-compose.yml` — still useful for **local development** (spins up
  Postgres/Redis/Elasticsearch on your machine) but not for production,
  since Neon/Render-Redis/Elastic-Cloud replace those three
