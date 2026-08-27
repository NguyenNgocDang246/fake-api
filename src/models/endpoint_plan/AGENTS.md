# src/models/endpoint_plan — Agent Guide

## Summary

The blueprint DSL: the Zod schemas a variant blueprint is parsed with, the catalogs of names it may draw from, and every cap it is held to. It sits in `src/models/` rather than beside the executor because a blueprint is a DTO in both directions, written by a model and also accepted from a client by the preview route, so it has to be parseable from either side without pulling in faker or Prisma.

## Content

- `endpoint_plan.model.ts` — `VariantPlanSchema` and `VariantPlanDTO`, the whole-blueprint shape, plus the readers a caller needs over one: `recipeDependencies`, `staticRecipeType`, `jsonLeafTypeOf` and `parseTemplatePlaceholders`. It `export *`s the three files below, so a caller imports this one path.
- `recipe.model.ts` — the recipes as a discriminated union on `kind`: seventeen leaf recipes, plus `branch` and `array_length`.
- `catalog.model.ts` — the closed vocabularies: `ENTITY_ATTRIBUTES` with `EntityDrawOf`, `SEMANTIC_TYPES`, `DATE_FORMAT_TYPES`, `DELTA_UNITS`, `AGGREGATE_OPS`, `SUPPORTED_LOCALES` and `LOCALE_LABELS`.
- `limits.model.ts` — every cap, from `MAX_PLAN_FIELDS` down to `MAX_UNIQUE_RETRIES`, plus `PLAN_VERSION`. It re-exports `MAX_ARRAY_ITEMS` from `@/models/endpoint/primitives.model` rather than declaring a second one.

## Conventions

- **A cap declared here has to be enforced here.** Every limit is a `.max()`, a `.min()` or a `.refine()` on the schema the value belongs to, so a blueprint past it fails to parse and no caller has to remember the number. `MAX_TEMPLATE_SLOTS` sat unenforced for a while and the file read as if it were a rule; a constant nothing checks is worse than no constant.
- **The vocabularies are closed, and the type is what closes them.** A `kind`, an entity attribute, a semantic name, an aggregate op and a locale are all enums here, which is what lets the executor resolve each one through a hand-written switch instead of a dynamic lookup. Adding a name to `SEMANTIC_TYPES` fails the build until `drawSemantic` handles it, and that failure is the point.
- **An axis that will keep growing is an enum inside one `kind`, not a `kind` each.** `aggregate` carries `op` over `AGGREGATE_OPS` rather than spelling `avg`, `min`, `max` and `count` as four recipes, so a fifth is a row in the executor's lookup table and nothing else. Which of the two a new idea is comes down to whether it names a source of values, which is vocabulary and belongs in its own `kind`, or a way of combining values already drawn, which belongs on an axis.
- **`limits.model.ts` is the one place a plan-side cap is spelled.** Anything under `src/server/services/endpoint/variant/` imports its numbers from here, including `MAX_ARRAY_ITEMS`, which is re-exported rather than redeclared so the body rule and the plan rule can never drift apart.
- **This directory imports nothing from `src/server/`.** It is parsed on both sides of the wire, so a dependency on a service would put the executor, and faker with it, into the client bundle.

The lifecycle that designs and runs a blueprint is in [src/server/services/endpoint/variant/AGENTS.md](../../server/services/endpoint/variant/AGENTS.md); the path language every `path` in a blueprint is written in is in [src/app/libs/helpers/AGENTS.md](../../app/libs/helpers/AGENTS.md).
