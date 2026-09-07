import { MAX_ARRAY_ITEMS } from "@/models/endpoint_plan/limits.model";
import { EntityKind, JsonLeafType } from "@/models/endpoint_plan/catalog.model";
import { RecipeDTO } from "@/models/endpoint_plan/recipe.model";
import {
  PlanCatalogDTO,
  VariantPlanDTO,
  entityAttributeType,
  jsonLeafTypeOf,
  staticRecipeType,
} from "@/models/endpoint_plan/endpoint_plan.model";
import { arrayDepthOf, flattenPathValues } from "@/app/libs/helpers/json_path";

export interface Resolved {
  catalogColumnType: Map<string, JsonLeafType | undefined>;
  uniqueCatalogs: Set<string>;
}

export interface ValidateRecipeInput {
  path: string;
  recipe: Exclude<RecipeDTO, { kind: "array_length" }>;
  expected: JsonLeafType;
  // Only the arms of a branch may hand back `null` in place of the field's real type.
  allowNull: boolean;
  plan: VariantPlanDTO;
  baseBody: unknown;
  resolved: Resolved;
  entityById: Map<string, { id: string; kind: EntityKind }>;
  catalogById: Map<string, PlanCatalogDTO>;
  errors: string[];
}

export function uniformLeafTypeOf(values: unknown[]): JsonLeafType | undefined {
  const [first, ...rest] = values;
  if (first === undefined) return undefined;

  const type = jsonLeafTypeOf(first);
  if (!type) return undefined;

  return rest.every((value) => jsonLeafTypeOf(value) === type) ? type : undefined;
}

// The JSON type the base body already holds at a path, which is what every recipe has to match.
// A path crossing arrays has to hold the same type at every element of every one of them.
export function expectedTypeAt(baseBody: unknown, path: string): JsonLeafType | undefined {
  const values = flattenPathValues(baseBody, path, MAX_ARRAY_ITEMS);
  if (values === null) return undefined;
  return arrayDepthOf(path) === 0 ? jsonLeafTypeOf(values[0]) : uniformLeafTypeOf(values);
}

export function resolveRecipeType(
  recipe: RecipeDTO,
  plan: VariantPlanDTO,
  baseBody: unknown,
  resolved: Resolved
): JsonLeafType | undefined {
  const stat = staticRecipeType(recipe);
  if (stat) return stat;

  switch (recipe.kind) {
    case "entity": {
      const entity = plan.entities.find((candidate) => candidate.id === recipe.entity);
      return entity ? entityAttributeType(entity.kind, recipe.attr) : undefined;
    }
    case "catalog":
      return resolved.catalogColumnType.get(`${recipe.catalog}.${recipe.column}`);
    case "pick":
      return uniformLeafTypeOf(recipe.values);
    case "copy":
      return expectedTypeAt(baseBody, recipe.of);
    default:
      return undefined;
  }
}
