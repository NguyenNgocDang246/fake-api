import {
  catalogColumnIndex,
  entityAttributeType,
  parseTemplatePlaceholders,
} from "@/models/endpoint_plan/endpoint_plan.model";
import {
  ValidateRecipeInput,
  resolveRecipeType,
  uniformLeafTypeOf,
} from "@/server/services/endpoint/variant/validate_types";

function checkCatalogRecipe(input: ValidateRecipeInput): boolean {
  const { path, recipe, resolved, catalogById, errors } = input;
  if (recipe.kind !== "catalog" && recipe.kind !== "catalog_range") return true;

  const catalog = catalogById.get(recipe.catalog);
  if (!catalog) {
    errors.push(`Field "${path}" uses catalog "${recipe.catalog}", which is not declared`);
    return false;
  }

  const columns =
    recipe.kind === "catalog" ? [recipe.column] : [recipe.min_column, recipe.max_column];

  for (const column of columns) {
    if (catalogColumnIndex(catalog, column) === -1) {
      errors.push(`Catalog "${catalog.id}" has no column "${column}"`);
      return false;
    }
    if (
      recipe.kind === "catalog_range" &&
      resolved.catalogColumnType.get(`${catalog.id}.${column}`) !== "number"
    ) {
      errors.push(`Catalog column "${catalog.id}.${column}" must be a number in every row`);
      return false;
    }
  }

  if (recipe.kind === "catalog" && recipe.unique) resolved.uniqueCatalogs.add(catalog.id);
  return true;
}

// Returns false when the recipe has already been reported and the type check must be skipped.
function checkRecipeShape(input: ValidateRecipeInput): boolean {
  const { path, recipe, expected, entityById, errors } = input;

  switch (recipe.kind) {
    case "entity": {
      const entity = entityById.get(recipe.entity);
      if (!entity) {
        errors.push(`Field "${path}" uses entity "${recipe.entity}", which is not declared`);
        return false;
      }
      if (!entityAttributeType(entity.kind, recipe.attr)) {
        errors.push(`Entity kind "${entity.kind}" has no attribute "${recipe.attr}"`);
        return false;
      }
      return true;
    }
    case "catalog":
    case "catalog_range":
      return checkCatalogRecipe(input);
    case "pick": {
      if (recipe.weights && recipe.weights.length !== recipe.values.length) {
        errors.push(`Field "${path}" has a weight list that does not match its values`);
        return false;
      }
      if (!uniformLeafTypeOf(recipe.values)) {
        errors.push(`Field "${path}" mixes value types in its list`);
        return false;
      }
      return true;
    }
    case "int":
    case "float": {
      if (recipe.min > recipe.max) {
        errors.push(`Field "${path}" has a minimum above its maximum`);
        return false;
      }
      return true;
    }
    case "template": {
      for (const placeholder of parseTemplatePlaceholders(recipe.pattern)) {
        const target = placeholder.isSlot
          ? recipe.slots?.[placeholder.name]
          : recipe.refs?.[placeholder.name];
        if (!target) {
          const kind = placeholder.isSlot ? "slot" : "reference";
          errors.push(
            `Field "${path}" uses ${kind} "${placeholder.name}", which it never declares`
          );
          return false;
        }
      }
      return true;
    }
    case "after": {
      if (recipe.min_delta > recipe.max_delta) {
        errors.push(`Field "${path}" has a minimum offset above its maximum`);
        return false;
      }
      // A number could be epoch seconds or epoch milliseconds, and picking the wrong one
      // silently moves every date by a factor of a thousand.
      if (recipe.unit !== "number" && !recipe.format) {
        errors.push(`Field "${path}" offsets a date, so it needs a date format`);
        return false;
      }
      if (recipe.unit === "number" && expected !== "number") {
        errors.push(`Field "${path}" offsets a plain number but the body holds ${expected}`);
        return false;
      }
      return true;
    }
    default:
      return true;
  }
}

export function validateValueRecipe(input: ValidateRecipeInput): void {
  const { path, recipe, expected, allowNull, plan, baseBody, resolved, errors } = input;

  // A branch is the one recipe allowed to change a field's JSON type, and only to `null`.
  if (recipe.kind === "branch") {
    const cases = Object.values(recipe.cases);
    if (cases.length === 0) {
      errors.push(`Field "${path}" has a branch with no cases`);
      return;
    }
    for (const branchRecipe of [...cases, recipe.default]) {
      validateValueRecipe({ ...input, recipe: branchRecipe, allowNull: true });
    }
    return;
  }

  if (!checkRecipeShape(input)) return;

  const produced = resolveRecipeType(recipe, plan, baseBody, resolved);
  if (!produced || produced === expected) return;
  if (allowNull && produced === "null") return;

  // A null in the sample body carries no type to preserve, so this is the one field where the
  // recipe picks the type instead of matching it. A branch with a null arm keeps it sometimes
  // empty, which is what the prompt asks for.
  if (expected === "null") return;

  errors.push(`Field "${path}" produces ${produced} where the body holds ${expected}`);
}
