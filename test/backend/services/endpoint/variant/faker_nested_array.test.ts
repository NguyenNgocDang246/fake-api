import { plan, render } from "./faker_harness";
import { validatePlan } from "@/server/services/endpoint/variant/validate";

interface Cell {
  n: number;
  note: string;
}
interface Row {
  rate: number;
  cells: Cell[];
}

const BASE = {
  rows: [
    { rate: 2, cells: [{ n: 1, note: "x" }, { n: 2, note: "y" }] },
    { rate: 3, cells: [{ n: 3, note: "z" }] },
  ] as Row[],
  grid: [
    [1, 2],
    [3, 4, 5],
  ],
};

const rowsOf = (out: typeof BASE) => out.rows;
const allCells = (out: typeof BASE) => out.rows.flatMap((row) => row.cells);

describe("a path crossing two arrays", () => {
  it("draws one value per element of every inner array", () => {
    const p = plan({
      fields: [{ path: "rows[].cells[].n", recipe: { kind: "int", min: 100, max: 999 } }],
    });

    for (const out of render(p, BASE, 20)) {
      expect(out.rows.map((row) => row.cells.length)).toEqual([2, 1]);
      for (const cell of allCells(out)) {
        expect(cell.n).toBeGreaterThanOrEqual(100);
        expect(cell.n).toBeLessThanOrEqual(999);
      }
      // Only the ticked path moved.
      expect(out.rows.map((row) => row.rate)).toEqual([2, 3]);
      expect(allCells(out).map((cell) => cell.note)).toEqual(["x", "y", "z"]);
    }
  });

  it("varies an array of arrays through the [][] path", () => {
    const p = plan({
      fields: [{ path: "grid[][]", recipe: { kind: "int", min: 10, max: 99 } }],
    });

    for (const out of render(p, BASE, 20)) {
      expect(out.grid.map((row) => row.length)).toEqual([2, 3]);
      for (const value of out.grid.flat()) {
        expect(value).toBeGreaterThanOrEqual(10);
        expect(value).toBeLessThanOrEqual(99);
      }
    }
  });

  it("keeps unique across every inner array, not per array", () => {
    const p = plan({
      fields: [{ path: "rows[].cells[].note", recipe: { kind: "pattern", pattern: "N-####", unique: true } }],
    });

    for (const out of render(p, BASE, 40)) {
      const notes = allCells(out).map((cell) => cell.note);
      expect(new Set(notes).size).toBe(notes.length);
    }
  });
});

describe("references across nesting levels", () => {
  it("reads a field of the wrapping array at the right index", () => {
    const p = plan({
      fields: [{ path: "rows[].cells[].n", recipe: { kind: "copy", of: "rows[].rate" } }],
    });

    for (const out of render(p, BASE, 10)) {
      expect(out.rows.map((row) => row.cells.map((cell) => cell.n))).toEqual([[2, 2], [3]]);
    }
  });

  it("refuses a reference pointing from the outer array into the inner one", () => {
    const p = plan({
      fields: [{ path: "rows[].rate", recipe: { kind: "copy", of: "rows[].cells[].n" } }],
    });

    const check = validatePlan(p, BASE, ["rows[].rate"]);
    expect(check.ok).toBe(false);
    expect(check.errors[0]).toContain("is not part of");
  });

  it("totals a nested array with sum, flattening every level", () => {
    const withTotal = { ...BASE, total: 0 };
    const p = plan({
      fields: [{ path: "total", recipe: { kind: "sum", of: "rows[].cells[].n" } }],
    });

    // 1 + 2 + 3, read across both inner arrays rather than only the first.
    expect(render(p, withTotal, 1)[0]!.total).toBe(6);
  });
});

describe("a field the body leaves null", () => {
  const NULLABLE = { shipped_at: null as string | null, avatar: null as string | null };

  it("takes the type its recipe produces", () => {
    const p = plan({
      fields: [{ path: "avatar", recipe: { kind: "semantic", name: "url" } }],
    });

    for (const out of render(p, NULLABLE, 5)) expect(typeof out.avatar).toBe("string");
  });

  it("stays null some of the time through a branch", () => {
    const base = { shipped: true, shipped_at: null as string | null };
    const p = plan({
      fields: [
        { path: "shipped", recipe: { kind: "bool", probability: 0.5 } },
        {
          path: "shipped_at",
          recipe: {
            kind: "branch",
            on: "shipped",
            cases: { true: { kind: "date", format: "date" } },
            default: { kind: "const", value: null },
          },
        },
      ],
    });

    const seen = new Set(render(p, base, 60).map((out) => out.shipped_at === null));
    expect(seen).toEqual(new Set([true, false]));
  });

  // Widening applies to null only. Every other type still has to be matched exactly.
  it("does not widen a field that already holds a type", () => {
    const p = plan({
      fields: [{ path: "count", recipe: { kind: "semantic", name: "url" } }],
    });

    const check = validatePlan(p, { count: 1 }, ["count"]);
    expect(check.ok).toBe(false);
    expect(check.errors[0]).toContain("where the body holds number");
  });
});

describe("array_length on a nested container", () => {
  it("resizes every inner array, cloning that array's own first element", () => {
    const p = plan({
      fields: [
        { path: "rows[].cells", recipe: { kind: "array_length", min: 3, max: 3 } },
        { path: "rows[].cells[].n", recipe: { kind: "int", min: 1, max: 9 } },
      ],
    });

    for (const out of render(p, BASE, 20)) {
      expect(out.rows.map((row) => row.cells.length)).toEqual([3, 3]);
      // The clones carry the template's other keys, and row two's template is its own.
      expect(out.rows[1]!.cells.map((cell) => cell.note)).toEqual(["z", "z", "z"]);
      for (const cell of allCells(out)) expect(Number.isInteger(cell.n)).toBe(true);
    }
  });

  it("resizes the outer array and every inner one together", () => {
    const p = plan({
      fields: [
        { path: "rows", recipe: { kind: "array_length", min: 4, max: 4 } },
        { path: "rows[].cells", recipe: { kind: "array_length", min: 2, max: 2 } },
      ],
    });

    for (const out of render(p, BASE, 10)) {
      expect(rowsOf(out)).toHaveLength(4);
      expect(out.rows.every((row) => row.cells.length === 2)).toBe(true);
    }
  });
});
