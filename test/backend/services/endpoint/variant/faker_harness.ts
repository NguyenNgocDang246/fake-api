import {
  PLAN_VERSION,
  VariantPlanDTO,
  VariantPlanSchema,
} from "@/models/endpoint_plan/endpoint_plan.model";
import { renderVariant } from "@/server/services/endpoint/variant/faker.service";
import { validatePlan } from "@/server/services/endpoint/variant/validate";

export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function plan(
  partial: Partial<VariantPlanDTO> & Pick<VariantPlanDTO, "fields">
): VariantPlanDTO {
  return VariantPlanSchema.parse({
    version: PLAN_VERSION,
    locale: "en",
    entities: [],
    catalogs: [],
    unapplied_hints: [],
    ...partial,
  });
}

export function pathsOf(p: VariantPlanDTO): string[] {
  return p.fields.map((field) => field.path);
}

// Generic so each suite keeps the shape of its own base body and the assertions stay typed.
export function render<T>(p: VariantPlanDTO, base: T, times = 1): T[] {
  const check = validatePlan(p, base, pathsOf(p));
  expect(check.errors).toEqual([]);

  return Array.from({ length: times }, () => {
    const out = renderVariant(p, base);
    expect(out).not.toBeNull();
    return out as T;
  });
}

export function fold(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]/gi, "")
    .toLowerCase();
}
