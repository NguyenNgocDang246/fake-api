-- Run only after scripts/backfill-public-id.ts has populated public_id for all existing rows.
ALTER TABLE "users" ALTER COLUMN "public_id" SET NOT NULL;
ALTER TABLE "projects" ALTER COLUMN "public_id" SET NOT NULL;
ALTER TABLE "endpoint_groups" ALTER COLUMN "public_id" SET NOT NULL;
ALTER TABLE "endpoints" ALTER COLUMN "public_id" SET NOT NULL;

CREATE UNIQUE INDEX "users_public_id_key" ON "users"("public_id");
CREATE UNIQUE INDEX "projects_public_id_key" ON "projects"("public_id");
CREATE UNIQUE INDEX "endpoint_groups_public_id_key" ON "endpoint_groups"("public_id");
CREATE UNIQUE INDEX "endpoints_public_id_key" ON "endpoints"("public_id");
