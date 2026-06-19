ALTER TABLE "customers" ALTER COLUMN "total_spent" SET DATA TYPE numeric(14, 2) USING "total_spent"::numeric(14, 2);--> statement-breakpoint
ALTER TABLE "customers" ALTER COLUMN "total_spent" SET NOT NULL;
