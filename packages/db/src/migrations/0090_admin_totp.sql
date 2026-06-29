-- TASK-0125 — admin TOTP enrollment storage.
-- Owner action required: do not apply automatically from agent tasks.

ALTER TABLE "users"
  ADD COLUMN "admin_totp_secret_encrypted" text,
  ADD COLUMN "admin_totp_pending_secret_encrypted" text,
  ADD COLUMN "admin_totp_pending_created_at" timestamp,
  ADD COLUMN "admin_totp_enabled_at" timestamp;

CREATE INDEX IF NOT EXISTS "users_admin_totp_enabled_idx"
  ON "users" ("id")
  WHERE "admin_totp_enabled_at" IS NOT NULL;
