import { MAX_ARRAY_ITEMS } from "@/models/endpoint_plan/limits.model";
import { VariantPlanDTO, recipeDependencies } from "@/models/endpoint_plan/endpoint_plan.model";
import { flattenPathValues, getAtPath, isOuterScope } from "@/app/libs/helpers/json_path";
import { validateValueRecipe } from "@/server/services/endpoint/variant/validate_recipe";
import {
  Resolved,
  expectedTypeAt,
  uniformLeafTypeOf,
} from "@/server/services/endpoint/variant/validate_types";
import {
  scopeKeyOf,
  validateAcyclic,
  validateScopes,
  wholeArrayReads,
} from "@/server/services/endpoint/variant/validate_graph";

// Refuses a blueprint before it can ever run. Split from the executor because nothing here
// touches faker, so a caller that only has to judge a plan never loads the locale datasets.

export { scopeKeyOf };

export interface PlanValidation {
  ok: boolean;
  errors: string[];
}

function collectCatalogTypes(plan: VariantPlanDTO, resolved: Resolved, errors: string[]): void {
  for (const catalog of plan.catalogs) {
    if (new Set(catalog.columns).size !== catalog.columns.length) {
      errors.push(`Catalog "${catalog.id}" repeats a column name`);
    }
    if (catalog.weights && catalog.weights.length !== catalog.rows.length) {
      errors.push(`Catalog "${catalog.id}" has a weight list that does not match its rows`);
    }

    for (const [index, row] of catalog.rows.entries()) {
      if (row.length !== catalog.columns.length) {
        errors.push(`Catalog "${catalog.id}" row ${index} does not have one value per column`);
      }
    }

    for (const [columnIndex, column] of catalog.columns.entries()) {
      const columnValues = catalog.rows.map((row) => row[columnIndex]);
      resolved.catalogColumnType.set(`${catalog.id}.${column}`, uniformLeafTypeOf(columnValues));
    }
  }
}

// A nested container such as `rows[].cells` names one array per element of `rows`, and one
// length recipe sets all of them, so every one of them has to qualify.
function checkArrayLength(
  path: string,
  recipe: { min: number; max: number },
  baseBody: unknown,
  errors: string[]
): void {
  const arrays = flattenPathValues(baseBody, path, MAX_ARRAY_ITEMS);

  if (arrays === null || arrays.length === 0 || !arrays.every((value) => Array.isArray(value))) {
    errors.push(`Field "${path}" is not an array, so its length cannot be varied`);
  } else if (arrays.some((array) => (array as unknown[]).length === 0)) {
    // Without an element there is no template to clone the extra entries from.
    errors.push(`Field "${path}" is empty, so there is no element to build more from`);
  }
  if (recipe.min > recipe.max) {
    errors.push(`Field "${path}" has a minimum length above its maximum`);
  }
}

// The executor reads a referenced path one element at a time, at the indexes of the field it is
// drawing. Those indexes only reach a dependency sitting in the same array or in one wrapping it,
// so a field in an unrelated array has no index to read at and resolves to nothing.
function checkDependencies(
  path: string,
  recipe: VariantPlanDTO["fields"][number]["recipe"],
  baseBody: unknown,
  errors: string[]
): void {
  const fieldScope = scopeKeyOf(path);
  const wholeArray = wholeArrayReads(recipe);

  for (const dependency of recipeDependencies(recipe)) {
    if (getAtPath(baseBody, dependency, MAX_ARRAY_ITEMS) === undefined) {
      errors.push(`Field "${path}" refers to "${dependency}", which is not in the body`);
      continue;
    }

    if (wholeArray.has(dependency) || isOuterScope(scopeKeyOf(dependency), fieldScope)) continue;

    errors.push(
      `Field "${path}" refers to "${dependency}", which is inside an array "${path}" is not part of. ` +
        `Use "sum" to total an array, or move the field inside the same array.`
    );
  }
}

// Shape is Zod's job; this checks that the plan agrees with the body it will be applied to.
export function validatePlan(
  plan: VariantPlanDTO,
  baseBody: unknown,
  allowedPaths: readonly string[]
): PlanValidation {
  const errors: string[] = [];
  const allowed = new Set(allowedPaths);
  const entityById = new Map(plan.entities.map((entity) => [entity.id, entity]));
  const catalogById = new Map(plan.catalogs.map((catalog) => [catalog.id, catalog]));

  const resolved: Resolved = { catalogColumnType: new Map(), uniqueCatalogs: new Set() };

  // Before anything reads them: a repeated id makes `entityById` disagree with the executor's
  // `find`, so validation would judge one declaration and the draw would come from the other.
  if (entityById.size !== plan.entities.length) errors.push("Two entities share the same id");
  if (catalogById.size !== plan.catalogs.length) errors.push("Two catalogs share the same id");

  collectCatalogTypes(plan, resolved, errors);

  const seenPaths = new Set<string>();
  const fieldByPath = new Map(plan.fields.map((field) => [field.path, field]));

  for (const { path, recipe } of plan.fields) {
    if (seenPaths.has(path)) {
      errors.push(`Field "${path}" appears more than once`);
      continue;
    }
    seenPaths.add(path);

    // The whole security model in one line: a path the user did not tick cannot be written.
    if (!allowed.has(path)) {
      errors.push(`Field "${path}" was not selected for AI generation`);
      continue;
    }

    if (recipe.kind === "array_length") {
      checkArrayLength(path, recipe, baseBody, errors);
      continue;
    }

    const expected = expectedTypeAt(baseBody, path);
    if (!expected) {
      errors.push(`Field "${path}" does not hold a single JSON type in the body`);
      continue;
    }

    validateValueRecipe({
      path,
      recipe,
      expected,
      allowNull: false,
      plan,
      baseBody,
      resolved,
      entityById,
      catalogById,
      errors,
    });

    checkDependencies(path, recipe, baseBody, errors);
  }

  validateScopes({ plan, errors });
  validateAcyclic({ plan, fieldByPath, errors });

  return { ok: errors.length === 0, errors };
}
