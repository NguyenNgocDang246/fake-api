import {
  PlanFieldDTO,
  RecipeDTO,
  VariantPlanDTO,
} from "@/models/endpoint_plan/endpoint_plan.model";

// Turns a blueprint into one plain sentence per field. This is the escape valve for the one
// failure mode the blueprint approach has that a per-call model does not: a field the model
// misread stays misread until someone rebuilds it, and nobody can fix what they cannot see.
// Deliberately prose, not JSON: the reader is the API author, not a developer of this app.

export interface PlanSummaryRow {
  path: string;
  description: string;
}

function list(values: unknown[], max = 4): string {
  const shown = values.slice(0, max).map((value) => JSON.stringify(value));
  return values.length > max ? `${shown.join(", ")} and ${values.length - max} more` : shown.join(", ");
}

function amount(value: number): string {
  return Number.isInteger(value) ? value.toLocaleString("en-US") : String(value);
}

function describeRecipe(recipe: RecipeDTO, plan: VariantPlanDTO): string {
  switch (recipe.kind) {
    case "entity": {
      const kind = plan.entities.find((entity) => entity.id === recipe.entity)?.kind ?? "record";
      const attr = recipe.attr.replace(/_/g, " ");
      return `the ${attr} of one ${kind}, shared with the other "${recipe.entity}" fields`;
    }
    case "catalog":
      return `the "${recipe.column}" of one row of "${recipe.catalog}", so it always matches the other "${recipe.catalog}" fields`;
    case "catalog_range":
      return `a number inside the range that row of "${recipe.catalog}" allows`;
    case "pick": {
      const spread = recipe.weights ? ", weighted so some come up far more often" : "";
      return `one of ${list(recipe.values)}${spread}`;
    }
    case "int":
      return `a whole number from ${amount(recipe.min)} to ${amount(recipe.max)}${
        recipe.step ? `, in steps of ${amount(recipe.step)}` : ""
      }`;
    case "float":
      return `a number from ${amount(recipe.min)} to ${amount(recipe.max)}${
        recipe.step ? `, in steps of ${amount(recipe.step)}` : ""
      }`;
    case "bool":
      return recipe.probability === undefined
        ? "true or false"
        : `true about ${Math.round(recipe.probability * 100)}% of the time`;
    case "date": {
      const back = recipe.days_back ?? 30;
      const forward = recipe.days_forward ?? 0;
      const window = forward > 0 ? `the last ${back} and next ${forward} days` : `the last ${back} days`;
      return `a date within ${window}`;
    }
    case "pattern":
      return `a code shaped like "${recipe.pattern}"`;
    case "semantic":
      return `a ${recipe.name.replace(/_/g, " ")}`;
    case "const":
      return `always ${JSON.stringify(recipe.value)}`;
    case "template": {
      const slots = Object.values(recipe.slots ?? {});
      const combinations = slots.reduce((total, values) => total * values.length, 1);
      const refs = Object.values(recipe.refs ?? {});
      const from = refs.length > 0 ? `, mentioning ${refs.join(" and ")}` : "";
      return `a sentence assembled from ${slots.length} word lists${from} (${combinations.toLocaleString("en-US")} combinations)`;
    }
    case "copy":
      return `the same value as ${recipe.of}`;
    case "after": {
      const unit = recipe.unit ?? "day";
      return unit === "number"
        ? `${recipe.of} plus ${amount(recipe.min_delta)} to ${amount(recipe.max_delta)}`
        : `${amount(recipe.min_delta)} to ${amount(recipe.max_delta)} ${unit}s after ${recipe.of}`;
    }
    case "sum":
      return `the total of ${recipe.of}`;
    case "product":
      return `${recipe.of[0]} multiplied by ${recipe.of[1]}`;
    case "branch": {
      const cases = Object.keys(recipe.cases);
      return `depends on ${recipe.on}: set for ${list(cases)}, otherwise ${describeRecipe(recipe.default, plan)}`;
    }
    case "array_length":
      return `${recipe.min} to ${recipe.max} items, a different number each call`;
  }
}

export function describePlanField(field: PlanFieldDTO, plan: VariantPlanDTO): PlanSummaryRow {
  return { path: field.path, description: describeRecipe(field.recipe, plan) };
}

export function describePlan(plan: VariantPlanDTO): PlanSummaryRow[] {
  return plan.fields.map((field) => describePlanField(field, plan));
}

// A one line note about the tables the blueprint had to invent, if it invented any.
export function describePlanCatalogs(plan: VariantPlanDTO): string | null {
  if (plan.catalogs.length === 0) return null;

  return plan.catalogs
    .map((catalog) => `"${catalog.id}" (${catalog.rows.length} combinations of ${catalog.columns.join(", ")})`)
    .join("; ");
}
