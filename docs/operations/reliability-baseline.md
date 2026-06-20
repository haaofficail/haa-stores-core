# Haa Stores — Reliability & Incident Prevention Baseline

> Part of the **Haa Stores Reliability & Incident Prevention Program**.
> Companion document: [`incident-prevention-register.md`](./incident-prevention-register.md).
>
> Scope: engineering reliability (CI, build, DB, deploy, staging). **Not**
> production deployment, and **not** checkout/payment/business logic. This
> document records the stable baseline and the gates that keep us there — it is
> a governance/reference doc, not a change to running systems.

## 1. Purpose

Every incident this codebase has hit so far was preventable by a gate that runs
_before_ the failure can reach a human. This program reframes a backlog of
one-off fixes as a small set of **preventive gates** mapped to **shared root
causes**. The goal is simple: each class of failure becomes impossible to
re-introduce silently, because a gate fails the PR or the deploy first.

## 2. Current stable baseline (2026-06-20)

| Area                  | State                                                                    |
| --------------------- | ------------------------------------------------------------------------ |
| CI (`ci.yml`)         | Green: Preflight, Lint, Typecheck, Test (2674), E2E (chromium), 4× Build |
| Migrations            | Idempotent; fresh-DB bootstrap applies 65/0; drizzle journal tracked     |
| Staging               | Live at `https://staging.haastores.com` (HTTPS, DB seeded, API healthy)  |
| Deploy (`deploy.yml`) | Build→GHCR→SSH→compose pull/up→health-check→rollback                     |
| Production            | **Frozen** — manual, environment-protected, out of scope here            |

Anything that regresses this baseline is an incident. The register tracks how
each known failure mode is now (or should be) gated.

## 3. The environment matrix (where divergence bites)

Most incidents trace to **the same code behaving differently across contexts**
because each context builds and configures itself differently. Making these
columns converge — or explicitly contracting their differences — is the core of
the program.

| Concern             | Local dev               | CI (`ci.yml`)             | Docker prod image                                        | Staging server                                                    |
| ------------------- | ----------------------- | ------------------------- | -------------------------------------------------------- | ----------------------------------------------------------------- |
| pnpm version        | developer's             | pinned `10`               | pinned `10` (Dockerfile)                                 | was 11.8 (corepack default) → **drift**                           |
| Install mode        | `install`               | `--frozen-lockfile`       | `--prod --ignore-scripts`                                | `--no-frozen-lockfile` (overrides drift)                          |
| Env requirements    | relaxed (`development`) | test env                  | n/a (build)                                              | strict (`staging` ⇒ S3, read-replica, observability **required**) |
| Workspace `dist/`   | built on demand         | built per job             | **only `apps/*/dist`** copied (api missed `@haa/*/dist`) | built from repo clone                                             |
| Postgres            | container `:5432`       | service container `:5432` | n/a                                                      | host PG on `:5432` (clash) → stack uses `:5433`                   |
| Reverse proxy / TLS | none                    | none                      | none                                                     | Caddy `:80/:443` (clashed with host nginx)                        |
| Object storage      | local/minio             | n/a                       | n/a                                                      | MinIO (local forbidden in staging)                                |

**Rule going forward:** when a context needs different behaviour, that
difference must be _declared and validated_ (a contract or a preflight), never
left implicit.

## 4. Shared root causes

The 17 tracked incidents collapse into four root themes:

- **R1 — Late-bound contracts.** Env requirements, API↔frontend shapes, and
  migration expectations were validated at runtime/deploy instead of at PR
  time. Examples: `DATABASE_READ_URL` required at boot but `optional` in the
  zod schema; `payment-methods` returning `string[]` vs `{methods:[…]}`;
  duplicate migrations only failing on a fresh DB.
- **R2 — Context divergence.** The same code built/ran differently across
  dev/CI/Docker/staging. Examples: pnpm 10 vs 11; api prod image missing
  `@haa/*/dist`; `STORAGE_DRIVER=local` fine locally, fatal in staging.
- **R3 — Implicit infrastructure assumptions.** Ports, registry auth, DNS and
  host services were assumed available/free with no preflight. Examples:
  host Postgres on 5432; host nginx on 80/443; GHCR private + no server login;
  container DNS via unreachable systemd-resolved stub.
- **R4 — Insufficient gates.** Failures were caught by humans in prod-like
  environments rather than by automated gates. Examples: no post-deploy smoke
  beyond `/health`; hardcoded secrets in a workflow; toolchain deprecations
  noticed only as CI annotations.

## 5. Gate catalog

Each gate maps to root themes and to the incidents it closes (see the register
for the incident IDs). "Status" is the _current_ reality; "Target PR" is the
small change proposed to implement or harden it.

| #   | Gate                                                                                                                                 | Runs at         | Closes | Status                               | Target PR     |
| --- | ------------------------------------------------------------------------------------------------------------------------------------ | --------------- | ------ | ------------------------------------ | ------------- |
| G1  | **CI env contract** — single source of truth for required env per `NODE_ENV`, validated in CI and reused by the app                  | CI + app boot   | R1, R2 | Partial (zod ≠ runtime `requireEnv`) | PR-A          |
| G2  | **Workspace graph / prod-image boot** — build all `packages/*` and smoke-boot the api image so missing `dist/` fails the build       | CI (build job)  | R2     | Gap (caught only in staging)         | PR-B          |
| G3  | **DB readiness** — wait-for-postgres before tests; fresh-DB bootstrap in CI                                                          | CI (test job)   | R3     | Have (service `healthy` + bootstrap) | PR-C (harden) |
| G4  | **No hardcoded secrets** — secret scan blocks PRs                                                                                    | CI              | R4     | Gap                                  | PR-D          |
| G5  | **Migration safety** — fresh-DB replay with `ON_ERROR_STOP=1` + journal-completeness check (no orphans like 0068)                    | CI              | R1     | Partial (replay manual)              | PR-E          |
| G6  | **Deploy preflight** — required secrets/vars present before SSH                                                                      | Deploy          | R3, R4 | Have (added)                         | —             |
| G7  | **Port / resource ownership** — server preflight asserts 80/443/5433 free (or owned by our stack) before bring-up                    | Deploy (server) | R3     | Gap                                  | PR-F          |
| G8  | **GHCR auth** — server logs into GHCR with run-scoped token before pull                                                              | Deploy          | R3     | Have (added)                         | —             |
| G9  | **Post-deploy smoke** — assert key journeys (storefront page renders, `/api` store + products + payment-methods, not just `/health`) | Deploy          | R1, R4 | Weak (`/health` only)                | PR-G          |
| G10 | **API↔frontend contract** — shared DTO types + a contract test for storefront endpoints                                              | CI              | R1     | Gap                                  | PR-H          |
| G11 | **Design-system enforcement** — lint design tokens / typography; no raw hex where a token exists                                     | CI (lint)       | R1     | Partial                              | PR-I          |
| G12 | **Toolchain currency** — pinned action/Node/pnpm versions + a scheduled review so deprecations are planned, not surprises            | CI + schedule   | R4     | Have (pinned) + Gap (review)         | PR-J          |

## 6. Severity model

- **P0** — can break the staging baseline or hide a real regression (false
  green). Fix/gate before further feature work.
- **P1** — recurring friction or a latent foot-gun that will bite the next
  contributor; gate within the current cycle.
- **P2** — hygiene/ergonomics; gate opportunistically.

## 7. Ownership

Until a rotation exists, the deploying engineer owns the gates touched by their
change. Each register row carries an explicit owner/status. Gates live with the
thing they protect: CI gates in `.github/workflows/ci.yml`, deploy gates in
`deploy.yml` + `scripts/server/`, contract gates next to the code they contract.

## 8. How to use this program

1. New incident → add a row to the register (symptom → root → gate).
2. If no existing gate would have caught it, propose the smallest gate that
   would, as its own PR (see the register's PR plan).
3. Never bundle a gate with business logic or a wide refactor.
