import { z } from "zod";
import {
  MAX_CATALOGS,
  MAX_CATALOG_COLUMNS,
  MAX_CATALOG_ROWS,
  MAX_PLAN_ENTITIES,
  MAX_PLAN_FIELDS,
  MAX_UNAPPLIED_HINTS,
  PLAN_VERSION,
} from "@/models/endpoint_plan/limits.model";
import {
  DATE_FORMAT_TYPES,
  ENTITY_KINDS,
  JsonLeafType,
  SEMANTIC_TYPES,
  SUPPORTED_LOCALES,
} from "@/models/endpoint_plan/catalog.model";
import {
  Identifier,
  LeafValue,
  PathString,
  Recipe,
  RecipeDTO,
} from "@/models/endpoint_plan/recipe.model";

// The blueprint DSL. An LLM authors one of these per endpoint; the faker executor runs it on
// every request. Shape is checked here; meaning is checked by `validatePlan`, which needs the
// body to judge.

export * from "@/models/endpoint_plan/limits.model";
export * from "@/models/endpoint_plan/catalog.model";
export * from "@/models/endpoint_plan/recipe.model";

const PlanEntity = z.object({
  id: Identifier,
  kind: z.enum(ENTITY_KINDS),
});
export type PlanEntityDTO = z.infer<typeof PlanEntity>;

const PlanCatalog = z.object({
  id: Identifier,
  columns: z.array(z.string().min(1).max(40)).min(1).max(MAX_CATALOG_COLUMNS),
  rows: z.array(z.array(LeafValue).max(MAX_CATALOG_COLUMNS)).min(1).max(MAX_CATALOG_ROWS),
  weights: z.array(z.number().nonnegative()).min(1).max(MAX_CATALOG_ROWS).optional(),
});
export type PlanCatalogDTO = z.infer<typeof PlanCatalog>;

export function catalogColumnIndex(catalog: PlanCatalogDTO, column: string): number {
  return catalog.columns.indexOf(column);
}

const PlanField = z.object({
  path: PathString,
  recipe: Recipe,
});
export type PlanFieldDTO = z.infer<typeof PlanField>;

export const VariantPlanSchema = z
  .object({
    version: z.literal(PLAN_VERSION),
    locale: z.enum(SUPPORTED_LOCALES).default("en"),
    entities: z.array(PlanEntity).max(MAX_PLAN_ENTITIES).default([]),
    catalogs: z.array(PlanCatalog).max(MAX_CATALOGS).default([]),
    fields: z.array(PlanField).min(1).max(MAX_PLAN_FIELDS),
    unapplied_hints: z.array(z.string().max(200)).max(MAX_UNAPPLIED_HINTS).default([]),
    // `locale` is a closed enum, so a Thai body would come back as `en` with nothing saying why.
    unsupported_language: z.string().max(40).nullable().default(null),
  })
  .strict();
export type VariantPlanDTO = z.infer<typeof VariantPlanSchema>;

// The paths a recipe reads before it can produce its own value.
export function recipeDependencies(recipe: RecipeDTO): string[] {
  switch (recipe.kind) {
    case "copy":
    case "after":
      return [recipe.of];
    case "sum":
    case "aggregate":
      return [recipe.of];
    case "product":
      return [...recipe.of];
    case "template":
      return Object.values(recipe.refs ?? {});
    case "branch":
      return [
        recipe.on,
        ...Object.values(recipe.cases).flatMap(recipeDependencies),
        ...recipeDependencies(recipe.default),
      ];
    default:
      return [];
  }
}

// `undefined` means the type depends on data the executor resolves later.
export function staticRecipeType(recipe: RecipeDTO): JsonLeafType | undefined {
  switch (recipe.kind) {
    case "catalog_range":
      return "number";
    case "int":
    case "float":
    case "sum":
    case "aggregate":
    case "product":
      return "number";
    case "bool":
      return "boolean";
    case "date":
      return DATE_FORMAT_TYPES[recipe.format];
    case "pattern":
    case "template":
      return "string";
    case "semantic":
      return SEMANTIC_TYPES[recipe.name];
    case "const":
      return recipe.value === null ? "null" : (typeof recipe.value as JsonLeafType);
    case "after":
      return recipe.format ? DATE_FORMAT_TYPES[recipe.format] : "number";
    case "entity":
    case "catalog":
    case "pick":
    case "copy":
    case "branch":
    case "array_length":
      return undefined;
  }
}

export function jsonLeafTypeOf(value: unknown): JsonLeafType | undefined {
  if (value === null) return "null";
  if (typeof value === "string") return "string";
  if (typeof value === "number") return Number.isFinite(value) ? "number" : undefined;
  if (typeof value === "boolean") return "boolean";
  return undefined;
}

const TEMPLATE_PLACEHOLDER = /\{\{\s*(slot:)?([a-zA-Z0-9_]+)\s*\}\}/g;

export interface TemplatePlaceholder {
  isSlot: boolean;
  name: string;
}

export function parseTemplatePlaceholders(pattern: string): TemplatePlaceholder[] {
  return [...pattern.matchAll(TEMPLATE_PLACEHOLDER)].map((match) => ({
    isSlot: match[1] === "slot:",
    name: match[2] ?? "",
  }));
}
