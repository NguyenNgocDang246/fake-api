import { RecipeDTO } from "@/models/endpoint_plan/recipe.model";
import { VariantPlanDTO, recipeDependencies } from "@/models/endpoint_plan/endpoint_plan.model";
import { scopePathOf } from "@/app/libs/helpers/json_path";

// The innermost array a field sits in. A field inside `rows[].cells[]` is drawn once per inner
// element, so it shares a scope only with fields under that same inner array.
export function scopeKeyOf(path: string): string {
  return scopePathOf(path);
}

// `sum` and `aggregate` are the recipes that read a whole array at once rather than one element
// at the index being drawn, so they are the dependencies allowed to cross a scope.
export function wholeArrayReads(recipe: RecipeDTO): Set<string> {
  const paths = new Set<string>();

  const walk = (current: RecipeDTO) => {
    if (current.kind === "sum" || current.kind === "aggregate") paths.add(current.of);
    if (current.kind === "branch") {
      for (const nested of [...Object.values(current.cases), current.default]) walk(nested);
    }
  };

  walk(recipe);
  return paths;
}

// An entity or catalog is drawn once per scope, so every path bound to it has to sit in the same
// scope. Mixing them would ask for one draw and many draws at the same time.
export function validateScopes({
  plan,
  errors,
}: {
  plan: VariantPlanDTO;
  errors: string[];
}): void {
  const scopes = new Map<string, Set<string>>();

  const record = (holder: string, path: string) => {
    const seen = scopes.get(holder) ?? new Set<string>();
    seen.add(scopeKeyOf(path));
    scopes.set(holder, seen);
  };

  const walk = (recipe: RecipeDTO, path: string) => {
    if (recipe.kind === "entity") record(`entity:${recipe.entity}`, path);
    if (recipe.kind === "catalog" || recipe.kind === "catalog_range") {
      record(`catalog:${recipe.catalog}`, path);
    }
    if (recipe.kind === "branch") {
      for (const nested of [...Object.values(recipe.cases), recipe.default]) walk(nested, path);
    }
  };

  for (const field of plan.fields) walk(field.recipe, field.path);

  for (const [holder, seen] of scopes) {
    if (seen.size > 1) {
      const label = holder.startsWith("entity:") ? "Entity" : "Catalog";
      errors.push(`${label} "${holder.split(":")[1]}" is used both inside and outside an array`);
    }
  }
}

// A cycle would make the executor loop or read a value that does not exist yet.
export function validateAcyclic({
  plan,
  fieldByPath,
  errors,
}: {
  plan: VariantPlanDTO;
  fieldByPath: Map<string, { path: string; recipe: RecipeDTO }>;
  errors: string[];
}): void {
  const state = new Map<string, "visiting" | "done">();

  const visit = (path: string, trail: string[]): boolean => {
    if (state.get(path) === "done") return true;
    if (state.get(path) === "visiting") {
      errors.push(`Fields depend on each other in a loop: ${[...trail, path].join(" -> ")}`);
      return false;
    }

    const field = fieldByPath.get(path);
    if (!field) return true;

    state.set(path, "visiting");
    for (const dependency of recipeDependencies(field.recipe)) {
      if (dependency === path) continue;
      if (!visit(dependency, [...trail, path])) return false;
    }
    state.set(path, "done");
    return true;
  };

  for (const field of plan.fields) {
    if (!visit(field.path, [])) return;
  }
}
