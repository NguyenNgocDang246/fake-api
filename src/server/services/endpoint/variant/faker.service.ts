import { MAX_ARRAY_ITEMS } from "@/models/endpoint_plan/limits.model";
import { VariantPlanDTO, recipeDependencies } from "@/models/endpoint_plan/endpoint_plan.model";
import { arrayDepthOf, getAtPath, setAtPath } from "@/app/libs/helpers/json_path";
import { RenderContext } from "@/server/services/endpoint/variant/faker_context";
import { collectUniqueCatalogs } from "@/server/services/endpoint/variant/plan_catalogs";
import { fakerFor } from "@/server/services/endpoint/variant/faker_locale";
import {
  drawUnique,
  drawValue,
  wantsUnique,
} from "@/server/services/endpoint/variant/faker_recipe";

export { collectUniqueCatalogs };

// Runs a blueprint against a base body. Everything here is pure and local: no model call, no
// database, no clock beyond `Date.now()`. `renderVariant` is synchronous and has to stay that
// way, since the Faker instances are shared by every request.

// Fields in an order where every dependency is already written into the draft, so a derived
// recipe can simply read the draft instead of tracking values of its own.
function topoOrder(plan: VariantPlanDTO): VariantPlanDTO["fields"] {
  const byPath = new Map(plan.fields.map((field) => [field.path, field]));
  const ordered: VariantPlanDTO["fields"] = [];
  const done = new Set<string>();
  const visiting = new Set<string>();

  const visit = (path: string) => {
    if (done.has(path) || visiting.has(path)) return;

    const field = byPath.get(path);
    if (!field) return;

    visiting.add(path);
    for (const dependency of recipeDependencies(field.recipe)) {
      if (dependency !== path) visit(dependency);
    }
    visiting.delete(path);

    done.add(path);
    ordered.push(field);
  };

  for (const field of plan.fields) visit(field.path);
  return ordered;
}

// Rebuilds every array a path names, keeping the nesting above it untouched. `rows[].cells` is
// one recipe over one array per row, and each row's own first element is its template.
function mapAtDepth(value: unknown, depth: number, resize: (array: unknown[]) => unknown[]): unknown {
  if (depth === 0) return Array.isArray(value) ? resize(value) : value;
  if (!Array.isArray(value)) return value;
  return value.map((item) => mapAtDepth(item, depth - 1, resize));
}

function resizeArrays(ctx: RenderContext, plan: VariantPlanDTO): void {
  for (const field of plan.fields) {
    if (field.recipe.kind !== "array_length") continue;

    const { min, max } = field.recipe;
    // Read uncapped, unlike every other path read: a length describes the whole array, so a
    // grandfathered row past `MAX_ARRAY_ITEMS` still gets all of its nested arrays resized. Only
    // the values inside them are capped, which is what the field selector promises on the row.
    const current = getAtPath(ctx.draft, field.path);
    if (current === undefined) continue;

    const resize = (array: unknown[]) => {
      if (array.length === 0) return array;

      const target = ctx.faker.number.int({
        min: Math.min(min, max),
        max: Math.min(Math.max(min, max), MAX_ARRAY_ITEMS),
      });

      // Extra entries are cloned from the first element, so they carry every key the recipes
      // below expect to find. Their values are overwritten a moment later.
      const template = array[0];
      return Array.from({ length: target }, (_, index) =>
        index < array.length ? array[index] : structuredClone(template)
      );
    };

    setAtPath(ctx.draft, field.path, mapAtDepth(current, arrayDepthOf(field.path), resize));
  }
}

export interface RenderOptions {
  uniqueCatalogs?: Set<string>;
}

function renderField(ctx: RenderContext, field: VariantPlanDTO["fields"][number]): void {
  const depth = arrayDepthOf(field.path);

  if (depth === 0) {
    ctx.indexes = [];
    const value = drawValue(ctx, field.recipe);
    if (value !== undefined) setAtPath(ctx.draft, field.path, value);
    return;
  }

  const current = getAtPath(ctx.draft, field.path, MAX_ARRAY_ITEMS);
  if (!Array.isArray(current)) return;

  // One `seen` set for the whole field, so `unique` stays unique across every element of every
  // array the path crosses rather than restarting inside each one.
  const seen = new Set<string>();
  const unique = wantsUnique(field.recipe);
  const indexes: number[] = [];

  const walk = (level: number, node: unknown): unknown => {
    if (level === depth) {
      ctx.indexes = [...indexes];
      const value = unique ? drawUnique(ctx, field.recipe, seen) : drawValue(ctx, field.recipe);
      return value === undefined ? node : value;
    }

    if (!Array.isArray(node)) return node;
    return node.map((item, index) => {
      indexes.push(index);
      const drawn = walk(level + 1, item);
      indexes.pop();
      return drawn;
    });
  };

  setAtPath(ctx.draft, field.path, walk(0, current));
}

// Returns `null` when the plan could not be applied at all, which callers treat as "serve the
// base body" rather than as an error worth failing on.
export function renderVariant(
  plan: VariantPlanDTO,
  baseBody: unknown,
  options: RenderOptions = {}
): unknown | null {
  try {
    const draft = structuredClone(baseBody);

    const ctx: RenderContext = {
      faker: fakerFor(plan.locale),
      locale: plan.locale,
      draft,
      plan,
      entityById: new Map(plan.entities.map((entity) => [entity.id, entity])),
      catalogById: new Map(plan.catalogs.map((catalog) => [catalog.id, catalog])),
      entityDraws: new Map(),
      catalogRows: new Map(),
      catalogTaken: new Map(),
      uniqueCatalogs: options.uniqueCatalogs ?? collectUniqueCatalogs(plan),
      indexes: [],
    };

    resizeArrays(ctx, plan);

    for (const field of topoOrder(plan)) {
      if (field.recipe.kind === "array_length") continue;
      renderField(ctx, field);
    }

    return draft;
  } catch (error) {
    console.error("[ai] blueprint failed to render", {
      reason: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}
