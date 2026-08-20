-- Index the columns the hot paths filter and join on. Before this migration the only
-- indexes were the implicit ones from @id and @unique, so every mock request was a
-- three-table sequential scan.
--
-- Plain CREATE INDEX, not CONCURRENTLY: Prisma runs a migration inside a transaction
-- and CONCURRENTLY is not allowed there. At the current table sizes the lock is
-- negligible.
CREATE INDEX "endpoints_method_path_idx" ON "endpoints"("method", "path");
CREATE INDEX "endpoints_endpoint_groups_id_idx" ON "endpoints"("endpoint_groups_id");
CREATE INDEX "endpoint_groups_project_id_idx" ON "endpoint_groups"("project_id");
CREATE INDEX "projects_user_id_idx" ON "projects"("user_id");
