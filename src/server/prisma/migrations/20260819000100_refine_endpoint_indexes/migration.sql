-- Correction to 20260819000000_add_indexes, based on the EXPLAIN ANALYZE output
-- recorded in docs/00-assessment.md.
--
-- That migration guessed the planner would drive the mock lookup from the
-- (method, path) filter on endpoints. It does not: it resolves the project first and
-- then joins into endpoints on endpoint_groups_id, so "endpoints_method_path_idx" was
-- never chosen. Replace both endpoints indexes with one composite whose leading column
-- is the join key and whose remaining columns cover the filter.
DROP INDEX "endpoints_method_path_idx";
DROP INDEX "endpoints_endpoint_groups_id_idx";
CREATE INDEX "endpoints_endpoint_groups_id_method_path_idx" ON "endpoints"("endpoint_groups_id", "method", "path");
