import { emitFromSource, parseJsonSource } from "@/server/services/endpoint/variant/json_source";
import { renderVariant } from "@/server/services/endpoint/variant/faker.service";
import { validatePlan } from "@/server/services/endpoint/variant/validate";
import { plan, pathsOf } from "./faker_harness";

// The shape this feature is most often pointed at, asserted through the same chain the fake route
// runs: parse the author's text, render, write back against it. Each relation has unit tests of
// its own; what this covers is that they hold together in one body.
describe("a paginated body", () => {
  it("renders a response that agrees with itself on every call", () => {
    const text = `{
  "page": 1,
  "per_page": 5,
  "total": 42,
  "page_count": 1,
  "has_next": false,
  "from": "2024-01-01",
  "to": "2024-06-30",
  "filters": { "category": "phone" },
  "data": [
    { "id": 1, "name": "x", "category": "y", "price": 10.00, "created_at": "2024-03-01" }
  ]
}`;
    const source = parseJsonSource(text)!;

    const PLAN = plan({
      fields: [
        { path: "page", recipe: { kind: "int", min: 1, max: 4 } },
        { path: "per_page", recipe: { kind: "pick", values: [5, 10, 20] } },
        { path: "total", recipe: { kind: "int", min: 0, max: 300 } },
        { path: "page_count", recipe: { kind: "compute", op: "ceil_divide", of: ["total", "per_page"] } },
        { path: "has_next", recipe: { kind: "compare", op: "lt", of: ["page", "page_count"] } },
        { path: "filters.category", recipe: { kind: "pick", values: ["phone", "laptop", "tablet"] } },
        {
          path: "data",
          recipe: { kind: "array_length", of: "per_page", order_by: "data[].price", order: "desc" },
        },
        { path: "data[].id", recipe: { kind: "int", min: 1, max: 9999, unique: true } },
        { path: "data[].category", recipe: { kind: "copy", of: "filters.category" } },
        { path: "data[].price", recipe: { kind: "float", min: 1, max: 999, fraction_digits: 2 } },
        {
          path: "data[].created_at",
          recipe: { kind: "date", format: "date", days_back: 3650, not_before: "from", not_after: "to" },
        },
      ],
    });

    expect(validatePlan(PLAN, source.value, pathsOf(PLAN)).errors).toEqual([]);

    for (let i = 0; i < 60; i += 1) {
      const out = JSON.parse(emitFromSource(renderVariant(PLAN, source.value), source)) as {
        page: number;
        per_page: number;
        total: number;
        page_count: number;
        has_next: boolean;
        filters: { category: string };
        data: { id: number; category: string; price: number; created_at: string }[];
      };

      expect(out.data.length).toBe(out.per_page);
      expect(out.page_count).toBe(Math.ceil(out.total / out.per_page));
      expect(out.has_next).toBe(out.page < out.page_count);

      const prices = out.data.map((row) => row.price);
      expect([...prices].sort((a, b) => b - a)).toEqual(prices);
      expect(new Set(out.data.map((row) => row.id)).size).toBe(out.data.length);

      for (const row of out.data) {
        expect(row.category).toBe(out.filters.category);
        expect(row.created_at >= "2024-01-01").toBe(true);
        expect(row.created_at <= "2024-06-30").toBe(true);
      }
    }
  });
});
