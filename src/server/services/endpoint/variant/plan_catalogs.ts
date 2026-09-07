import { RecipeDTO } from "@/models/endpoint_plan/recipe.model";
import { VariantPlanDTO } from "@/models/endpoint_plan/endpoint_plan.model";

// Kept out of the executor so the serving path can compute this without pulling in faker and
// its eight locale datasets. Nothing here draws a value; it only reads the blueprint.
export function collectUniqueCatalogs(plan: VariantPlanDTO): Set<string> {
  const unique = new Set<string>();

  const walk = (recipe: RecipeDTO) => {
    if (recipe.kind === "catalog" && recipe.unique) unique.add(recipe.catalog);
    if (recipe.kind === "branch") {
      for (const nested of [...Object.values(recipe.cases), recipe.default]) walk(nested);
    }
  };

  for (const field of plan.fields) walk(field.recipe);
  return unique;
}
