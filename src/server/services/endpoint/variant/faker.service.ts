import { MAX_ARRAY_ITEMS } from "@/models/endpoint_plan/limits.model";
import {
  ArrayLengthRecipeDTO,
  VariantPlanDTO,
  recipeDependencies,
} from "@/models/endpoint_plan/endpoint_plan.model";
import {
  arrayDepthOf,
  getAtPath,
  relativeToElement,
  setAtPath,
} from "@/app/libs/helpers/json_path";
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

// The paths a length follows. They are drawn before anything else so `resizeArrays` reads the
// value this call settled on rather than the one the base body was saved with.
function lengthDriverPaths(plan: VariantPlanDTO): Set<string> {
  const paths = new Set<string>();
  for (const field of plan.fields) {
    if (field.recipe.kind === "array_length" && field.recipe.of !== undefined) {
      paths.add(field.recipe.of);
    }
  }
  return paths;
}

// Null when the recipe says nothing about the length. A followed length is settled once here so
// every array the path names agrees with it, while a band is redrawn on each call, which is what
// keeps every row of `rows[].cells` its own length.
function lengthDraw(ctx: RenderContext, recipe: ArrayLengthRecipeDTO): (() => number) | null {
  if (recipe.of !== undefined) {
    const value = getAtPath(ctx.draft, recipe.of);
    if (typeof value === "number" && Number.isFinite(value)) {
      const settled = Math.min(Math.max(Math.round(value), 0), MAX_ARRAY_ITEMS);
      return () => settled;
    }
  }

  const { min, max } = recipe;
  if (min === undefined || max === undefined) return null;

  const band = { min: Math.min(min, max), max: Math.min(Math.max(min, max), MAX_ARRAY_ITEMS) };
  return () => ctx.faker.number.int(band);
}

function resizeArrays(ctx: RenderContext, plan: VariantPlanDTO): void {
  for (const field of plan.fields) {
    if (field.recipe.kind !== "array_length") continue;

    const nextLength = lengthDraw(ctx, field.recipe);
    if (nextLength === null) continue;

    // Read uncapped, unlike every other path read: a length describes the whole array, so a
    // grandfathered row past `MAX_ARRAY_ITEMS` still gets all of its nested arrays resized. Only
    // the values inside them are capped, which is what the field selector promises on the row.
    const current = getAtPath(ctx.draft, field.path);
    if (current === undefined) continue;

    const resize = (array: unknown[]) => {
      if (array.length === 0) return array;

      const target = nextLength();
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

function sortKeyOf(element: unknown, keyPath: string): unknown {
  return keyPath === "" ? element : getAtPath(element, keyPath);
}

// Stable, so anything the two sides cannot be compared on keeps the order it was drawn in.
function compareKeys(left: unknown, right: unknown): number {
  if (typeof left === "number" && typeof right === "number") return left - right;
  if (typeof left === "string" && typeof right === "string") {
    return left < right ? -1 : left > right ? 1 : 0;
  }
  if (typeof left === "boolean" && typeof right === "boolean") {
    return Number(left) - Number(right);
  }
  return 0;
}

// Last of all, because a key is only worth reading once every element has been drawn. The recipes
// that read a whole array run before this and none of them depend on order.
function sortArrays(ctx: RenderContext, plan: VariantPlanDTO): void {
  for (const field of plan.fields) {
    if (field.recipe.kind !== "array_length" || field.recipe.order_by === undefined) continue;

    const keyPath = relativeToElement(field.path, field.recipe.order_by);
    if (keyPath === null) continue;

    const direction = field.recipe.order === "desc" ? -1 : 1;
    const current = getAtPath(ctx.draft, field.path);
    if (current === undefined) continue;

    const sort = (array: unknown[]) =>
      [...array].sort(
        (left, right) =>
          direction * compareKeys(sortKeyOf(left, keyPath), sortKeyOf(right, keyPath))
      );

    setAtPath(ctx.draft, field.path, mapAtDepth(current, arrayDepthOf(field.path), sort));
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

    // A driver is drawn first and never again: drawing it a second time below would settle on a
    // different number than the one the arrays were just built from. `validatePlan` is what makes
    // one pass enough, by refusing a driver whose recipe reads anything at all.
    const drivers = lengthDriverPaths(plan);
    for (const field of plan.fields) {
      if (field.recipe.kind === "array_length" || !drivers.has(field.path)) continue;
      renderField(ctx, field);
    }

    resizeArrays(ctx, plan);

    for (const field of topoOrder(plan)) {
      if (field.recipe.kind === "array_length" || drivers.has(field.path)) continue;
      renderField(ctx, field);
    }

    sortArrays(ctx, plan);

    return draft;
  } catch (error) {
    console.error("[ai] blueprint failed to render", {
      reason: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}
