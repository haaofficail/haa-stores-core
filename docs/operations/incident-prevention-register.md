# Haa Stores — Incident Prevention Register

> Part of the **Haa Stores Reliability & Incident Prevention Program**.
> Baseline & gate catalog: [`reliability-baseline.md`](./reliability-baseline.md).
>
> One row per known failure mode. Every row maps to a **root theme** (R1–R4),
> a **preventive gate** (G1–G12), and an **owner/status**. Gates and PR IDs are
> defined in the baseline doc. Scope excludes production and business logic.

## Legend

- **Root:** R1 late-bound contract · R2 context divergence · R3 implicit infra
  assumption · R4 insufficient gate.
- **Status:** ✅ gated · 🟡 partial · 🔴 gap (PR proposed).
- **Sev:** P0/P1/P2 per the baseline severity model.

---

## A. Build, toolchain & workspace

### INC-01 — GitHub Actions cache/path/input failures

- **Symptom:** `actions/cache` "Input required and not supplied: path"; flaky cache restore.
- **Root cause (R3/R4):** cache key/path depended on a step output that could be empty; no validation.
- **Impact:** intermittent red CI, wasted reruns.
- **Preventive gate:** G12 — pinned action versions + explicit, non-derived cache paths.
- **Runbook:** keep `cache-dependency-path: pnpm-lock.yaml`; never feed a step output into `path`.
- **Owner/Status:** Platform · ✅ (current `ci.yml` uses static paths).

### INC-02 — Node.js / action deprecation warnings

- **Symptom:** "Node.js 20 is deprecated … forced to run on Node.js 24" on every job.
- **Root cause (R4):** actions pinned to majors that shipped on the Node 20 runtime.
- **Impact:** annotation noise; future hard-fail when the runtime is removed.
- **Preventive gate:** G12 — currency review; bump to node24-runtime majors.
- **Runbook:** verify each action's `action.yml` `runs.using` before bumping; checkout v5, setup-node v5, pnpm/action-setup v5, upload-artifact v6, cache v5.
- **Owner/Status:** Platform · ✅ (done, PR #2).

### INC-03 — Typecheck failures from workspace package resolution (e.g. `@haa/theme-system`)

- **Symptom:** `tsc` cannot find a `@haa/*` package's types/exports.
- **Root cause (R2):** workspace package not built / not resolvable in the order tsc ran.
- **Impact:** red typecheck; blocked PRs.
- **Preventive gate:** G2 — build `packages/*` before app typecheck; verify the dependency graph.
- **Runbook:** `pnpm -r --filter './packages/**' build` precedes app `tsc`; keep `references`/`paths` consistent with `pnpm-workspace.yaml`.
- **Owner/Status:** Platform · 🟡 (build order exists in CI; no explicit graph assertion).

### INC-04 — DB package build failures

- **Symptom:** `@haa/db` build/typecheck errors; downstream packages fail.
- **Root cause (R2):** schema/codegen drift; `@haa/db` consumed before built.
- **Impact:** cascades to api, commerce-core, tests.
- **Preventive gate:** G2 — `@haa/db` is a leaf-first build; CI builds packages topologically.
- **Runbook:** never import `@haa/db` source across a package boundary without its `dist`.
- **Owner/Status:** Data · ✅ (CI builds packages first).

### INC-05 — api prod image missing compiled workspace deps (`@haa/shared/dist`)

- **Symptom:** container crash-loop: `ERR_MODULE_NOT_FOUND … @haa/shared/dist/index.js`.
- **Root cause (R2):** Dockerfile prod stage copied `packages/` **source** + only `apps/api/dist`; never the built `packages/*/dist`.
- **Impact:** api image fundamentally unbootable; only surfaced when staging first ran.
- **Preventive gate:** G2 — **boot the built api image in CI** (`docker run … node dist/index.js` with a fake env) so a missing dist fails the build, not staging.
- **Runbook:** prod stage overlays `COPY --from=build /repo/packages ./packages`.
- **Owner/Status:** Platform · ✅ fix shipped (PR #6); 🔴 CI boot-smoke still to add (PR-B).

### INC-06 — Lint failures / warnings (unused vars, exhaustive-deps, restricted imports)

- **Symptom:** `--max-warnings 0` blocks commit; CI annotations across `apps/*`.
- **Root cause (R4):** warnings accumulated; no zero-warning enforcement per touched file.
- **Impact:** noisy reviews; pre-commit blocks.
- **Preventive gate:** G11/G4 — lint-staged `--max-warnings 0`; periodic dir-level zero-warning passes.
- **Runbook:** clean warnings in the files you touch; use `useCallback`/explicit deps over blanket `eslint-disable`; document any disable.
- **Owner/Status:** App · 🟡 (admin-dashboard cleaned, PR #2; api middleware warnings remain — PR-I).

---

## B. Tests & data

### INC-07 — Test failures: Postgres `ECONNREFUSED 127.0.0.1:5432`

- **Symptom:** integration tests fail connecting to Postgres in CI.
- **Root cause (R3):** tests ran before the Postgres service container was accepting connections.
- **Impact:** flaky red test job.
- **Preventive gate:** G3 — service `--health` gate + explicit wait-for-postgres + fresh-DB bootstrap before tests.
- **Runbook:** CI `services.postgres` with healthcheck; `pnpm db:bootstrap` against it before `vitest run`.
- **Owner/Status:** Data · ✅ (current CI); 🟡 harden with an explicit readiness step (PR-C).

### INC-08 — Checkout / E2E fragility

- **Symptom:** `critical-path.spec.ts` flakey/red (hydration races, wrong locators, response-timing).
- **Root cause (R1/R4):** tests coupled to timing and to contract bugs (see INC-12); `waitForResponse` registered after the action.
- **Impact:** unreliable signal; masked real contract failures.
- **Preventive gate:** G9/G10 — deterministic E2E (register waiters before actions; testid selectors) + contract tests so E2E isn't the first place a shape break is found.
- **Runbook:** see `tests/e2e/critical-path.spec.ts`; always set up `waitForResponse` before the click; assert real API status before URL.
- **Owner/Status:** App · ✅ rewritten (PR #1); contract test pending (PR-H).

### INC-09 — Duplicate / non-idempotent migrations + orphan `0068`

- **Symptom:** fresh-DB replay emits `already exists`; bootstrap forced to tolerate errors. `0068_brand_color_defaults` applied by bootstrap glob but **not** in the drizzle journal.
- **Root cause (R1):** merge-artifact migrations re-created existing objects; no fresh-DB replay gate; no journal-completeness check.
- **Impact:** schema could silently end up incomplete; `pnpm db:migrate`-only path skips 0068.
- **Preventive gate:** G5 — CI fresh-DB replay with `ON_ERROR_STOP=1` + assert every `*.sql` is in `_journal.json`.
- **Runbook:** guard re-created objects with `IF NOT EXISTS` / `DO … EXCEPTION`; register every migration in the journal with a snapshot.
- **Owner/Status:** Data · ✅ idempotency + re-tightened bootstrap (PR #3); 🔴 CI replay+journal gate (PR-E); 🔴 register 0068 (separate task already filed).

---

## C. Contracts (API ↔ frontend ↔ env)

### INC-10 — `payment-methods` API/frontend contract mismatch

- **Symptom:** product page crash → `ErrorBoundary STORE-001`; `res.methods` undefined → `.filter` on undefined.
- **Root cause (R1):** endpoint returned a bare `string[]`; both callers expected `{ methods: PaymentMethodAvailability[] }`.
- **Impact:** storefront PDP unusable on the affected theme.
- **Preventive gate:** G10 — shared DTO type + a contract test that asserts the storefront endpoints' shapes.
- **Runbook:** endpoint wired to `PaymentProviderSettingsService` returning `{ methods }`; frontend guards non-array defensively.
- **Owner/Status:** App · ✅ fixed (PR #1); 🔴 contract test (PR-H).

### INC-11 — shipping-rates field-name mismatch

- **Symptom:** shipping options never selectable; `selectedShippingId` always undefined.
- **Root cause (R1):** provider returned `{ methodId, cost }`; frontend read `{ shippingMethodId, baseRate }`.
- **Impact:** checkout shipping step broken.
- **Preventive gate:** G10 — same DTO/contract test surface as INC-10.
- **Runbook:** route maps provider fields to the storefront `ShippingRate` contract.
- **Owner/Status:** App · ✅ fixed (PR #1); 🔴 contract test (PR-H).

### INC-12 — cart item quantity accessor bug

- **Symptom:** `/confirm` 500; malformed SQL `… sales_count = sales_count +  where …`.
- **Root cause (R1):** `item.quantity` undefined — cart items are `{ item, product, variant }`, quantity is `item.item.quantity`.
- **Impact:** order confirmation failed.
- **Preventive gate:** G10 + unit coverage on the confirm path's quantity handling.
- **Runbook:** access nested cart shape correctly; covered by the seeded confirm flow.
- **Owner/Status:** Commerce · ✅ fixed (PR #1).

### INC-13 — Env contract divergence (zod `optional` vs runtime `requireEnv`; `STORAGE_DRIVER=local` forbidden in staging)

- **Symptom:** api boots locally, refuses to boot in staging: `Missing required environment variable: DATABASE_READ_URL`; later `STORAGE_DRIVER=local not allowed`.
- **Root cause (R1/R2):** two sources of truth for "required" (zod schema vs `loadEnv` `requireEnv`), and staging mode silently raises the bar (S3, read-replica, observability).
- **Impact:** staging bring-up blocked late, one missing var at a time.
- **Preventive gate:** G1 — one declarative env contract per `NODE_ENV`, validated in CI and at boot, with a documented `.env.example` per environment.
- **Runbook:** `deploy/staging/.env.example` now lists every staging-required var (DATABASE_READ_URL, S3/MinIO, CDN/SENTRY/OTEL placeholders).
- **Owner/Status:** Platform · 🟡 `.env.example` complete (PR #6); 🔴 unify zod↔requireEnv + CI check (PR-A).

### INC-14 — Typography / design-token failures

- **Symptom:** theme/typography contract breaks; raw values where tokens exist.
- **Root cause (R1):** design tokens not enforced; drift between theme packages and consumers.
- **Impact:** inconsistent UI; regressions slip in.
- **Preventive gate:** G11 — lint rule for design tokens/typography; theme contract type-checked.
- **Runbook:** import icons/tokens via the sanctioned barrels; no raw hex where a token exists.
- **Owner/Status:** Design-system · 🔴 (PR-I).

---

## D. Infrastructure, deploy & secrets

### INC-15 — GHCR authentication failure on the server

- **Symptom:** `docker compose pull` → `denied`; private GHCR images unpullable on the VPS.
- **Root cause (R3):** packages are private; `deploy.yml` pulled on the server without logging in.
- **Impact:** deploy could build+push but never bring up the app images.
- **Preventive gate:** G8 — server logs into GHCR with the run-scoped `GITHUB_TOKEN` (piped over stdin) before pull; `packages: read` on the job.
- **Runbook:** see `deploy.yml` "Authenticate staging server to GHCR".
- **Owner/Status:** Platform · ✅ (PR #5).

### INC-16 — Postgres host port conflict (5432)

- **Symptom:** `bind 127.0.0.1:5432: address already in use` on bring-up.
- **Root cause (R3):** a host Postgres already listened on 5432; stack assumed the port free.
- **Impact:** data service wouldn't start.
- **Preventive gate:** G7 — server preflight asserts required host ports are free/owned before `up`.
- **Runbook:** staging compose publishes Postgres on `127.0.0.1:5433`; never wipe the host service.
- **Owner/Status:** Platform · ✅ workaround (PR #6); 🔴 preflight gate (PR-F).

### INC-17 — Caddy port 80/443 conflict (host nginx)

- **Symptom:** `bind 0.0.0.0:80: address already in use`; ACME could not bind.
- **Root cause (R3):** a pre-existing host nginx (an earlier manual staging attempt) owned 80/443.
- **Impact:** no reverse proxy / TLS for the containerized stack.
- **Preventive gate:** G7 — same port-ownership preflight; document the chosen proxy as the sole 80/443 owner.
- **Runbook:** host nginx **stopped + disabled** (reversible; configs/certs preserved); Caddy owns 80/443.
- **Owner/Status:** Platform · ✅ resolved; 🔴 preflight gate (PR-F).

### INC-18 — Container DNS broke ACME (`127.0.0.53` unreachable)

- **Symptom:** Caddy cert issuance fails: `lookup … on 127.0.0.53:53: connection refused`.
- **Root cause (R3):** containers inherited the host's systemd-resolved stub, unreachable from the container netns.
- **Impact:** no TLS certificates issued.
- **Preventive gate:** G7 (infra preflight) — pin public resolvers for outbound-dependent services.
- **Runbook:** Caddy service `dns: [1.1.1.1, 8.8.8.8]`.
- **Owner/Status:** Platform · ✅ (PR #6).

### INC-19 — Hardcoded CI secrets in workflow

- **Symptom:** secret/credential literals present in workflow/runbook history.
- **Root cause (R4):** no secret scanning; secrets pasted instead of referenced.
- **Impact:** credential exposure risk.
- **Preventive gate:** G4 — secret-scan gate (e.g. gitleaks) blocks PRs; secrets only via `${{ secrets.* }}` / env files.
- **Runbook:** rotate any exposed secret; reference, never inline.
- **Owner/Status:** Security · 🔴 (PR-D).

### INC-20 — Temporary `root` deploy / no `deploy` user

- **Symptom:** deploy authenticates as `root`.
- **Root cause (R4):** initial bring-up convenience; least-privilege not yet applied.
- **Impact:** over-broad blast radius for the deploy key.
- **Preventive gate:** G6 + hardening — dedicated `deploy` user (docker group), disable root SSH + password auth.
- **Runbook:** create `deploy`, move the public key, set `STAGING_USER=deploy`, `PasswordAuthentication no`.
- **Owner/Status:** Platform · 🔴 (PR-K / filed task).

### INC-21 — Insufficient post-deploy smoke gate

- **Symptom:** deploy "green" while a real journey (storefront PDP) was broken; only `/health` was checked.
- **Root cause (R4):** health check too shallow (process up ≠ product works).
- **Impact:** false-green deploys.
- **Preventive gate:** G9 — post-deploy smoke asserts: storefront page is HTML (not API JSON), `/api` store + products + payment-methods return `success:true`, before declaring success.
- **Runbook:** extend `deploy.yml` health step into a smoke script hitting the key endpoints.
- **Owner/Status:** Platform · 🟡 (`/health` only today); 🔴 smoke gate (PR-G).

---

## E. PR plan (small, independent, no business-logic coupling)

| PR   | Gate | Title                                                                       | Sev |
| ---- | ---- | --------------------------------------------------------------------------- | --- |
| PR-A | G1   | `chore(env): unify env contract (zod ⇄ requireEnv) + CI env-contract check` | P0  |
| PR-B | G2   | `ci: boot-smoke the built api image to catch missing workspace dist`        | P0  |
| PR-C | G3   | `ci: explicit postgres readiness gate before tests`                         | P1  |
| PR-D | G4   | `ci(security): add secret-scan gate (gitleaks)`                             | P0  |
| PR-E | G5   | `ci(db): fresh-DB replay + journal-completeness gate`                       | P1  |
| PR-F | G7   | `deploy: server port/resource-ownership preflight`                          | P1  |
| PR-G | G9   | `deploy: post-deploy smoke gate (storefront + /api journeys)`               | P0  |
| PR-H | G10  | `test(contract): storefront API ⇄ frontend DTO contract tests`              | P1  |
| PR-I | G11  | `lint: api middleware warnings + design-token enforcement`                  | P2  |
| PR-J | G12  | `ci: toolchain-currency scheduled review`                                   | P2  |
| PR-K | —    | `deploy(hardening): dedicated deploy user, lock down root SSH`              | P1  |

> Sequencing: land the **P0** gates first (false-green prevention: PR-A, PR-B,
> PR-D, PR-G), then P1, then P2. Each PR adds exactly one gate and touches no
> checkout/payment/business logic and no production path.
