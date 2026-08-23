import {
  buildFieldTree,
  collectSelectablePaths,
  getAtPath,
  isArrayPath,
  parsePath,
  setAtPath,
} from "@/app/libs/helpers/json_path";

const sample = () => ({
  id: 1,
  user: { name: "An", email: "an@x.com", verified: true, deletedAt: null },
  tags: ["hot", "new"],
  items: [
    { sku: "A1", price: 10 },
    { sku: "B2", price: 20 },
    { sku: "C3", price: 30 },
  ],
});

describe("parsePath", () => {
  it("splits a plain path into its keys", () => {
    expect(parsePath("user.name")).toEqual({ head: ["user", "name"] });
  });

  it("splits an array path into head and tail", () => {
    expect(parsePath("items[].price")).toEqual({ head: ["items"], tail: ["price"] });
  });

  it("gives a scalar array path an empty tail", () => {
    expect(parsePath("tags[]")).toEqual({ head: ["tags"], tail: [] });
  });

  it("isArrayPath tells the two kinds apart", () => {
    expect(isArrayPath("items[].price")).toBe(true);
    expect(isArrayPath("user.name")).toBe(false);
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
});

describe("buildFieldTree", () => {
  it("expands a nested object into a parent node with children", () => {
    const tree = buildFieldTree(sample());
    const user = tree.find((node) => node.path === "user");

    expect(user?.kind).toBe("object");
    expect(user?.selectable).toBe(false);
    expect(user?.children?.map((child) => child.path)).toEqual([
      "user.name",
      "user.email",
      "user.verified",
      "user.deletedAt",
    ]);
  });

  it("gives each leaf its type and sample value", () => {
    const tree = buildFieldTree(sample());
    const id = tree.find((node) => node.path === "id");

    expect(id).toMatchObject({ kind: "leaf", type: "number", sample: 1, selectable: true });
  });

  it("turns a scalar array into a single tags[] leaf", () => {
    const tree = buildFieldTree(sample());
    const tags = tree.find((node) => node.path === "tags[]");

    expect(tags).toMatchObject({ kind: "leaf", type: "string", arrayLength: 2, selectable: true });
  });

  it("expands an object array into its inner fields with the [] prefix", () => {
    const tree = buildFieldTree(sample());
    const items = tree.find((node) => node.path === "items");

    expect(items?.kind).toBe("array");
    expect(items?.arrayLength).toBe(3);
    expect(items?.children?.map((child) => child.path)).toEqual([
      "items[].sku",
      "items[].price",
    ]);
  });

  it("marks arrays inside arrays as not selectable", () => {
    const tree = buildFieldTree({ rows: [{ cells: [1, 2] }] });
    const cells = tree
      .find((node) => node.path === "rows")
      ?.children?.find((child) => child.label === "cells");

    expect(cells).toMatchObject({
      selectable: false,
      disabledReason: "Arrays inside arrays are not supported yet",
    });
  });

  it("makes keys with special characters unselectable, since no path can express them", () => {
    const tree = buildFieldTree({ "a.b": 1, "c[0]": 2, ok: 3 });

    expect(tree.find((node) => node.label === "a.b")?.selectable).toBe(false);
    expect(tree.find((node) => node.label === "c[0]")?.selectable).toBe(false);
    expect(tree.find((node) => node.label === "ok")?.selectable).toBe(true);
  });

  it("collectSelectablePaths gathers exactly the selectable leaves", () => {
    expect(collectSelectablePaths(buildFieldTree(sample()))).toEqual([
      "id",
      "user.name",
      "user.email",
      "user.verified",
      "user.deletedAt",
      "tags[]",
      "items[].sku",
      "items[].price",
    ]);
  });

  it("every collected path reads back through getAtPath", () => {
    const value = sample();
    const paths = collectSelectablePaths(buildFieldTree(value));

    for (const path of paths) {
      expect(getAtPath(value, path)).toBeDefined();
    }
  });
});

describe("buildFieldTree array element types", () => {
  const leafFor = (value: unknown, label: string) => {
    const arrayNode = buildFieldTree(value).find((node) => node.label === "items");
    return arrayNode?.children?.find((child) => child.label === label);
  };

  it("offers a field the whole array carries with one type", () => {
    const leaf = leafFor({ items: [{ price: 1 }, { price: 2 }] }, "price");

    expect(leaf?.selectable).toBe(true);
    expect(leaf?.type).toBe("number");
  });

  it("refuses a field whose type changes between elements", () => {
    const leaf = leafFor({ items: [{ price: 1 }, { price: "2" }] }, "price");

    expect(leaf?.selectable).toBe(false);
    expect(leaf?.disabledReason).toBeDefined();
  });

  it("refuses a field a later element does not carry at all", () => {
    const leaf = leafFor({ items: [{ price: 1 }, { sku: "B2" }] }, "price");

    expect(leaf?.selectable).toBe(false);
  });

  it("refuses a field under an element that is not an object at all", () => {
    const leaf = leafFor({ items: [{ price: 1 }, "surprise"] }, "price");

    expect(leaf?.selectable).toBe(false);
  });

  it("treats null as its own element type", () => {
    expect(leafFor({ items: [{ price: null }, { price: 2 }] }, "price")?.selectable).toBe(false);
    expect(leafFor({ items: [{ price: null }, { price: null }] }, "price")?.selectable).toBe(true);
  });

  it("refuses a scalar array whose elements disagree on type", () => {
    const tree = buildFieldTree({ tags: ["hot", 2] });
    const node = tree.find((child) => child.label === "tags");

    expect(node?.selectable).toBe(false);
    expect(node?.disabledReason).toBeDefined();
    expect(collectSelectablePaths(tree)).toEqual([]);
  });

  it("explains an empty array rather than leaving it blank", () => {
    const node = buildFieldTree({ items: [] }).find((child) => child.label === "items");

    expect(node?.selectable).toBe(false);
    expect(node?.disabledReason).toBeDefined();
  });

  it("checks a field nested under an array element against every element", () => {
    const uniform = buildFieldTree({ items: [{ meta: { color: "red" } }, { meta: { color: "b" } }] });
    expect(collectSelectablePaths(uniform)).toEqual(["items[].meta.color"]);

    const ragged = buildFieldTree({ items: [{ meta: { color: "red" } }, { meta: { color: 2 } }] });
    expect(collectSelectablePaths(ragged)).toEqual([]);
  });

  it("ignores elements past the cap the generator applies", () => {
    const items = [
      ...Array.from({ length: 3 }, () => ({ price: 1 })),
      { price: "not a number" },
    ];

    expect(collectSelectablePaths(buildFieldTree({ items }, 3))).toEqual(["items[].price"]);
    expect(collectSelectablePaths(buildFieldTree({ items }, 4))).toEqual([]);
    expect(collectSelectablePaths(buildFieldTree({ items }))).toEqual([]);
  });
});
