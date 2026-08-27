import { MAX_ARRAY_ITEMS, MAX_UNIQUE_RETRIES } from "@/models/endpoint_plan/limits.model";
import { JsonLeaf } from "@/models/endpoint_plan/catalog.model";
import { LeafRecipeDTO, RecipeDTO } from "@/models/endpoint_plan/recipe.model";
import {
  catalogColumnIndex,
  jsonLeafTypeOf,
  parseTemplatePlaceholders,
} from "@/models/endpoint_plan/endpoint_plan.model";
import { flattenPathValues } from "@/app/libs/helpers/json_path";
import {
  RenderContext,
  catalogRowFor,
  entityDrawFor,
  readReferenced,
} from "@/server/services/endpoint/variant/faker_context";
import { drawSemantic } from "@/server/services/endpoint/variant/faker_semantic";
import {
  DAY_MS,
  UNIT_MS,
  formatDate,
  pickWeighted,
  renderPattern,
  shapeNumber,
  toEpochMs,
} from "@/server/services/endpoint/variant/faker_value";

function drawFromCatalog(ctx: RenderContext, recipe: LeafRecipeDTO): JsonLeaf | undefined {
  if (recipe.kind !== "catalog" && recipe.kind !== "catalog_range") return undefined;

  const row = catalogRowFor(ctx, recipe.catalog);
  const catalog = ctx.catalogById.get(recipe.catalog);
  if (!row || !catalog) return undefined;

  if (recipe.kind === "catalog") return row[catalogColumnIndex(catalog, recipe.column)];

  const min = row[catalogColumnIndex(catalog, recipe.min_column)];
  const max = row[catalogColumnIndex(catalog, recipe.max_column)];
  if (typeof min !== "number" || typeof max !== "number") return undefined;

  const drawn = ctx.faker.number.float({ min: Math.min(min, max), max: Math.max(min, max) });
  return shapeNumber(drawn, recipe.step, recipe.fraction_digits);
}

function drawDerived(ctx: RenderContext, recipe: LeafRecipeDTO): JsonLeaf | undefined {
  const f = ctx.faker;

  switch (recipe.kind) {
    case "copy": {
      const value = readReferenced(ctx, recipe.of);
      return jsonLeafTypeOf(value) ? (value as JsonLeaf) : undefined;
    }
    case "after": {
      const unit = recipe.unit ?? "day";
      const source = readReferenced(ctx, recipe.of);

      if (unit === "number") {
        if (typeof source !== "number") return undefined;
        const delta = f.number.float({ min: recipe.min_delta, max: recipe.max_delta });
        return shapeNumber(source + delta, undefined, recipe.fraction_digits);
      }

      const anchor = toEpochMs(source);
      if (anchor === null || !recipe.format) return undefined;
      const step = UNIT_MS[unit] ?? DAY_MS;
      const offset = f.number.float({ min: recipe.min_delta, max: recipe.max_delta }) * step;
      return formatDate(new Date(anchor + offset), recipe.format);
    }
    case "sum": {
      // The one recipe reading a whole array rather than one element, so a nested path is
      // flattened and totalled across every level it crosses.
      const values = flattenPathValues(ctx.draft, recipe.of, MAX_ARRAY_ITEMS);
      if (values === null) return undefined;

      const total = values.reduce<number>(
        (acc, value) => acc + (typeof value === "number" ? value : 0),
        0
      );
      return shapeNumber(total * (recipe.multiplier ?? 1), undefined, recipe.fraction_digits);
    }
    case "product": {
      const [leftPath, rightPath] = recipe.of;
      const left = readReferenced(ctx, leftPath);
      const right = readReferenced(ctx, rightPath);
      if (typeof left !== "number" || typeof right !== "number") return undefined;

      return shapeNumber(left * right * (recipe.multiplier ?? 1), undefined, recipe.fraction_digits);
    }
    default:
      return undefined;
  }
}

export function drawLeaf(ctx: RenderContext, recipe: LeafRecipeDTO): JsonLeaf | undefined {
  const f = ctx.faker;

  switch (recipe.kind) {
    case "entity":
      return entityDrawFor(ctx, recipe.entity)?.[recipe.attr];
    case "catalog":
    case "catalog_range":
      return drawFromCatalog(ctx, recipe);
    case "pick":
      return pickWeighted(f, recipe.values, recipe.weights);
    case "int":
      return f.number.int({
        min: Math.ceil(recipe.min),
        max: Math.floor(recipe.max),
        ...(recipe.step ? { multipleOf: recipe.step } : {}),
      });
    case "float":
      return shapeNumber(
        f.number.float({ min: recipe.min, max: recipe.max }),
        recipe.step,
        recipe.fraction_digits ?? 2
      );
    case "bool":
      return recipe.probability === undefined
        ? f.datatype.boolean()
        : f.datatype.boolean({ probability: recipe.probability });
    case "date": {
      const back = recipe.days_back ?? 30;
      const forward = recipe.days_forward ?? 0;
      const now = Date.now();
      return formatDate(
        f.date.between({
          from: new Date(now - back * DAY_MS),
          to: new Date(now + forward * DAY_MS + 1),
        }),
        recipe.format
      );
    }
    case "pattern":
      return renderPattern(f, recipe.pattern);
    case "semantic":
      return drawSemantic(recipe.name, f, ctx.locale);
    case "const":
      return recipe.value;
    case "template": {
      let out = recipe.pattern;
      for (const placeholder of parseTemplatePlaceholders(recipe.pattern)) {
        const replacement = placeholder.isSlot
          ? f.helpers.arrayElement(recipe.slots?.[placeholder.name] ?? [""])
          : String(readReferenced(ctx, recipe.refs?.[placeholder.name] ?? "") ?? "");
        out = out.replace(
          placeholder.isSlot ? `{{slot:${placeholder.name}}}` : `{{${placeholder.name}}}`,
          replacement
        );
      }
      return out;
    }
    default:
      return drawDerived(ctx, recipe);
  }
}

export function drawValue(ctx: RenderContext, recipe: RecipeDTO): JsonLeaf | undefined {
  if (recipe.kind === "array_length") return undefined;

  if (recipe.kind === "branch") {
    const on = readReferenced(ctx, recipe.on);
    return drawLeaf(ctx, recipe.cases[String(on)] ?? recipe.default);
  }

  return drawLeaf(ctx, recipe);
}

export function drawUnique(
  ctx: RenderContext,
  recipe: RecipeDTO,
  seen: Set<string>
): JsonLeaf | undefined {
  for (let attempt = 0; attempt < MAX_UNIQUE_RETRIES; attempt += 1) {
    const value = drawValue(ctx, recipe);
    if (value === undefined) return undefined;

    const key = JSON.stringify(value);
    if (!seen.has(key)) {
      seen.add(key);
      return value;
    }
  }

  // A short list and a long array can make uniqueness impossible; a duplicate beats a hang.
  return drawValue(ctx, recipe);
}

// A branch carries no `unique` of its own, so the flag can only sit on one of its arms.
export function wantsUnique(recipe: RecipeDTO): boolean {
  if (recipe.kind === "branch") {
    return [...Object.values(recipe.cases), recipe.default].some(wantsUnique);
  }
  return "unique" in recipe && recipe.unique === true;
}
