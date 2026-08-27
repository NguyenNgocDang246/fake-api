import {
  ENTITY_ATTRIBUTES,
  EntityKind,
} from "@/models/endpoint_plan/endpoint_plan.model";
import { UUID, plan, render } from "./faker_harness";

describe("the author's hint, once translated, is obeyed every time", () => {
  it("produces a uuid on all 100 renders", () => {
    const BASE = { id: "seed" };
    const PLAN = plan({
      fields: [{ path: "id", recipe: { kind: "semantic", name: "uuid" } }],
    });

    const ids = render(PLAN, BASE, 100).map((out) => out.id as string);
    expect(ids.every((id) => UUID.test(id))).toBe(true);
    expect(new Set(ids).size).toBe(100);
  });

  it("keeps a pinned numeric range on all renders", () => {
    const BASE = { price: 0 };
    const PLAN = plan({
      fields: [{ path: "price", recipe: { kind: "float", min: 10_000, max: 500_000, step: 1000 } }],
    });

    for (const out of render(PLAN, BASE, 200)) {
      expect(out.price as number).toBeGreaterThanOrEqual(10_000);
      expect(out.price as number).toBeLessThanOrEqual(500_000);
      expect((out.price as number) % 1000).toBe(0);
    }
  });
});

describe("variety", () => {
  it("does not recycle a handful of bodies", () => {
    const BASE = {
      id: "x",
      user: { name: "a", email: "b" },
      created_at: "2020-01-01T00:00:00.000Z",
    };
    const PLAN = plan({
      entities: [{ id: "u", kind: "person" }],
      fields: [
        { path: "id", recipe: { kind: "semantic", name: "uuid" } },
        { path: "user.name", recipe: { kind: "entity", entity: "u", attr: "full_name" } },
        { path: "user.email", recipe: { kind: "entity", entity: "u", attr: "email" } },
        { path: "created_at", recipe: { kind: "date", format: "iso", days_back: 365 } },
      ],
    });

    const bodies = render(PLAN, BASE, 200).map((out) => JSON.stringify(out));
    expect(new Set(bodies).size).toBe(200);
  });
});

describe("locale", () => {
  it("keeps the country in step with the city", () => {
    const BASE = { city: "x", country: "y", code: "z" };
    const PLAN = plan({
      locale: "vi",
      entities: [{ id: "a", kind: "address" }],
      fields: [
        { path: "city", recipe: { kind: "entity", entity: "a", attr: "city" } },
        { path: "country", recipe: { kind: "entity", entity: "a", attr: "country" } },
        { path: "code", recipe: { kind: "entity", entity: "a", attr: "country_code" } },
      ],
    });

    for (const out of render(PLAN, BASE, 20)) {
      expect(out.country).toBe("Việt Nam");
      expect(out.code).toBe("VN");
    }
  });
});


// `ENTITY_ATTRIBUTES` is what the prompt hands the model and what `validatePlan` checks against,
// so an attribute the executor does not draw validates and then renders nothing at all: the field
// silently keeps its base value on every request, with no log and no error. `address.ward` and
// `address.district` were exactly that.
describe("every declared entity attribute is actually drawn", () => {
  for (const kind of Object.keys(ENTITY_ATTRIBUTES) as EntityKind[]) {
    it(`draws every attribute of "${kind}"`, () => {
      const attrs = Object.keys(ENTITY_ATTRIBUTES[kind]);
      const base = Object.fromEntries(
        attrs.map((attr) => [attr, ENTITY_ATTRIBUTES[kind][attr as never] === "number" ? 0 : "x"])
      );

      const PLAN = plan({
        entities: [{ id: "e", kind }],
        fields: attrs.map((attr) => ({
          path: attr,
          recipe: { kind: "entity" as const, entity: "e", attr },
        })),
      });

      const [out] = render(PLAN, base);

      for (const attr of attrs) {
        // Rendering back the base value means the draw handed back `undefined` for this name.
        expect({ attr, value: out?.[attr] }).not.toEqual({ attr, value: base[attr] });
      }
    });
  }
});
