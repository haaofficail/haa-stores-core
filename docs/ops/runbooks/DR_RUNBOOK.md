# Disaster Recovery Runbook — Haa Stores

**Audit reference:** P2-005 of the 2026-06-23 deep audit.
**Companion policy doc:** `docs/ops/OWNER_ACTION_G10_DR_PLAN.md` (G10 owner action — RTO/RPO commitments, NCA compliance framing).
**Companion incident log:** `docs/ops/INCIDENTS.md` (post-mortem template + history).
**Audience:** on-call engineer + owner. Assumes shell access to the approved server (`72.61.108.208`).

---

## 0. Pre-flight (run BEFORE you need this runbook)

| Check                           | How                                                                                       | Frequency            |
| ------------------------------- | ----------------------------------------------------------------------------------------- | -------------------- |
| Backup files exist              | `ssh haa@72.61.108.208 'ls -lah /var/lib/postgresql/data/backup-*.sql'`                   | Weekly               |
| Backup is restorable            | Restore the latest into a throwaway DB (procedure §5)                                     | Monthly              |
| Compose project name is current | `ssh haa@72.61.108.208 'docker compose -p haa-staging ps --format json' \| jq '.[].Name'` | Each deploy          |
| Disk has > 20 GB free           | `ssh haa@72.61.108.208 'df -h /var'`                                                      | Daily monitor        |
| .env file has correct DB creds  | `ssh haa@72.61.108.208 'sudo -u haa cat /srv/haa-stores/.env \| grep POSTGRES_'`          | Before any DR action |

**Do not skip these.** The point of a DR plan is that on the worst day, the procedure works. Untested backups are not backups.

---

## 1. RTO / RPO targets

From `OWNER_ACTION_G10_DR_PLAN.md` §1:

| System                       | Tier          | RTO      | RPO             |
| ---------------------------- | ------------- | -------- | --------------- |
| PostgreSQL                   | 1 (critical)  | 1 hour   | 15 minutes      |
| API                          | 2 (essential) | 4 hours  | N/A (stateless) |
| Storefront                   | 2             | 4 hours  | N/A (stateless) |
| Merchant dashboard           | 2             | 4 hours  | N/A (stateless) |
| Static assets (logos/images) | 3             | 24 hours | 24 hours        |

If your action will breach an RTO, page the owner before starting.

---

## 2. When to invoke this runbook

| Signal                                           | First action                                             |
| ------------------------------------------------ | -------------------------------------------------------- |
| `/api/health` returns non-200 from public DNS    | §3 (Service down)                                        |
| `/api/health` returns 200 but `db: disconnected` | §3 → §4 (DB down)                                        |
| Customer reports order data is wrong / missing   | §6 (Data corruption)                                     |
| Provider reports failed webhook delivery loop    | `INCIDENTS.md` template — log it FIRST, then triage      |
| Disk usage > 90% on the server                   | §7 (Disk pressure)                                       |
| Unknown — paged at 03:00 with no detail          | §3 + open a `INC-YYYYMMDD-NNN` entry while investigating |

---

## 3. Service down — health check failing

```bash
ssh haa@72.61.108.208
cd /srv/haa-stores
# 1. Are containers up?
docker compose -p haa-staging ps

# 2. If api container is unhealthy:
docker compose -p haa-staging logs --tail=200 api

# 3. If just the api process is dead — restart only it
docker compose -p haa-staging restart api
sleep 10
curl -fs http://localhost:3001/health  # internal check

# 4. If the whole compose is dead — bring it up
docker compose -p haa-staging up -d

# 5. If a build is stuck (image absent) — pull the last known good
docker compose -p haa-staging pull
docker compose -p haa-staging up -d
```

External verification:

```bash
curl -s https://merchant.staging.haastores.com/api/health | jq
```

Expected: `{ "api": "ok", "db": "connected", "redis": "connected", "queue": { "backend": "bullmq", "mode": "persistent" } }`.

---

## 4. Database down

### 4.1 Triage (60 seconds)

```bash
ssh haa@72.61.108.208
cd /srv/haa-stores
docker compose -p haa-staging ps postgres  # is the container even up?
docker compose -p haa-staging logs --tail=100 postgres
docker compose -p haa-staging exec -T postgres pg_isready -U haa
```

### 4.2 Recoverable — postgres container crashed but data intact

```bash
docker compose -p haa-staging restart postgres
sleep 15
docker compose -p haa-staging exec -T postgres pg_isready -U haa
docker compose -p haa-staging restart api  # api caches connection pools — bounce it
```

### 4.3 Data volume corrupted — restore from backup

**STOP.** If you are about to restore, you MUST:

1. Take a fresh `pg_dump` of the broken volume first (forensics).
2. Notify the owner before the restore — RPO is 15 min, anything older than that means you're acknowledging the loss window.

```bash
# 1. Forensic dump (best effort — may fail if DB is too broken)
docker compose -p haa-staging exec -T postgres \
  pg_dump -U haa haastores > /tmp/forensic-$(date +%Y%m%d-%H%M%S).sql || \
  echo "forensic dump failed — proceed, but log this"

# 2. Stop api so writes don't race the restore
docker compose -p haa-staging stop api

# 3. Identify the freshest backup
ssh haa@72.61.108.208 'ls -t /var/lib/postgresql/data/backup-*.sql | head -3'

# 4. Drop + recreate the DB
docker compose -p haa-staging exec -T postgres \
  psql -U haa -c "DROP DATABASE IF EXISTS haastores; CREATE DATABASE haastores;"

# 5. Restore the chosen backup
BACKUP=/var/lib/postgresql/data/backup-pre-<RUN_ID>.sql  # <-- substitute
docker compose -p haa-staging exec -T postgres \
  psql -U haa -d haastores < "$BACKUP"

# 6. Sanity check
docker compose -p haa-staging exec -T postgres \
  psql -U haa -d haastores -c "SELECT count(*) FROM stores"
docker compose -p haa-staging exec -T postgres \
  psql -U haa -d haastores -c "SELECT tag FROM __drizzle_migrations ORDER BY id DESC LIMIT 5"

# 7. Bring api back
docker compose -p haa-staging start api
curl -fs https://merchant.staging.haastores.com/api/health | jq
```

### 4.4 After restore — log it

Open `docs/ops/INCIDENTS.md` and create an `INC-` entry with:

- The backup file used + its timestamp.
- The data loss window (now − backup time).
- Affected stores / order ranges if known.
- A re-sync plan (e.g. ask payment providers to redeliver webhooks for the window).

---

## 5. Monthly restore drill

The drill validates that backups are restorable AND that the restore procedure still works. **Run it monthly. A backup you've never restored is not a backup.**

```bash
# On a workstation (NOT production). Local docker.
docker run --rm -d --name dr-drill -p 6543:5432 \
  -e POSTGRES_USER=haa -e POSTGRES_PASSWORD=drill -e POSTGRES_DB=drill \
  postgres:16-alpine

# Copy the latest staging backup down
scp haa@72.61.108.208:/var/lib/postgresql/data/backup-pre-<RUN_ID>.sql /tmp/

# Restore into the drill DB
psql -h localhost -p 6543 -U haa -d drill < /tmp/backup-pre-<RUN_ID>.sql

# Verify the schema migrations table is present + the count is what we expect
psql -h localhost -p 6543 -U haa -d drill -c "SELECT count(*) FROM __drizzle_migrations"
psql -h localhost -p 6543 -U haa -d drill -c "SELECT count(*) FROM stores"

# Teardown
docker rm -f dr-drill
rm /tmp/backup-pre-<RUN_ID>.sql
```

**Record the result** in `docs/ops/INCIDENTS.md` as a `DRILL-YYYYMMDD` entry — backup file used, restore time, row count delta vs. live.

---

## 6. Data corruption — wrong rows in production

This is **not** a DB-down scenario. The DB is fine; the data is wrong (bad webhook, double-credit, missing order line). Do NOT restore from backup unless the corruption window is < 15 minutes; restoring loses every legitimate write since then.

### 6.1 Procedure

1. **Stop the offending write source first.** If it's a webhook loop, disable the provider in admin (or block the public route in nginx). Bleeding from the wound is more urgent than the bandage.
2. **Snapshot the bad rows** to a side table for forensics:
   ```sql
   CREATE TABLE incident_<INC_ID>_snapshot AS
   SELECT * FROM affected_table WHERE <condition>;
   ```
3. **Reproduce + fix** in code first (failing test → fix → green).
4. **Compose a remediation SQL** that's _idempotent_ and gated by a WHERE clause that re-checks the corruption signature. Have a second engineer review before running.
5. **Run inside a transaction** with `BEGIN; ... ; ROLLBACK;` first to inspect, then `COMMIT;` only when sure.
6. **Log it** in `INCIDENTS.md`.

### 6.2 Examples we've actually had to fix

- **PROBLEM-014 (PR #124):** webhook dedup race produced double `paymentWebhookEvents` rows. Remediation: leave the rows, fix the route (already done — race-recovery now returns 200 not 400). No data fix needed because the wallet credit was always behind a separate idempotency check.

---

## 7. Disk pressure

```bash
ssh haa@72.61.108.208
df -h /var
du -h /var/lib/postgresql/data | sort -h | tail -10
du -h /srv/haa-stores | sort -h | tail -10
docker system df
```

Common culprits + actions:

| Culprit          | Action                                                                                                      |
| ---------------- | ----------------------------------------------------------------------------------------------------------- |
| Old backup files | `find /var/lib/postgresql/data -name 'backup-*.sql' -mtime +30 -delete` (keep last 30 days)                 |
| Container logs   | `docker compose -p haa-staging logs --tail=0 > /dev/null` + check `/var/lib/docker/containers/*/*-json.log` |
| Dangling images  | `docker image prune -af` (safe — does not touch running images)                                             |
| **NEVER**        | `docker volume prune` — would delete the postgres data volume. **Explicitly forbidden by CLAUDE.md.**       |

---

## 8. Failover (future — production server NOT yet provisioned)

Per CLAUDE.md, the approved server `72.61.108.208` is `staging` with `production_candidate` role and `production_status: not_promoted_yet`. There is **no failover target today**. RTO targets above assume single-server recovery via §3/§4.

When production is provisioned (separate G-action), this section gains:

- Production primary + standby pair definitions.
- DNS cutover procedure (Cloudflare / whichever DNS provider).
- Postgres streaming replication setup + promotion procedure.

Until then, **do not invent a failover plan in this file**.

---

## 9. Communications during an incident

1. **First message to the owner** within 15 minutes of detection. Format:
   - What's broken (one sentence).
   - Who's affected (all merchants / one merchant / public site / merchant dashboard).
   - What you're doing right now.
   - When you'll send the next update.
2. **Customer-facing comms** is owner-decision. Do not post to public channels without explicit approval.
3. **Status page** does not exist yet (separate owner task). Until then, use the merchant Telegram / WhatsApp channel under owner direction.

---

## 10. Post-incident

Within 48 hours of resolution:

1. Open the `INC-YYYYMMDD-NNN` entry in `docs/ops/INCIDENTS.md` with the full template populated.
2. Identify prevention tasks (was there a missing guardrail / test / monitor?).
3. File them as P0/P1 in the audit if not already tracked.
4. Update this runbook if any procedure needed correcting mid-incident.

The runbook is a living document. Stale runbooks fail at 3 AM.
