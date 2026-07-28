-- Add updated_at to all four tables, defaulting existing rows to the current timestamp.
-- Prisma's @updatedAt sets this column on every create/update from here on.
ALTER TABLE "users" ADD COLUMN "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "projects" ADD COLUMN "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "endpoint_groups" ADD COLUMN "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "endpoints" ADD COLUMN "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP;
