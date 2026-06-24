-- Phone-first registration — partial UNIQUE index on users.phone
--
-- Postgres UNIQUE indexes allow multiple NULLs by default (the SQL
-- standard), so we don't need to backfill existing rows with NULL
-- phones. A WHERE clause makes intent explicit: only non-NULL
-- phone values must be unique. New signups carry a phone (enforced
-- at the API layer); legacy accounts can still log in via email
-- until they complete their profile.
--
-- NOT auto-applied. Run via ops-staging-migrate workflow.
CREATE UNIQUE INDEX IF NOT EXISTS "users_phone_unique"
  ON "users" ("phone")
  WHERE "phone" IS NOT NULL;
