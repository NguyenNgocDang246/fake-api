-- Per-endpoint AI options: on/off, the JSON paths the AI may change, the author's hint,
-- and a soft lock that stops two processes from refilling the same pool at once.
ALTER TABLE "endpoints" ADD COLUMN "ai_enabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "endpoints" ADD COLUMN "ai_fields" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "endpoints" ADD COLUMN "ai_prompt" VARCHAR(500);
ALTER TABLE "endpoints" ADD COLUMN "ai_refill_started_at" TIMESTAMP(6);

-- Pool of AI generated response variants. An internal cache, so no public_id.
CREATE TABLE "endpoint_ai_variants" (
    "id" BIGSERIAL NOT NULL,
    "endpoints_id" BIGINT NOT NULL,
    "response_body" TEXT NOT NULL,
    "used_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "endpoint_ai_variants_pkey" PRIMARY KEY ("id")
);

-- Serving a request picks the least used variant of an endpoint, ties broken by id.
CREATE INDEX "endpoint_ai_variants_endpoints_id_used_count_id_idx"
    ON "endpoint_ai_variants"("endpoints_id", "used_count", "id");

-- The per-role daily quota counts variants created today.
CREATE INDEX "endpoint_ai_variants_created_at_idx" ON "endpoint_ai_variants"("created_at");

ALTER TABLE "endpoint_ai_variants"
    ADD CONSTRAINT "endpoint_ai_variants_endpoints_id_fkey"
    FOREIGN KEY ("endpoints_id") REFERENCES "endpoints"("id")
    ON DELETE CASCADE ON UPDATE NO ACTION;
