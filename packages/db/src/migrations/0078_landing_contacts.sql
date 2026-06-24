-- HAA-LAND-001: Create landing_contacts table.
--
-- Captures contact submissions from the public landing page
-- `<section id="contact">` on `/`. The POST endpoint is unauthenticated,
-- rate-limited (5/hour/IP at the middleware AND service layers), and
-- honeypot-guarded.
--
-- Lifecycle status (string column, validated at the app layer via
-- LANDING_CONTACT_STATUSES):
--   - 'new'         — fresh submission, not yet acknowledged
--   - 'in_progress' — admin opened it / started replying
--   - 'replied'     — admin sent a manual response (no inbound thread)
--   - 'closed'      — resolved, no further action
--   - 'spam'        — admin flagged as abuse / bot
--
-- Indexes:
--   - (status, created_at) — admin inbox view: filter by status, newest first
--   - (created_at)         — global recent-submissions / spam-rate analytics
--
-- This migration is idempotent (IF NOT EXISTS everywhere). It is NOT
-- auto-applied by deploy. Per owner directive, run it manually via the
-- ops-staging-migrate workflow.

CREATE TABLE IF NOT EXISTS "landing_contacts" (
  "id" serial PRIMARY KEY NOT NULL,
  "name" varchar(120) NOT NULL,
  "email" varchar(255) NOT NULL,
  "phone" varchar(30),
  "message" text NOT NULL,
  "source_ip" varchar(45),
  "user_agent" text,
  "status" varchar(20) DEFAULT 'new' NOT NULL,
  "admin_user_id" integer,
  "admin_notes" text,
  "replied_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "landing_contacts_status_created_at_idx"
  ON "landing_contacts" ("status", "created_at");

CREATE INDEX IF NOT EXISTS "landing_contacts_created_at_idx"
  ON "landing_contacts" ("created_at");
