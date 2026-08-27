import { MAX_ARRAY_ITEMS, MAX_AI_FIELDS } from "@/models/endpoint/endpoint.model";
import { AGGREGATE_OPS } from "@/models/endpoint_plan/catalog.model";
import {
  MAX_PLAN_FIELDS,
  MAX_TEMPLATE_SLOTS,
  PLAN_VERSION,
  VariantPlanSchema,
} from "@/models/endpoint_plan/endpoint_plan.model";

describe("schema level rejection", () => {
  it("refuses a kind and a semantic name outside the whitelist", () => {
    expect(
      VariantPlanSchema.safeParse({
        version: PLAN_VERSION,
        fields: [{ path: "a", recipe: { kind: "exec", cmd: "rm -rf /" } }],
      }).success
    ).toBe(false);

    expect(
      VariantPlanSchema.safeParse({
        version: PLAN_VERSION,
        fields: [{ path: "a", recipe: { kind: "semantic", name: "shell_command" } }],
      }).success
    ).toBe(false);
  });

  it("caps array_length at the shared array item ceiling", () => {
    expect(
      VariantPlanSchema.safeParse({
        version: PLAN_VERSION,
        fields: [
          { path: "a", recipe: { kind: "array_length", min: 1, max: MAX_ARRAY_ITEMS + 1 } },
        ],
      }).success
    ).toBe(false);
  });
});

describe("plan size limits", () => {
  // A blueprint carries one recipe per selected path, so a plan holding more fields than a
  // caller can ever select is only ever an attack. These two must not drift apart.
  it("caps fields at or above the number of paths a caller can select", () => {
    expect(MAX_PLAN_FIELDS).toBeGreaterThanOrEqual(MAX_AI_FIELDS);
  });

  it("refuses a plan with more fields than the cap", () => {
    const field = { path: "name", recipe: { kind: "semantic", name: "full_name" } };
    const overCap = {
      version: PLAN_VERSION,
      fields: Array.from({ length: MAX_PLAN_FIELDS + 1 }, () => field),
    };

    expect(VariantPlanSchema.safeParse(overCap).success).toBe(false);
  });

  it("accepts a plan exactly at the cap", () => {
    const field = { path: "name", recipe: { kind: "semantic", name: "full_name" } };
    const atCap = {
      version: PLAN_VERSION,
      fields: Array.from({ length: MAX_PLAN_FIELDS }, () => field),
    };

    expect(VariantPlanSchema.safeParse(atCap).success).toBe(true);
  });
});

describe("template slots", () => {
  const planWith = (slotCount: number) => ({
    version: PLAN_VERSION,
    fields: [
      {
        path: "a",
        recipe: {
          kind: "template",
          pattern: "{s0}",
          slots: Object.fromEntries(
            Array.from({ length: slotCount }, (_, i) => [`s${i}`, ["x"]])
          ),
        },
      },
    ],
  });

  it("accepts a template at the slot ceiling and refuses one past it", () => {
    expect(VariantPlanSchema.safeParse(planWith(MAX_TEMPLATE_SLOTS)).success).toBe(true);
    expect(VariantPlanSchema.safeParse(planWith(MAX_TEMPLATE_SLOTS + 1)).success).toBe(false);
  });
});

describe("aggregate", () => {
  function planWith(recipe: unknown) {
    return { version: PLAN_VERSION, fields: [{ path: "count", recipe }] };
  }

  it("accepts every op in the vocabulary", () => {
    for (const op of AGGREGATE_OPS) {
      expect(VariantPlanSchema.safeParse(planWith({ kind: "aggregate", op, of: "items" })).success).toBe(
        true
      );
    }
  });

  it("refuses an op outside it", () => {
    expect(
      VariantPlanSchema.safeParse(planWith({ kind: "aggregate", op: "stddev", of: "items" })).success
    ).toBe(false);
  });

  it("refuses fraction_digits outside the shared range", () => {
    expect(
      VariantPlanSchema.safeParse(
        planWith({ kind: "aggregate", op: "avg", of: "items[].price", fraction_digits: 7 })
      ).success
    ).toBe(false);
  });
});
