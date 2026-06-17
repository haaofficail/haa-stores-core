-- Marketplace order tracking via cryptographically-random accessToken.
--
-- TASK-0040 Track 1B — P0-3 launch blocker.
-- Replaces `?phone=` enumeration vector (phone space ~10M × 600/10min
-- rate limit ≈ 86,400 attempts/day per IP → ~1% phone enumeration per day).
-- Mirrors the support-ticket accessToken pattern (R-0014, see
-- packages/db/src/schema/support-tickets.ts:17).
--
-- Plan: docs/ops/MARKETPLACE_HARDENING_PLAN.md §3 Track 1B.
--
-- Implementation contract:
--   - access_token is uuid (122-bit entropy, not guessable)
--   - defaultRandom() so existing rows get a fresh token at migration time
--   - unique index for O(log n) lookup + collision safety
--   - POST /orders returns the token ONCE in the response body
--   - GET /orders/:num requires ?access_token= (or legacy ?phone= for transition)

ALTER TABLE "marketplace_orders"
  ADD COLUMN IF NOT EXISTS "access_token" uuid NOT NULL DEFAULT gen_random_uuid();

-- Backfill any rows that pre-existed without defaultRandom (defense-in-depth).
UPDATE "marketplace_orders"
SET "access_token" = gen_random_uuid()
WHERE "access_token" IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "marketplace_orders_access_token_idx"
  ON "marketplace_orders" ("access_token");
