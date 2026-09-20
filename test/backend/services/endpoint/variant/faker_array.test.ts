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

describe("array_length following a field", () => {
  it("gives the list exactly the length the body's own field names", () => {
    const BASE = { limit: 7, items: [{ qty: 1 }] };
    const PLAN = plan({
      fields: [
        { path: "items", recipe: { kind: "array_length", of: "limit" } },
        { path: "items[].qty", recipe: { kind: "int", min: 1, max: 9 } },
      ],
    });

    for (const out of render(PLAN, BASE, 40)) {
      expect((out.items as unknown[]).length).toBe(7);
    }
  });

  // The driver is drawn before the resize, so this is what would break if it were left to the
  // ordinary pass below it: the list would follow the value the body was saved with.
  it("follows the value drawn on this call", () => {
    const BASE = { limit: 3, items: [{ qty: 1 }] };
    const PLAN = plan({
      fields: [
        { path: "limit", recipe: { kind: "pick", values: [2, 5, 9] } },
        { path: "items", recipe: { kind: "array_length", of: "limit" } },
        { path: "items[].qty", recipe: { kind: "int", min: 1, max: 9 } },
      ],
    });

    const seen = new Set<number>();
    for (const out of render(PLAN, BASE, 200)) {
      const limit = out.limit as number;
      seen.add(limit);
      expect((out.items as { qty: number }[]).length).toBe(limit);
    }

    expect(seen).toEqual(new Set([2, 5, 9]));
  });
});

describe("array order", () => {
  function isSorted(values: number[], direction: "asc" | "desc"): boolean {
    return values.every((value, index) => {
      const previous = values[index - 1];
      if (previous === undefined) return true;
      return direction === "asc" ? previous <= value : previous >= value;
    });
  }

  it("orders the list even while its length follows another field", () => {
    const BASE = { limit: 4, items: [{ price: 1 }] };
    const PLAN = plan({
      fields: [
        { path: "limit", recipe: { kind: "pick", values: [3, 6, 9] } },
        {
          path: "items",
          recipe: { kind: "array_length", of: "limit", order_by: "items[].price", order: "desc" },
        },
        { path: "items[].price", recipe: { kind: "int", min: 1, max: 999 } },
      ],
    });

    for (const out of render(PLAN, BASE, 120)) {
      const prices = (out.items as { price: number }[]).map((item) => item.price);
      expect(prices.length).toBe(out.limit as number);
      expect(isSorted(prices, "desc")).toBe(true);
    }
  });

  it("orders a list of plain values by the element itself", () => {
    const BASE = { tags: [5, 5, 5, 5] };
    const PLAN = plan({
      fields: [
        { path: "tags", recipe: { kind: "array_length", order_by: "tags[]" } },
        { path: "tags[]", recipe: { kind: "int", min: 1, max: 99 } },
      ],
    });

    for (const out of render(PLAN, BASE, 60)) {
      expect(isSorted(out.tags as number[], "asc")).toBe(true);
    }
  });

  // One recipe names one array per row, so each row has to be sorted on its own rather than the
  // rows being compared against each other.
  it("orders each inner array on its own", () => {
    const BASE = { rows: [{ cells: [1, 1, 1] }, { cells: [1, 1, 1] }] };
    const PLAN = plan({
      fields: [
        { path: "rows[].cells", recipe: { kind: "array_length", order_by: "rows[].cells[]", order: "desc" } },
        { path: "rows[].cells[]", recipe: { kind: "int", min: 1, max: 99 } },
      ],
    });

    for (const out of render(PLAN, BASE, 60)) {
      for (const row of out.rows as { cells: number[] }[]) {
        expect(isSorted(row.cells, "desc")).toBe(true);
      }
    }
  });

  // The sort runs last, so a total taken over the array is the same either way. This is the
  // assertion that would break if the pass were moved before the topo loop.
  it("leaves a total over the array unchanged", () => {
    const BASE = { total: 0, items: [{ price: 1 }] };
    const PLAN = plan({
      fields: [
        { path: "items", recipe: { kind: "array_length", min: 3, max: 6, order_by: "items[].price" } },
        { path: "items[].price", recipe: { kind: "int", min: 1, max: 50 } },
        { path: "total", recipe: { kind: "sum", of: "items[].price" } },
      ],
    });

    for (const out of render(PLAN, BASE, 80)) {
      const prices = (out.items as { price: number }[]).map((item) => item.price);
      expect(out.total).toBe(prices.reduce((acc, price) => acc + price, 0));
      expect(isSorted(prices, "asc")).toBe(true);
    }
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
