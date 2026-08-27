-- The AI variant feature moves from "an LLM writes the values" to "an LLM writes a blueprint
-- once and faker runs it on every request". That removes the stored pool entirely and adds the
-- blueprint to the endpoint itself.

-- The blueprint, plus the hash of the inputs it was built from. A body, field list or hint that
-- no longer matches the hash is what marks a blueprint stale, so the explicit pool invalidation
-- the update route used to run has nothing left to do.
ALTER TABLE "endpoints" ADD COLUMN "ai_plan" TEXT;
ALTER TABLE "endpoints" ADD COLUMN "ai_plan_hash" VARCHAR(64);
ALTER TABLE "endpoints" ADD COLUMN "ai_plan_at" TIMESTAMP(6);

-- Same column, same job (a soft lock that doubles as the retry cooldown), but it now guards
-- building a blueprint rather than refilling a pool, so the old name would be a lie.
ALTER TABLE "endpoints" RENAME COLUMN "ai_refill_started_at" TO "ai_plan_started_at";

-- One row per model call, append only. The daily quota used to count rows in
-- endpoint_ai_variants, which a preview never wrote to and a create/delete loop wiped.
CREATE TABLE "ai_usage_logs" (
    "id" BIGSERIAL NOT NULL,
    "users_id" BIGINT NOT NULL,
    "kind" VARCHAR(16) NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_usage_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ai_usage_logs_users_id_created_at_idx" ON "ai_usage_logs"("users_id", "created_at");

ALTER TABLE "ai_usage_logs"
    ADD CONSTRAINT "ai_usage_logs_users_id_fkey"
    FOREIGN KEY ("users_id") REFERENCES "users"("id")
    ON DELETE CASCADE ON UPDATE NO ACTION;

-- Every row here was a cache of generated bodies, rebuilt from the blueprint from now on.
DROP TABLE "endpoint_ai_variants";
