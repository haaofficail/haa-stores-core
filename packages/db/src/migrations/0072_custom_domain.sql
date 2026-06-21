-- Custom domain (QA Custom Domain) — let a merchant point their own domain
-- at their store. Bare normalized domain + verification state machine.
--
-- The unique index guards against two stores claiming the same domain
-- (domain takeover). NULLs are distinct in Postgres btree, so unclaimed
-- stores (custom_domain IS NULL) don't collide.

ALTER TABLE "stores" ADD COLUMN "custom_domain" varchar(253);--> statement-breakpoint
ALTER TABLE "stores" ADD COLUMN "custom_domain_status" varchar(20) DEFAULT 'none' NOT NULL;--> statement-breakpoint
ALTER TABLE "stores" ADD COLUMN "custom_domain_token" varchar(64);--> statement-breakpoint
ALTER TABLE "stores" ADD COLUMN "custom_domain_verified_at" timestamp;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "stores_custom_domain_uniq" ON "stores" ("custom_domain");
