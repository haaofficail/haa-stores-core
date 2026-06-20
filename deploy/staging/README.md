# Staging deployment runbook

Staging stack for Haa Stores: the four app images (api, storefront,
admin-dashboard, merchant-dashboard) from GHCR, plus Postgres, Redis, and a
Caddy reverse proxy with automatic HTTPS.

> **Scope: staging only.** Nothing here touches production or the production
> domain. Production deploys remain a manual, environment-protected step in
> `.github/workflows/deploy.yml`.

## Topology

```
                     ┌─────────────── Caddy (80/443, auto-TLS) ───────────────┐
  staging.haastores.com ──────────┐                                           │
  admin.staging.haastores.com ────┼─ API paths (/health,/s,/admin,/merchant,  │
  merchant.staging.haastores.com ─┘   /auth,/marketplace,/webhooks,...) → api │
                                   └─ everything else → matching SPA          │
                                                                              │
   api(3001) ── postgres(5432, localhost-only) ── redis(6379)                 │
```

The SPA images are built with `VITE_API_URL=''`, so each frontend calls the
API on its own origin via relative paths; Caddy forwards the API path prefixes
to the `api` service.

## One-time setup

### 1. GitHub environment `staging` (already configured)

Secrets: `STAGING_SSH_KEY`, `STAGING_HOST`, `STAGING_USER`,
`STAGING_DEPLOY_PATH`. Variables: `STAGING_URL`, `STAGING_HEALTH_URL`.
The deploy job runs a preflight that fails early with a clear message if any
are missing.

### 2. SSH key on the server

The deploy job authenticates with the `STAGING_SSH_KEY` private key. Put the
matching **public** key (`~/.ssh/haa_staging_deploy.pub`) in the server's
`~/.ssh/authorized_keys` (via the Hostinger panel → VPS → SSH key → Manage, or
`ssh-copy-id`).

### 3. DNS

Point these A records at the staging server (`72.61.108.208`):

```
staging.haastores.com           A   72.61.108.208
admin.staging.haastores.com     A   72.61.108.208
merchant.staging.haastores.com  A   72.61.108.208
```

Caddy needs ports 80/443 reachable to issue Let's Encrypt certificates.

### 4. Prepare the server

```bash
# on the server, as root
bash bootstrap-staging-server.sh         # Docker, compose, git, node, pnpm, /srv/haa-stores, firewall
```

### 5. Place config and bring the stack up

```bash
# copy these into /srv/haa-stores on the server
deploy/staging/docker-compose.yml
deploy/staging/Caddyfile
deploy/staging/.env.example      # -> /srv/haa-stores/.env  (fill in real secrets)

# generate strong secrets
openssl rand -hex 24   # JWT_SECRET / ADMIN_JWT_SECRET
openssl rand -hex 32   # ENCRYPTION_KEY
openssl rand -hex 16   # POSTGRES_PASSWORD (and the same value inside DATABASE_URL)

# first bring-up (validates config, pulls images, inits DB, health-checks)
bash scripts/server/install-staging-stack.sh
```

> `DATABASE_URL` and `POSTGRES_PASSWORD` must use the **same** password, and
> `DATABASE_URL` must point at host `postgres` (the compose service name).

## Continuous deploys

After the one-time setup, every push to `main` triggers
`.github/workflows/deploy.yml`:

1. builds and pushes the four images to GHCR (tagged `sha-<short>` + `staging`),
2. SSHes to the staging server, `docker compose pull && up -d` in
   `/srv/haa-stores`,
3. health-checks `https://staging.haastores.com/health` and rolls back on
   failure.

## Operations

```bash
cd /srv/haa-stores
docker compose ps                 # status
docker compose logs -f api        # tail a service
docker compose pull && docker compose up -d   # manual redeploy to :latest
docker compose down               # stop (keeps volumes/data)
```

## Database migrations

The api image has no migration tooling (production deps only). Schema changes
are applied from a repo checkout against the localhost-published Postgres —
`install-staging-stack.sh` does this on first run, and it is idempotent
(`pnpm db:bootstrap`). To re-apply after pulling new migrations:

```bash
cd /srv/haa-stores/src && git pull
set -a; . /srv/haa-stores/.env; set +a
DATABASE_URL="postgres://${POSTGRES_USER}:${POSTGRES_PASSWORD}@127.0.0.1:5432/${POSTGRES_DB}" pnpm db:migrate
```

## Hardening follow-up

Deploying as `root` is acceptable for the initial bring-up only. Once staging
is green, create a limited `deploy` user (docker group, ownership of
`/srv/haa-stores`), move the public key to it, and update `STAGING_USER`.
Tracked as a separate task.
