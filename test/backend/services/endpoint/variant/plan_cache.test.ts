import {
  getCachedPlan,
  parsePlan,
  resetPlanCache,
  setCachedPlan,
} from "@/server/services/endpoint/variant/plan_cache";
import { VariantPlanDTO } from "@/models/endpoint_plan/endpoint_plan.model";

const planWith = (name: string) =>
  JSON.stringify({
    version: 1,
    locale: "en",
    entities: [],
    catalogs: [],
    unapplied_hints: [],
    unsupported_language: null,
    fields: [{ path: "name", recipe: { kind: "semantic", name } }],
  });

const entryFor = (source: string) => ({
  plan: parsePlan(source) as VariantPlanDTO,
  uniqueCatalogs: new Set<string>(),
  source,
});

beforeEach(() => resetPlanCache());

describe("plan cache", () => {
  it("hands back the entry it stored for the same blueprint", () => {
    const source = planWith("full_name");
    setCachedPlan("hash-a", entryFor(source));

    expect(getCachedPlan("hash-a", source)?.plan.fields[0]?.recipe).toMatchObject({
      name: "full_name",
    });
  });

  // `ai_plan_hash` covers the inputs a blueprint was built for, not the blueprint itself, so
  // clearing a plan and rebuilding it from an unchanged body produces the same hash over
  // different content. Without the source check the old blueprint would be served forever.
  it("misses when the hash is the same but the blueprint is not", () => {
    const first = planWith("full_name");
    setCachedPlan("hash-a", entryFor(first));

    expect(getCachedPlan("hash-a", planWith("first_name"))).toBeUndefined();
  });

  it("misses on an unknown hash", () => {
    setCachedPlan("hash-a", entryFor(planWith("full_name")));

    expect(getCachedPlan("hash-b", planWith("full_name"))).toBeUndefined();
  });

  it("evicts the least recently read entry rather than the oldest", () => {
    for (let i = 0; i < 200; i += 1) setCachedPlan(`h${i}`, entryFor(planWith("full_name")));

    // Read the first one back so it is no longer the least recently used, then overflow by one.
    expect(getCachedPlan("h0", planWith("full_name"))).toBeDefined();
    setCachedPlan("h200", entryFor(planWith("full_name")));

    expect(getCachedPlan("h0", planWith("full_name"))).toBeDefined();
    expect(getCachedPlan("h1", planWith("full_name"))).toBeUndefined();
  });

  it("treats an unparseable or malformed blueprint as absent", () => {
    expect(parsePlan("not json")).toBeNull();
    expect(parsePlan(JSON.stringify({ version: 99 }))).toBeNull();
  });
});
