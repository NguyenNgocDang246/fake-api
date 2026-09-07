import { plan, render, fold } from "./faker_harness";

describe("entity coherence", () => {
  const BASE = {
    user: { first: "a", last: "b", name: "a b", email: "a@b.c", username: "ab" },
    other: { name: "x y", email: "x@y.z" },
  };

  const PLAN = plan({
    entities: [
      { id: "u", kind: "person" },
      { id: "o", kind: "person" },
    ],
    fields: [
      { path: "user.first", recipe: { kind: "entity", entity: "u", attr: "first_name" } },
      { path: "user.last", recipe: { kind: "entity", entity: "u", attr: "last_name" } },
      { path: "user.name", recipe: { kind: "entity", entity: "u", attr: "full_name" } },
      { path: "user.email", recipe: { kind: "entity", entity: "u", attr: "email" } },
      { path: "user.username", recipe: { kind: "entity", entity: "u", attr: "username" } },
      { path: "other.name", recipe: { kind: "entity", entity: "o", attr: "full_name" } },
      { path: "other.email", recipe: { kind: "entity", entity: "o", attr: "email" } },
    ],
  });

  it("builds the email out of the name it sits beside", () => {
    for (const { user } of render(PLAN, BASE, 40)) {
      // faker folds diacritics and joins the parts with its own separator, so the check is
      // containment of the ascii-folded name parts rather than equality.
      const local = fold(user.email.split("@")[0]!);

      expect(local).toContain(fold(user.first));
      expect(local).toContain(fold(user.last));
      expect(user.name).toContain(user.first);
      expect(user.name).toContain(user.last);
    }
  });

  it("keeps two entities apart", () => {
    const collisions = render(PLAN, BASE, 30).filter((out) => out.user.name === out.other.name);
    expect(collisions.length).toBeLessThan(3);
  });
});

describe("catalog: correlated fields move together", () => {
  const ROWS: [string, string, string, number, number][] = [
    ["electronics", "Bluetooth Headphones", "Sony", 500_000, 3_500_000],
    ["electronics", "Power Bank 20000mAh", "Anker", 300_000, 1_200_000],
    ["grocery", "Jasmine Rice 5kg", "ST25", 150_000, 220_000],
    ["fashion", "Cotton T-Shirt", "Uniqlo", 200_000, 600_000],
  ];

  const BASE = {
    items: [
      { category: "x", name: "y", brand: "z", price: 1 },
      { category: "x", name: "y", brand: "z", price: 1 },
      { category: "x", name: "y", brand: "z", price: 1 },
    ],
  };

  const PLAN = plan({
    catalogs: [
      {
        id: "products",
        columns: ["category", "name", "brand", "price_min", "price_max"],
        rows: ROWS,
      },
    ],
    fields: [
      { path: "items[].category", recipe: { kind: "catalog", catalog: "products", column: "category" } },
      { path: "items[].name", recipe: { kind: "catalog", catalog: "products", column: "name" } },
      { path: "items[].brand", recipe: { kind: "catalog", catalog: "products", column: "brand" } },
      {
        path: "items[].price",
        recipe: {
          kind: "catalog_range",
          catalog: "products",
          min_column: "price_min",
          max_column: "price_max",
          step: 1000,
        },
      },
    ],
  });

  it("never mixes one row's category with another row's name, brand or price", () => {
    const seenCategories = new Set<string>();

    for (const out of render(PLAN, BASE, 200)) {
      for (const item of out.items) {
        const row = ROWS.find(
          ([category, name, brand]) =>
            category === item.category && name === item.name && brand === item.brand
        );

        expect(row).toBeDefined();
        expect(item.price).toBeGreaterThanOrEqual(row![3]);
        expect(item.price).toBeLessThanOrEqual(row![4]);

        seenCategories.add(item.category);
      }
    }

    // Record 1 electronics, record 2 something else: the whole point of the mechanism.
    expect(seenCategories).toEqual(new Set(["electronics", "grocery", "fashion"]));
  });

  it("lets two elements of the same response hold different categories", () => {
    const mixed = render(PLAN, BASE, 60).some(
      (out) => new Set(out.items.map((item) => item.category)).size > 1
    );
    expect(mixed).toBe(true);
  });

  it("gives every element a distinct row when the binding asks for it", () => {
    const uniquePlan = plan({
      catalogs: PLAN.catalogs,
      fields: [
        {
          path: "items[].name",
          recipe: { kind: "catalog", catalog: "products", column: "name", unique: true },
        },
      ],
    });

    for (const out of render(uniquePlan, BASE, 80)) {
      const names = out.items.map((item) => item.name);
      expect(new Set(names).size).toBe(names.length);
    }
  });
});
