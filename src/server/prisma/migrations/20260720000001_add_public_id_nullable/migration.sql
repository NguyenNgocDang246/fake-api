-- Add public_id as nullable first; backfilled by scripts/backfill-public-id.ts before the
-- follow-up migration sets NOT NULL + UNIQUE.
ALTER TABLE "users" ADD COLUMN "public_id" VARCHAR(12);
ALTER TABLE "projects" ADD COLUMN "public_id" VARCHAR(12);
ALTER TABLE "endpoint_groups" ADD COLUMN "public_id" VARCHAR(12);
ALTER TABLE "endpoints" ADD COLUMN "public_id" VARCHAR(12);
