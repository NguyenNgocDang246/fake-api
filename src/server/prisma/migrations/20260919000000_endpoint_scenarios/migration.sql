-- An endpoint now answers with one of several saved scenarios: a 200 body, a 401 body, an
-- admin-role body, each with its own status, headers and delay. Switching which one is active is
-- what an author does instead of editing the body back and forth, so the whole answer has to be
-- one row that can be swapped at once.
--
-- That is why the columns move off "endpoints" rather than being copied into it on a switch.
-- "ai_plan" and "ai_plan_hash" belong to the body they were built for, and a blueprint build
-- runs in the background holding a lock on the row it will store into. Copying a different body
-- over that row mid-build stores a blueprint for a body the endpoint no longer serves, and the
-- hash then rejects it forever.
--
-- This migration drops those columns in the same run that creates their replacement, so for the
-- length of one deployment the old code is reading columns that are gone and every live mock
-- answers 500. That is accepted here rather than split into an expand and a contract, because
-- the alternative costs a dual-write path that exists for one deploy and is then deleted.

CREATE TABLE "endpoint_scenarios" (
    "id" BIGSERIAL NOT NULL,
    "public_id" VARCHAR(12) NOT NULL,
    "endpoints_id" BIGINT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    -- Rewritten from the array index on every save, so it carries no uniqueness: a unique
    -- (endpoints_id, position) would be violated mid-statement by any reorder, the same way the
    -- partial index below is by a one-statement switch.
    "position" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT false,
    "status_code" INTEGER NOT NULL DEFAULT 200,
    "response_body" TEXT NOT NULL,
    "response_headers" TEXT NOT NULL DEFAULT '[]',
    "delay_ms" INTEGER NOT NULL DEFAULT 0,
    "ai_enabled" BOOLEAN NOT NULL DEFAULT false,
    "ai_fields" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "ai_prompt" VARCHAR(500),
    "ai_plan" TEXT,
    "ai_plan_hash" VARCHAR(64),
    "ai_plan_at" TIMESTAMP(6),
    "ai_plan_started_at" TIMESTAMP(6),
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "endpoint_scenarios_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "endpoint_scenarios"
    ADD CONSTRAINT "endpoint_scenarios_endpoints_id_fkey"
    FOREIGN KEY ("endpoints_id") REFERENCES "endpoints"("id")
    ON DELETE CASCADE ON UPDATE NO ACTION;

-- Every existing endpoint becomes one scenario named "Default", carrying its columns unchanged,
-- the blueprint and its hash included, so no endpoint re-designs on the first request after this
-- lands. "updated_at" is copied rather than defaulted: this is not an edit the author made, and
-- the endpoint list is ordered by that column.
--
-- The id is generated here rather than by a follow-up script, because the column is NOT NULL and
-- unique from the moment it exists. The alphabet is the one in src/app/libs/helpers/publicId.ts,
-- 57 characters with the look-alike glyphs left out, length 12. The join produces 12 rows per
-- endpoint and string_agg folds them into one id: random() is volatile, so it is evaluated per
-- row of that product, and the GROUP BY is what ties each id to its own endpoint.
INSERT INTO "endpoint_scenarios" (
    "public_id", "endpoints_id", "name", "position", "is_active",
    "status_code", "response_body", "response_headers", "delay_ms",
    "ai_enabled", "ai_fields", "ai_prompt",
    "ai_plan", "ai_plan_hash", "ai_plan_at", "ai_plan_started_at", "updated_at"
)
SELECT
    ids."public_id", e."id", 'Default', 0, true,
    e."status_code", e."response_body", e."response_headers", e."delay_ms",
    e."ai_enabled", e."ai_fields", e."ai_prompt",
    e."ai_plan", e."ai_plan_hash", e."ai_plan_at", e."ai_plan_started_at", e."updated_at"
FROM "endpoints" e
JOIN (
    SELECT
        src."id" AS "endpoints_id",
        string_agg(
            substr(
                '23456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz',
                1 + floor(random() * 57)::int,
                1
            ),
            ''
        ) AS "public_id"
    FROM "endpoints" src
    CROSS JOIN generate_series(1, 12)
    GROUP BY src."id"
) ids ON ids."endpoints_id" = e."id";

-- Created after the backfill rather than with the table: 57^12 makes a collision effectively
-- impossible, and if one ever happened this fails the migration naming the index, instead of
-- failing an INSERT halfway through it.
CREATE UNIQUE INDEX "endpoint_scenarios_public_id_key" ON "endpoint_scenarios"("public_id");

-- Serves the pager, which reads every scenario of one endpoint in order, and the serving path,
-- which reads the active one.
CREATE INDEX "endpoint_scenarios_endpoints_id_position_idx"
    ON "endpoint_scenarios"("endpoints_id", "position");

-- At most one active scenario per endpoint, enforced where it cannot be got around. Prisma has
-- no way to declare a partial unique index, so this object is invisible to schema.prisma and
-- "prisma migrate diff" would report it as drift; nothing in package.json runs that.
--
-- It says "at most", never "at least". A switch is two statements inside one transaction,
-- deactivate then activate, because a single UPDATE setting both rows trips this index the
-- moment the planner touches the new row first, and a partial unique index cannot be deferred.
-- Between those two statements an endpoint has none active, which is why the serving lookup
-- orders by (is_active desc, position asc) and takes one rather than filtering on is_active.
CREATE UNIQUE INDEX "endpoint_scenarios_one_active_idx"
    ON "endpoint_scenarios"("endpoints_id") WHERE "is_active";

-- The endpoint keeps only what addresses it.
ALTER TABLE "endpoints" DROP COLUMN "status_code";
ALTER TABLE "endpoints" DROP COLUMN "response_body";
ALTER TABLE "endpoints" DROP COLUMN "response_headers";
ALTER TABLE "endpoints" DROP COLUMN "delay_ms";
ALTER TABLE "endpoints" DROP COLUMN "ai_enabled";
ALTER TABLE "endpoints" DROP COLUMN "ai_fields";
ALTER TABLE "endpoints" DROP COLUMN "ai_prompt";
ALTER TABLE "endpoints" DROP COLUMN "ai_plan";
ALTER TABLE "endpoints" DROP COLUMN "ai_plan_hash";
ALTER TABLE "endpoints" DROP COLUMN "ai_plan_at";
ALTER TABLE "endpoints" DROP COLUMN "ai_plan_started_at";
