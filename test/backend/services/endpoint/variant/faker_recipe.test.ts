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

describe("aggregate", () => {
  const BASE = {
    item_count: 0,
    avg_price: 0,
    min_price: 0,
    max_price: 0,
    items: [{ price: 1 }, { price: 1 }],
  };

  const PLAN = plan({
    fields: [
      { path: "items", recipe: { kind: "array_length", min: 1, max: 6 } },
      { path: "items[].price", recipe: { kind: "int", min: 1000, max: 99_000 } },
      { path: "item_count", recipe: { kind: "aggregate", op: "count", of: "items" } },
      {
        path: "avg_price",
        recipe: { kind: "aggregate", op: "avg", of: "items[].price", fraction_digits: 2 },
      },
      { path: "min_price", recipe: { kind: "aggregate", op: "min", of: "items[].price" } },
      { path: "max_price", recipe: { kind: "aggregate", op: "max", of: "items[].price" } },
    ],
  });

  // The regression `sum` with a multiplier could never cover: the length changes per render, so
  // anything computed from a fixed divisor drifts the moment array_length draws a new size.
  it("follows the length array_length just drew, on every render", () => {
    for (const out of render(PLAN, BASE, 200)) {
      const prices = (out.items as { price: number }[]).map((item) => item.price);

      expect(out.item_count).toBe(prices.length);
      expect(out.min_price).toBe(Math.min(...prices));
      expect(out.max_price).toBe(Math.max(...prices));
      expect(out.avg_price).toBeCloseTo(prices.reduce((a, b) => a + b, 0) / prices.length, 2);
    }
  });
});

describe("compute and compare", () => {
  const BASE = { page: 1, per_page: 10, total: 42, page_count: 1, has_next: false, ratio: 0 };

  const PLAN = plan({
    fields: [
      { path: "page", recipe: { kind: "int", min: 1, max: 5 } },
      { path: "per_page", recipe: { kind: "pick", values: [10, 20, 25] } },
      { path: "total", recipe: { kind: "int", min: 0, max: 400 } },
      {
        path: "page_count",
        recipe: { kind: "compute", op: "ceil_divide", of: ["total", "per_page"] },
      },
      { path: "has_next", recipe: { kind: "compare", op: "lt", of: ["page", "page_count"] } },
    ],
  });

  it("derives a page count and a flag that agree with the numbers beside them", () => {
    for (const out of render(PLAN, BASE, 300)) {
      const page = out.page as number;
      const expected = Math.ceil((out.total as number) / (out.per_page as number));

      expect(out.page_count).toBe(expected);
      expect(out.has_next).toBe(page < expected);
    }
  });

  // Every other recipe leaves the base value on a read it cannot use, and this is the same rule.
  it("leaves the base value in place when the divisor is zero", () => {
    const zeroed = plan({
      fields: [
        { path: "per_page", recipe: { kind: "const", value: 0 } },
        { path: "ratio", recipe: { kind: "compute", op: "divide", of: ["total", "per_page"] } },
      ],
    });

    for (const out of render(zeroed, BASE, 20)) {
      expect(out.ratio).toBe(0);
      expect(Number.isFinite(out.ratio as number)).toBe(true);
    }
  });

  it("refuses to compare across types rather than coercing", () => {
    const mixed = plan({
      fields: [{ path: "has_next", recipe: { kind: "compare", op: "gt", of: ["total", "page"] } }],
    });

    for (const out of render(mixed, BASE, 20)) {
      expect(typeof out.has_next).toBe("boolean");
    }
  });
});

describe("bounded dates", () => {
  const BASE = {
    from: "2024-01-01",
    to: "2024-03-31",
    created_at: "2024-02-01",
    items: [{ at: "2024-02-01" }],
  };

  it("keeps the date inside the range the body states", () => {
    const PLAN = plan({
      fields: [
        {
          path: "created_at",
          // A window far wider than the bounds, so only the bounds can be holding it in.
          recipe: {
            kind: "date",
            format: "date",
            days_back: 3650,
            days_forward: 3650,
            not_before: "from",
            not_after: "to",
          },
        },
      ],
    });

    for (const out of render(PLAN, BASE, 200)) {
      expect(out.created_at >= BASE.from).toBe(true);
      expect(out.created_at <= BASE.to).toBe(true);
    }
  });

  // One bound and no other is the case the days window can still swallow, since there is no
  // second bound to pin the other end against.
  describe("a lone bound", () => {
    it("holds a date after a `not_before` the window cannot reach", () => {
      const PLAN = plan({
        fields: [
          {
            path: "created_at",
            recipe: { kind: "date", format: "date", days_back: 30, not_before: "far" },
          },
        ],
      });

      for (const out of render(PLAN, { ...BASE, far: "2090-01-01" }, 60)) {
        expect(out.created_at >= "2090-01-01").toBe(true);
      }
    });

    it("holds a date before a `not_after` the window cannot reach", () => {
      const PLAN = plan({
        fields: [
          {
            path: "created_at",
            recipe: { kind: "date", format: "date", days_back: 30, not_after: "ancient" },
          },
        ],
      });

      for (const out of render(PLAN, { ...BASE, ancient: "1970-06-01" }, 60)) {
        expect(out.created_at <= "1970-06-01").toBe(true);
      }
    });

    it("still narrows rather than replaces when the window does reach it", () => {
      const PLAN = plan({
        fields: [
          {
            path: "created_at",
            recipe: { kind: "date", format: "date", days_back: 3650, not_before: "from" },
          },
        ],
      });

      const dates = render(PLAN, BASE, 200).map((out) => out.created_at);
      for (const date of dates) expect(date >= BASE.from).toBe(true);
      // A replaced range would answer the bound itself every time.
      expect(new Set(dates).size).toBeGreaterThan(1);
    });
  });

  it("holds every element of a list inside a range named outside it", () => {
    const PLAN = plan({
      fields: [
        { path: "items", recipe: { kind: "array_length", min: 3, max: 6 } },
        {
          path: "items[].at",
          recipe: { kind: "date", format: "date", days_back: 3650, not_before: "from", not_after: "to" },
        },
      ],
    });

    for (const out of render(PLAN, BASE, 60)) {
      for (const item of out.items as { at: string }[]) {
        expect(item.at >= BASE.from).toBe(true);
        expect(item.at <= BASE.to).toBe(true);
      }
    }
  });
});
