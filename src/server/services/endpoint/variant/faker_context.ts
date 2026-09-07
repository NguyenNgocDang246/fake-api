import type { Faker } from "@faker-js/faker";
import { MAX_ARRAY_ITEMS } from "@/models/endpoint_plan/limits.model";
import {
  JsonLeaf,
  SupportedLocale,
} from "@/models/endpoint_plan/catalog.model";
import { PlanCatalogDTO, PlanEntityDTO, VariantPlanDTO } from "@/models/endpoint_plan/endpoint_plan.model";
import { arrayDepthOf, getAtPath } from "@/app/libs/helpers/json_path";
import { EntityDraw, drawEntity } from "@/server/services/endpoint/variant/faker_entity";
import { pickWeighted } from "@/server/services/endpoint/variant/faker_value";

export interface RenderContext {
  faker: Faker;
  locale: SupportedLocale;
  draft: unknown;
  plan: VariantPlanDTO;
  // Built once per render, then read for every element of every array field.
  entityById: Map<string, PlanEntityDTO>;
  catalogById: Map<string, PlanCatalogDTO>;
  entityDraws: Map<string, EntityDraw>;
  catalogRows: Map<string, JsonLeaf[]>;
  catalogTaken: Map<string, Set<number>>;
  uniqueCatalogs: Set<string>;
  // The element index at each array level the field being drawn sits inside, outermost first.
  // Empty for a field outside every array.
  indexes: number[];
}

export function entityDrawFor(ctx: RenderContext, entityId: string): EntityDraw | null {
  const entity = ctx.entityById.get(entityId);
  if (!entity) return null;

  const key = `${entityId}#${ctx.indexes.join(".")}`;
  const cached = ctx.entityDraws.get(key);
  if (cached) return cached;

  const draw = drawEntity(entity.kind, ctx.faker, ctx.locale);
  ctx.entityDraws.set(key, draw);
  return draw;
}

export function catalogRowFor(ctx: RenderContext, catalogId: string): JsonLeaf[] | null {
  const catalog = ctx.catalogById.get(catalogId);
  if (!catalog) return null;

  const key = `${catalogId}#${ctx.indexes.join(".")}`;
  const cached = ctx.catalogRows.get(key);
  if (cached) return cached;

  const taken = ctx.catalogTaken.get(catalogId) ?? new Set<number>();
  const mustBeDistinct = ctx.uniqueCatalogs.has(catalogId) && taken.size < catalog.rows.length;

  const indexes = catalog.rows.map((_, rowIndex) => rowIndex);
  const candidates = mustBeDistinct ? indexes.filter((i) => !taken.has(i)) : indexes;
  const weights = catalog.weights ? candidates.map((i) => catalog.weights?.[i] ?? 0) : undefined;

  const chosen = pickWeighted(ctx.faker, candidates, weights);
  taken.add(chosen);
  ctx.catalogTaken.set(catalogId, taken);

  const row = catalog.rows[chosen] ?? [];
  ctx.catalogRows.set(key, row);
  return row;
}

// Resolves an array path to the one value at the indexes being drawn. `validatePlan` has already
// established the dependency sits in the same array or in one wrapping it, so the field's own
// indexes, read outermost first, are exactly the ones this path needs.
export function readReferenced(ctx: RenderContext, path: string): unknown {
  const depth = arrayDepthOf(path);
  if (depth === 0) return getAtPath(ctx.draft, path);

  let value = getAtPath(ctx.draft, path, MAX_ARRAY_ITEMS);
  for (let level = 0; level < depth; level += 1) {
    const index = ctx.indexes[level];
    if (!Array.isArray(value) || index === undefined) return undefined;
    value = value[index];
  }
  return value;
}
