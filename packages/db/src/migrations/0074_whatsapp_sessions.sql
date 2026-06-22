-- WhatsApp paired-device sessions (Multi-Device via Baileys).
--
-- Per-store at-most-one active session (`store_id UNIQUE`). The Baileys
-- session blob (full auth state) is serialized to JSON then wrapped with
-- AES-256-GCM via commerce-core/encryption using the same
-- PAYMENT_CREDENTIALS_ENCRYPTION_KEY that already protects vendor
-- credentials. Plaintext credentials NEVER hit the DB, the logs, or any
-- API response.
--
-- `status` lifecycle:
--   `disconnected` — initial row, no credentials yet (or recovered after
--                    phone logged out / went offline for too long)
--   `pairing`      — QR is being shown to the merchant; awaiting scan
--   `connected`    — Baileys handshake complete; ready to send
--
-- Cross-tenant safety: every API call MUST validate that the resolved
-- session's store_id matches the request's store_id. The unique
-- constraint guarantees one session per store; the in-process Baileys
-- client registry is keyed by store_id with an explicit ACL check
-- before every send. This isolation is locked by an integration test
-- in WA-PR-2.

CREATE TABLE IF NOT EXISTS "whatsapp_sessions" (
  "id" serial PRIMARY KEY NOT NULL,
  "store_id" integer NOT NULL UNIQUE REFERENCES "stores"("id") ON DELETE cascade,
  "phone" varchar(20),
  "device_jid" varchar(100),
  "display_name" varchar(100),
  "status" varchar(20) DEFAULT 'disconnected' NOT NULL,
  "creds_encrypted" text,
  "last_seen_at" timestamp,
  "paired_at" timestamp,
  "disconnected_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "whatsapp_sessions_status_idx" ON "whatsapp_sessions" ("status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "whatsapp_sessions_last_seen_idx" ON "whatsapp_sessions" ("last_seen_at");
