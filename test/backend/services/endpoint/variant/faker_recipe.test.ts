import { plan, render } from "./faker_harness";

describe("derived relations", () => {
  const BASE = {
    created_at: "2020-01-01T00:00:00.000Z",
    shipped_at: "2020-01-01T00:00:00.000Z",
    grand_total: 0,
    items: [
      { qty: 1, price: 1, total: 1 },
      { qty: 1, price: 1, total: 1 },
    ],
  };

  const PLAN = plan({
    fields: [
      { path: "created_at", recipe: { kind: "date", format: "iso", days_back: 90 } },
      {
        path: "shipped_at",
        recipe: { kind: "after", of: "created_at", min_delta: 1, max_delta: 14, format: "iso" },
      },
      { path: "items[].qty", recipe: { kind: "int", min: 1, max: 5 } },
      { path: "items[].price", recipe: { kind: "float", min: 10_000, max: 900_000, step: 1000 } },
      {
        path: "items[].total",
        recipe: { kind: "product", of: ["items[].qty", "items[].price"], fraction_digits: 0 },
      },
      { path: "grand_total", recipe: { kind: "sum", of: "items[].total", fraction_digits: 0 } },
    ],
  });

  it("orders dates and reconciles totals on every single render", () => {
    for (const out of render(PLAN, BASE, 200)) {
      expect(Date.parse(out.shipped_at as string)).toBeGreaterThan(
        Date.parse(out.created_at as string)
      );

      const items = out.items as { qty: number; price: number; total: number }[];
      let sum = 0;
      for (const item of items) {
        expect(item.total).toBe(item.qty * item.price);
        sum += item.total;
      }
      expect(out.grand_total).toBe(sum);
    }
  });
});

describe("branch", () => {
  const BASE = { status: "pending", created_at: "2020-01-01T00:00:00.000Z", shipped_at: "2020-01-02T00:00:00.000Z" };

  const PLAN = plan({
    fields: [
      {
        path: "status",
        recipe: { kind: "pick", values: ["pending", "shipped"], weights: [50, 50] },
      },
      {
        path: "shipped_at",
        recipe: {
          kind: "branch",
          on: "status",
          cases: {
            shipped: { kind: "after", of: "created_at", min_delta: 1, max_delta: 14, format: "iso" },
          },
          default: { kind: "const", value: null },
        },
      },
    ],
  });

  it("leaves the timestamp null exactly when the status says nothing shipped", () => {
    const outs = render(PLAN, BASE, 200);

    for (const out of outs) {
      if (out.status === "shipped") {
        expect(typeof out.shipped_at).toBe("string");
        expect(Date.parse(out.shipped_at as string)).toBeGreaterThan(Date.parse(BASE.created_at));
      } else {
        expect(out.shipped_at).toBeNull();
      }
    }

    expect(outs.some((out) => out.status === "shipped")).toBe(true);
    expect(outs.some((out) => out.status === "pending")).toBe(true);
  });

  // A branch carries no `unique` of its own, so the flag can only sit on an arm. Reading just the
  // outer recipe dropped it, and a list of ids came back with repeats.
  it("honours a unique flag that sits on one of its arms", () => {
    const CODES = ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k", "l"];
    const ARRAY_BASE = { items: [{ tier: "gold", code: "a" }] };

    const uniqueInArm = plan({
      fields: [
        { path: "items", recipe: { kind: "array_length", min: 6, max: 6 } },
        { path: "items[].tier", recipe: { kind: "pick", values: ["gold"] } },
        {
          path: "items[].code",
          recipe: {
            kind: "branch",
            on: "items[].tier",
            cases: { gold: { kind: "pick", values: CODES, unique: true } },
            default: { kind: "const", value: "x" },
          },
        },
      ],
    });

    // 6 draws from 12 values collide about 78% of the time, so a dropped flag shows up at once.
    for (const out of render(uniqueInArm, ARRAY_BASE, 40)) {
      const codes = (out.items as { code: string }[]).map((item) => item.code);
      expect(codes).toHaveLength(6);
      expect(new Set(codes).size).toBe(6);
    }
  });
});
