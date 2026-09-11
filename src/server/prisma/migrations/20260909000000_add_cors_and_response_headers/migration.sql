-- Mock endpoints are called from a browser, which until now they could not be: no response
-- carried a CORS header and no route answered a preflight. The defaults below are what make
-- every existing project work from a browser the moment this lands, with no edit from its owner.

-- Headers the author sets on one endpoint's response, as a JSON array of {name, value}. Stored
-- as TEXT like "response_body" and "ai_plan" rather than JSONB, which no column here uses.
ALTER TABLE "endpoints" ADD COLUMN "response_headers" TEXT NOT NULL DEFAULT '[]';

-- Enabled with an empty origin list is "any origin may call this project", so every row
-- backfills straight into the open default. Turning it off is how an author reproduces a
-- browser blocking the call; an explicit origin list is how they narrow it.
ALTER TABLE "projects" ADD COLUMN "cors_enabled" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "projects" ADD COLUMN "cors_origins" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "projects" ADD COLUMN "cors_allow_credentials" BOOLEAN NOT NULL DEFAULT false;
