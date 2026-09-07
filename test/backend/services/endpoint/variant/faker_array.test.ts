import { plan, render } from "./faker_harness";

describe("array_length", () => {
  const BASE = { items: [{ sku: "a", qty: 1 }] };

  const PLAN = plan({
    fields: [
      { path: "items", recipe: { kind: "array_length", min: 1, max: 5 } },
      { path: "items[].sku", recipe: { kind: "pattern", pattern: "SKU-####", unique: true } },
      { path: "items[].qty", recipe: { kind: "int", min: 1, max: 9 } },
    ],
  });

  it("varies the length and fills every cloned element", () => {
    const lengths = new Set<number>();

    for (const out of render(PLAN, BASE, 200)) {
      const items = out.items as { sku: string; qty: number }[];
      lengths.add(items.length);

      expect(items.length).toBeGreaterThanOrEqual(1);
      expect(items.length).toBeLessThanOrEqual(5);
      for (const item of items) {
        expect(item.sku).toMatch(/^SKU-\d{4}$/);
        expect(Number.isInteger(item.qty)).toBe(true);
      }
      expect(new Set(items.map((item) => item.sku)).size).toBe(items.length);
    }

    expect(lengths).toEqual(new Set([1, 2, 3, 4, 5]));
  });

  it("redraws entities once per element of the new length", () => {
    const withEntity = plan({
      entities: [{ id: "p", kind: "person" }],
      fields: [
        { path: "items", recipe: { kind: "array_length", min: 4, max: 5 } },
        { path: "items[].sku", recipe: { kind: "entity", entity: "p", attr: "full_name" } },
      ],
    });

    const distinct = render(withEntity, BASE, 40).map((out) => {
      const items = out.items as { sku: string }[];
      return new Set(items.map((item) => item.sku)).size;
    });

    // Four or five people per response, so a shared draw would show up as a size of 1.
    expect(Math.max(...distinct)).toBeGreaterThan(1);
  });
});

describe("weights", () => {
  it("follows the declared frequency instead of spreading evenly", () => {
    const BASE = { status: "a" };
    const PLAN = plan({
      fields: [
        {
          path: "status",
          recipe: { kind: "pick", values: ["success", "pending", "failed"], weights: [85, 10, 5] },
        },
      ],
    });

    const counts = { success: 0, pending: 0, failed: 0 };
    for (const out of render(PLAN, BASE, 2000)) {
      counts[out.status as keyof typeof counts] += 1;
    }

    expect(counts.success / 2000).toBeGreaterThan(0.78);
    expect(counts.success / 2000).toBeLessThan(0.92);
    expect(counts.failed / 2000).toBeLessThan(0.12);
  });
});

describe("template", () => {
  const BASE = { items: [{ name: "x", description: "y" }] };

  const PLAN = plan({
    catalogs: [{ id: "p", columns: ["name"], rows: [["Chair"], ["Desk"], ["Lamp"]] }],
    fields: [
      { path: "items[].name", recipe: { kind: "catalog", catalog: "p", column: "name" } },
      {
        path: "items[].description",
        recipe: {
          kind: "template",
          pattern: "{{name}} in {{slot:color}}, made of {{slot:material}}",
          refs: { name: "items[].name" },
          slots: { color: ["black", "white", "navy", "beige"], material: ["oak", "steel", "pine"] },
        },
      },
    ],
  });

  it("interpolates the value the referenced path was just given", () => {
    for (const out of render(PLAN, BASE, 100)) {
      const item = (out.items as { name: string; description: string }[])[0]!;
      expect(item.description.startsWith(item.name)).toBe(true);
    }
  });

  it("multiplies its slots out instead of repeating a short list", () => {
    const seen = new Set(
      render(PLAN, BASE, 400).map(
        (out) => (out.items as { description: string }[])[0]!.description
      )
    );
    // 3 names x 4 colors x 3 materials = 36 combinations.
    expect(seen.size).toBeGreaterThan(24);
  });
});
