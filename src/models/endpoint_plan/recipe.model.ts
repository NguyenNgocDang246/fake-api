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
  COMPARE_OPS,
  COMPUTE_OPS,
  DATE_FORMATS,
  DELTA_UNITS,
  SEMANTIC_NAMES,
  SORT_DIRECTIONS,
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

// The two bounds narrow the window the days give, so a date can be held inside a range the body
// itself states. They name paths rather than values because the range is another field's answer.
const DateRecipe = z.object({
  kind: z.literal("date"),
  format: z.enum(DATE_FORMATS),
  days_back: z.number().int().min(0).max(36_500).optional(),
  days_forward: z.number().int().min(0).max(36_500).optional(),
  not_before: PathString.optional(),
  not_after: PathString.optional(),
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

// Superseded by `compute` with op "multiply", and kept because blueprints already stored carry it.
const ProductRecipe = z.object({
  kind: z.literal("product"),
  of: z.tuple([PathString, PathString]),
  multiplier: z.number().optional(),
  fraction_digits: z.number().int().min(0).max(6).optional(),
});

const ComputeRecipe = z.object({
  kind: z.literal("compute"),
  op: z.enum(COMPUTE_OPS),
  of: z.tuple([PathString, PathString]),
  multiplier: z.number().optional(),
  fraction_digits: z.number().int().min(0).max(6).optional(),
});

const CompareRecipe = z.object({
  kind: z.literal("compare"),
  op: z.enum(COMPARE_OPS),
  of: z.tuple([PathString, PathString]),
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
  ComputeRecipe,
  CompareRecipe,
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

// The recipe for an array container, describing it as a whole: how long it is, from a band or
// from `of`, a field that says the length outright, and what it is ordered by. Which of those a
// recipe has to carry is checked by `validatePlan`, since only the body can answer that.
const ArrayLengthRecipe = z.object({
  kind: z.literal("array_length"),
  min: z.number().int().min(0).max(MAX_ARRAY_ITEMS).optional(),
  max: z.number().int().min(1).max(MAX_ARRAY_ITEMS).optional(),
  of: PathString.optional(),
  order_by: PathString.optional(),
  order: z.enum(SORT_DIRECTIONS).optional(),
});
export type ArrayLengthRecipeDTO = z.infer<typeof ArrayLengthRecipe>;

export const Recipe = z.discriminatedUnion("kind", [
  ...LEAF_RECIPES,
  BranchRecipe,
  ArrayLengthRecipe,
]);
export type RecipeDTO = z.infer<typeof Recipe>;
export type RecipeKind = RecipeDTO["kind"];
