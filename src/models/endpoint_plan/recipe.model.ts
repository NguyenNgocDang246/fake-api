import { z } from "zod";
import {
  MAX_ARRAY_ITEMS,
  MAX_BRANCH_CASES,
  MAX_PATTERN_LENGTH,
  MAX_PICK_VALUES,
  MAX_SLOT_VALUES,
  MAX_STRING_VALUE_LENGTH,
  MAX_TEMPLATE_LENGTH,
  MAX_TEMPLATE_SLOTS,
} from "@/models/endpoint_plan/limits.model";
import {
  AGGREGATE_OPS,
  DATE_FORMATS,
  DELTA_UNITS,
  SEMANTIC_NAMES,
} from "@/models/endpoint_plan/catalog.model";

export const LeafValue = z.union([
  z.string().max(MAX_STRING_VALUE_LENGTH),
  z.number(),
  z.boolean(),
  z.null(),
]);

export const Identifier = z.string().min(1).max(40).regex(/^[a-zA-Z0-9_]+$/);

// Kept loose here because the real check is membership in the endpoint's `ai_fields`.
export const PathString = z.string().min(1).max(200);

const uniqueFlag = {
  unique: z.boolean().optional(),
};

const EntityRecipe = z.object({
  kind: z.literal("entity"),
  entity: Identifier,
  attr: z.string().min(1).max(40),
  ...uniqueFlag,
});

const CatalogRecipe = z.object({
  kind: z.literal("catalog"),
  catalog: Identifier,
  column: z.string().min(1).max(40),
  ...uniqueFlag,
});

const CatalogRangeRecipe = z.object({
  kind: z.literal("catalog_range"),
  catalog: Identifier,
  min_column: z.string().min(1).max(40),
  max_column: z.string().min(1).max(40),
  step: z.number().positive().optional(),
  fraction_digits: z.number().int().min(0).max(6).optional(),
  ...uniqueFlag,
});

const PickRecipe = z.object({
  kind: z.literal("pick"),
  values: z.array(LeafValue).min(1).max(MAX_PICK_VALUES),
  weights: z.array(z.number().nonnegative()).min(1).max(MAX_PICK_VALUES).optional(),
  ...uniqueFlag,
});

const IntRecipe = z.object({
  kind: z.literal("int"),
  min: z.number().int(),
  max: z.number().int(),
  step: z.number().int().positive().optional(),
  ...uniqueFlag,
});

const FloatRecipe = z.object({
  kind: z.literal("float"),
  min: z.number(),
  max: z.number(),
  step: z.number().positive().optional(),
  fraction_digits: z.number().int().min(0).max(6).optional(),
  ...uniqueFlag,
});

const BoolRecipe = z.object({
  kind: z.literal("bool"),
  probability: z.number().min(0).max(1).optional(),
});

const DateRecipe = z.object({
  kind: z.literal("date"),
  format: z.enum(DATE_FORMATS),
  days_back: z.number().int().min(0).max(36_500).optional(),
  days_forward: z.number().int().min(0).max(36_500).optional(),
  ...uniqueFlag,
});

const PatternRecipe = z.object({
  kind: z.literal("pattern"),
  pattern: z.string().min(1).max(MAX_PATTERN_LENGTH),
  ...uniqueFlag,
});

const SemanticRecipe = z.object({
  kind: z.literal("semantic"),
  name: z.enum(SEMANTIC_NAMES),
  ...uniqueFlag,
});

const ConstRecipe = z.object({
  kind: z.literal("const"),
  value: LeafValue,
});

const TemplateRecipe = z.object({
  kind: z.literal("template"),
  pattern: z.string().min(1).max(MAX_TEMPLATE_LENGTH),
  refs: z.record(Identifier, PathString).optional(),
  slots: z
    .record(
      Identifier,
      z.array(z.string().max(MAX_STRING_VALUE_LENGTH)).min(1).max(MAX_SLOT_VALUES)
    )
    .refine(
      (slots) => Object.keys(slots).length <= MAX_TEMPLATE_SLOTS,
      `A template can hold at most ${MAX_TEMPLATE_SLOTS} slots`
    )
    .optional(),
  ...uniqueFlag,
});

const CopyRecipe = z.object({
  kind: z.literal("copy"),
  of: PathString,
});

const AfterRecipe = z.object({
  kind: z.literal("after"),
  of: PathString,
  min_delta: z.number(),
  max_delta: z.number(),
  unit: z.enum(DELTA_UNITS).optional(),
  format: z.enum(DATE_FORMATS).optional(),
  fraction_digits: z.number().int().min(0).max(6).optional(),
});

const SumRecipe = z.object({
  kind: z.literal("sum"),
  of: PathString,
  multiplier: z.number().optional(),
  fraction_digits: z.number().int().min(0).max(6).optional(),
});

// `of` is a value path for avg, min and max, and an array container path for count. Which one it
// has to be is checked against the body by `validatePlan`.
const AggregateRecipe = z.object({
  kind: z.literal("aggregate"),
  op: z.enum(AGGREGATE_OPS),
  of: PathString,
  multiplier: z.number().optional(),
  fraction_digits: z.number().int().min(0).max(6).optional(),
});

const ProductRecipe = z.object({
  kind: z.literal("product"),
  of: z.tuple([PathString, PathString]),
  multiplier: z.number().optional(),
  fraction_digits: z.number().int().min(0).max(6).optional(),
});

// Branches do not nest: one level of conditioning covers the real cases.
const LEAF_RECIPES = [
  EntityRecipe,
  CatalogRecipe,
  CatalogRangeRecipe,
  PickRecipe,
  IntRecipe,
  FloatRecipe,
  BoolRecipe,
  DateRecipe,
  PatternRecipe,
  SemanticRecipe,
  ConstRecipe,
  TemplateRecipe,
  CopyRecipe,
  AfterRecipe,
  SumRecipe,
  AggregateRecipe,
  ProductRecipe,
] as const;

const LeafRecipe = z.discriminatedUnion("kind", [...LEAF_RECIPES]);
export type LeafRecipeDTO = z.infer<typeof LeafRecipe>;

const BranchRecipe = z.object({
  kind: z.literal("branch"),
  on: PathString,
  cases: z.record(z.string().min(1).max(120), LeafRecipe).refine(
    (cases) => Object.keys(cases).length <= MAX_BRANCH_CASES,
    `A branch can hold at most ${MAX_BRANCH_CASES} cases`
  ),
  default: LeafRecipe,
});

const ArrayLengthRecipe = z.object({
  kind: z.literal("array_length"),
  min: z.number().int().min(0).max(MAX_ARRAY_ITEMS),
  max: z.number().int().min(1).max(MAX_ARRAY_ITEMS),
});

export const Recipe = z.discriminatedUnion("kind", [
  ...LEAF_RECIPES,
  BranchRecipe,
  ArrayLengthRecipe,
]);
export type RecipeDTO = z.infer<typeof Recipe>;
export type RecipeKind = RecipeDTO["kind"];
