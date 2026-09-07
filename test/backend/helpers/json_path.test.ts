import {
  arrayDepthOf,
  escapeKey,
  flattenPathValues,
  formatPath,
  getAtPath,
  isArrayPath,
  isOuterScope,
  parsePath,
  scopePathOf,
  setAtPath,
} from "@/app/libs/helpers/json_path";
import { sample } from "./json_sample";

const key = (name: string) => ({ kind: "key", key: name });
const array = { kind: "array" };

describe("parsePath", () => {
  it("splits a plain path into key steps", () => {
    expect(parsePath("user.name")).toEqual([key("user"), key("name")]);
  });

  it("marks each array it crosses", () => {
    expect(parsePath("items[].price")).toEqual([key("items"), array, key("price")]);
    expect(parsePath("tags[]")).toEqual([key("tags"), array]);
    expect(parsePath("rows[].cells[]")).toEqual([key("rows"), array, key("cells"), array]);
    expect(parsePath("grid[][]")).toEqual([key("grid"), array, array]);
  });

  it("reads an escaped separator as part of the key", () => {
    expect(parsePath("a\\.b.c")).toEqual([key("a.b"), key("c")]);
    expect(parsePath("x\\[\\].y")).toEqual([key("x[]"), key("y")]);
    expect(parsePath("back\\\\slash")).toEqual([key("back\\slash")]);
  });

  it("keeps an empty key, which is a key like any other", () => {
    expect(parsePath("")).toEqual([key("")]);
    expect(parsePath("a.")).toEqual([key("a"), key("")]);
  });

  it("round trips through formatPath", () => {
    for (const path of ["user.name", "items[].price", "rows[].cells[]", "a\\.b.c", "a.", ""]) {
      expect(formatPath(parsePath(path))).toBe(path);
    }
  });

  it("escapeKey covers every character the syntax reserves", () => {
    expect(escapeKey("a.b[]c\\d")).toBe("a\\.b\\[\\]c\\\\d");
    expect(parsePath(escapeKey("a.b[]c\\d"))).toEqual([key("a.b[]c\\d")]);
  });

  it("isArrayPath and arrayDepthOf count only unescaped markers", () => {
    expect(isArrayPath("items[].price")).toBe(true);
    expect(isArrayPath("user.name")).toBe(false);
    expect(isArrayPath("x\\[\\].y")).toBe(false);

    expect(arrayDepthOf("user.name")).toBe(0);
    expect(arrayDepthOf("items[].price")).toBe(1);
    expect(arrayDepthOf("rows[].cells[].value")).toBe(2);
    expect(arrayDepthOf("grid[][]")).toBe(2);
  });
});

describe("scopes", () => {
  it("names the innermost array a path sits in", () => {
    expect(scopePathOf("user.name")).toBe("");
    expect(scopePathOf("items[].price")).toBe("items[]");
    expect(scopePathOf("rows[].cells[].value")).toBe("rows[].cells[]");
    expect(scopePathOf("rows[].label")).toBe("rows[]");
  });

  it("treats a wrapping array as readable from inside", () => {
    expect(isOuterScope("", "rows[].cells[]")).toBe(true);
    expect(isOuterScope("rows[]", "rows[].cells[]")).toBe(true);
    expect(isOuterScope("rows[].cells[]", "rows[].cells[]")).toBe(true);

    // The other direction, and a different array entirely, are both unreadable.
    expect(isOuterScope("rows[].cells[]", "rows[]")).toBe(false);
    expect(isOuterScope("others[]", "rows[]")).toBe(false);
  });
});

describe("getAtPath", () => {
  it("reads a nested value", () => {
    expect(getAtPath(sample(), "user.name")).toBe("An");
    expect(getAtPath(sample(), "user.deletedAt")).toBeNull();
    expect(getAtPath(sample(), "id")).toBe(1);
  });

  it("returns undefined for a path that does not exist", () => {
    expect(getAtPath(sample(), "user.phone")).toBeUndefined();
    expect(getAtPath(sample(), "nothing.here.at.all")).toBeUndefined();
  });

  it("returns one value per element for an array path", () => {
    expect(getAtPath(sample(), "items[].price")).toEqual([10, 20, 30]);
    expect(getAtPath(sample(), "tags[]")).toEqual(["hot", "new"]);
  });

  it("limit caps how many elements are read", () => {
    expect(getAtPath(sample(), "items[].price", 2)).toEqual([10, 20]);
  });

  it("returns undefined when the head is not an array", () => {
    expect(getAtPath(sample(), "user[].name")).toBeUndefined();
  });
});

describe("setAtPath", () => {
  it("writes a nested value", () => {
    const target = sample();
    expect(setAtPath(target, "user.name", "Binh")).toBe(true);
    expect(target.user.name).toBe("Binh");
    expect(target.user.email).toBe("an@x.com");
  });

  it("refuses a missing path and changes nothing", () => {
    const target = sample();
    expect(setAtPath(target, "user.phone", "0900")).toBe(false);
    expect(target).toEqual(sample());
  });

  it("writes element-wise on an array path", () => {
    const target = sample();
    expect(setAtPath(target, "items[].price", [11, 22, 33])).toBe(true);
    expect(target.items.map((item) => item.price)).toEqual([11, 22, 33]);
    expect(target.items.map((item) => item.sku)).toEqual(["A1", "B2", "C3"]);
  });

  it("leaves the tail untouched for a shorter value array, which is the upper bound", () => {
    const target = sample();
    expect(setAtPath(target, "items[].price", [11, 22])).toBe(true);
    expect(target.items.map((item) => item.price)).toEqual([11, 22, 30]);
  });

  it("refuses a value array longer than the target", () => {
    const target = sample();
    expect(setAtPath(target, "items[].price", [1, 2, 3, 4])).toBe(false);
    expect(target.items.map((item) => item.price)).toEqual([10, 20, 30]);
  });

  it("refuses a non-array value on an array path", () => {
    const target = sample();
    expect(setAtPath(target, "items[].price", 99)).toBe(false);
  });

  // `"__proto__" in target` is true for every object, so a plain `in` check would let a write
  // reach the prototype instead of the body.
  it("refuses to write through an inherited key", () => {
    const target: Record<string, unknown> = { a: 1 };

    expect(setAtPath(target, "__proto__", { polluted: true })).toBe(false);
    expect(setAtPath(target, "constructor", 1)).toBe(false);
    expect(Object.getPrototypeOf(target)).toBe(Object.prototype);
    expect(({} as Record<string, unknown>)["polluted"]).toBeUndefined();
  });

  it("writes an own __proto__ key, which JSON.parse really does create", () => {
    const target = JSON.parse('{"__proto__":{"x":1}}') as Record<string, unknown>;

    expect(setAtPath(target, "__proto__.x", 2)).toBe(true);
    expect(getAtPath(target, "__proto__.x")).toBe(2);
    expect(Object.getPrototypeOf(target)).toBe(Object.prototype);
  });
});

describe("nested arrays", () => {
  const grid = () => ({
    rows: [
      { label: "a", cells: [{ n: 1 }, { n: 2 }] },
      { label: "b", cells: [{ n: 3 }] },
    ],
    grid: [
      [1, 2],
      [3, 4, 5],
    ],
  });

  it("reads one value per element of every inner array", () => {
    expect(getAtPath(grid(), "rows[].cells[].n")).toEqual([[1, 2], [3]]);
    expect(getAtPath(grid(), "grid[][]")).toEqual([
      [1, 2],
      [3, 4, 5],
    ]);
  });

  it("reads the inner arrays themselves when the path stops one level short", () => {
    expect(getAtPath(grid(), "rows[].cells")).toEqual([[{ n: 1 }, { n: 2 }], [{ n: 3 }]]);
  });

  it("flattens across levels, and reports a level that is not an array", () => {
    expect(flattenPathValues(grid(), "rows[].cells[].n")).toEqual([1, 2, 3]);
    expect(flattenPathValues(grid(), "grid[][]")).toEqual([1, 2, 3, 4, 5]);
    expect(flattenPathValues(grid(), "rows[].label")).toEqual(["a", "b"]);
    expect(flattenPathValues(grid(), "rows[].label[]")).toBeNull();
  });

  it("caps every level, not only the outermost", () => {
    expect(getAtPath(grid(), "grid[][]", 1)).toEqual([[1]]);
  });

  it("writes back element-wise at every level", () => {
    const target = grid();

    expect(setAtPath(target, "rows[].cells[].n", [[10, 20], [30]])).toBe(true);
    expect(target.rows.map((row) => row.cells.map((cell) => cell.n))).toEqual([[10, 20], [30]]);
    expect(target.rows.map((row) => row.label)).toEqual(["a", "b"]);
  });

  it("round trips: reading then writing back changes nothing", () => {
    const target = grid();

    for (const path of ["rows[].cells[].n", "grid[][]", "rows[].label"]) {
      expect(setAtPath(target, path, getAtPath(target, path))).toBe(true);
    }
    expect(target).toEqual(grid());
  });

  it("refuses a value whose nesting does not match the path", () => {
    const target = grid();

    expect(setAtPath(target, "rows[].cells[].n", [10, 20])).toBe(false);
    expect(setAtPath(target, "rows[].cells[].n", [[10, 20, 30], [30]])).toBe(false);
  });
});
