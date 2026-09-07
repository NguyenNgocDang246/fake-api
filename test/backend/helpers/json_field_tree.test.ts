import { getAtPath } from "@/app/libs/helpers/json_path";
import { buildFieldTree, collectSelectablePaths } from "@/app/libs/helpers/json_field_tree";
import { sample } from "./json_sample";

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

  it("puts a scalar array under a selectable container holding one tags[] leaf", () => {
    const tree = buildFieldTree(sample());
    const tags = tree.find((node) => node.path === "tags");

    // The container carries the length, the child carries the values, and both can be ticked.
    expect(tags).toMatchObject({ kind: "array", arrayLength: 2, selectable: true });
    expect(tags?.children).toHaveLength(1);
    expect(tags?.children?.[0]).toMatchObject({
      path: "tags[]",
      kind: "leaf",
      type: "string",
      selectable: true,
    });
  });

  it("offers the container of an object array as a selectable path too", () => {
    const items = buildFieldTree(sample()).find((node) => node.path === "items");
    expect(items).toMatchObject({ kind: "array", selectable: true });
  });

  it("keeps an empty or ragged array container unselectable", () => {
    const tree = buildFieldTree({ empty: [], ragged: [1, "a"] });

    expect(tree.find((node) => node.path === "empty")).toMatchObject({ selectable: false });
    expect(tree.find((node) => node.path === "ragged")).toMatchObject({ selectable: false });
  });

  it("expands an object array into its inner fields with the [] prefix", () => {
    const tree = buildFieldTree(sample());
    const items = tree.find((node) => node.path === "items");

    expect(items?.kind).toBe("array");
    expect(items?.arrayLength).toBe(3);
    expect(items?.children?.map((child) => child.path)).toEqual(["items[].sku", "items[].price"]);
  });

  it("expands an array inside an array element", () => {
    const tree = buildFieldTree({ rows: [{ cells: [1, 2] }] });

    // `rows` is the outer length, `rows[].cells` the inner one, `rows[].cells[]` the values.
    expect(collectSelectablePaths(tree)).toEqual(["rows", "rows[].cells", "rows[].cells[]"]);
  });

  it("expands an array of arrays", () => {
    const tree = buildFieldTree({
      grid: [
        [1, 2],
        [3, 4],
      ],
    });

    expect(collectSelectablePaths(tree)).toEqual(["grid", "grid[]", "grid[][]"]);
  });

  it("expands objects two arrays deep", () => {
    const tree = buildFieldTree({
      rows: [{ cells: [{ n: 1 }, { n: 2 }] }, { cells: [{ n: 3 }] }],
    });

    expect(collectSelectablePaths(tree)).toEqual([
      "rows",
      "rows[].cells",
      "rows[].cells[].n",
    ]);
  });

  it("judges a leaf two arrays deep against every element of every inner array", () => {
    const ragged = buildFieldTree({
      rows: [{ cells: [{ n: 1 }] }, { cells: [{ n: "2" }] }],
    });

    expect(collectSelectablePaths(ragged)).toEqual(["rows", "rows[].cells"]);
  });

  it("blocks a nested container an element does not carry as an array", () => {
    const tree = buildFieldTree({ rows: [{ cells: [1] }, { cells: 2 }] });
    const cells = tree
      .find((node) => node.path === "rows")
      ?.children?.find((child) => child.label === "cells");

    expect(cells?.selectable).toBe(false);
    expect(collectSelectablePaths(tree)).toEqual(["rows"]);
  });

  it("stops expanding past the nesting cap", () => {
    const deep = buildFieldTree({ a: [[[[1]]]] });

    expect(collectSelectablePaths(deep)).toEqual(["a", "a[]", "a[][]"]);
    expect(JSON.stringify(deep)).toContain("Arrays nested more than 3 deep");
  });

  // Escaping is what makes every JSON key expressible, so nothing is off limits any more.
  it("escapes keys holding a separator rather than refusing them", () => {
    const tree = buildFieldTree({ "a.b": 1, "c[0]": 2, ok: 3 });

    expect(collectSelectablePaths(tree)).toEqual(["a\\.b", "c\\[0\\]", "ok"]);
    expect(getAtPath({ "a.b": 1 }, "a\\.b")).toBe(1);
    expect(getAtPath({ "c[0]": 2 }, "c\\[0\\]")).toBe(2);
  });

  it("reaches everything under a key holding a separator", () => {
    expect(collectSelectablePaths(buildFieldTree({ "a.b": { c: 1 } }))).toEqual(["a\\.b.c"]);
    expect(collectSelectablePaths(buildFieldTree({ "a.b": [{ c: 1 }] }))).toEqual([
      "a\\.b",
      "a\\.b[].c",
    ]);
    expect(getAtPath({ "a.b": { c: 1 } }, "a\\.b.c")).toBe(1);
  });

  it("handles an empty key, which is a key like any other", () => {
    expect(collectSelectablePaths(buildFieldTree({ a: { "": 1 } }))).toEqual(["a."]);
    expect(getAtPath({ a: { "": 1 } }, "a.")).toBe(1);
    expect(getAtPath({ a: { "": 1 } }, "a")).toEqual({ "": 1 });
  });

  // A null carries no type to preserve, so it is the one field whose recipe picks the type
  // rather than matching it. The tree offers it; `validateValueRecipe` allows the widening.
  it("offers a null leaf", () => {
    expect(collectSelectablePaths(buildFieldTree({ a: null }))).toEqual(["a"]);
    expect(collectSelectablePaths(buildFieldTree({ a: [null, null] }))).toEqual(["a", "a[]"]);
  });

  // Element zero used to decide the whole key list, so a key only later elements carry was not
  // shown at all, which reads as the field having no AI support rather than a ragged array.
  it("shows a key only some elements carry, greyed with a reason", () => {
    const tree = buildFieldTree({ items: [{ a: 1 }, { a: 2, b: "x" }] });
    const children = tree.find((node) => node.path === "items")?.children ?? [];

    expect(children.map((child) => child.label)).toEqual(["a", "b"]);
    expect(children.find((child) => child.label === "b")).toMatchObject({
      selectable: false,
      disabledReason: expect.stringContaining("same type"),
    });
    expect(collectSelectablePaths(tree)).toEqual(["items", "items[].a"]);
  });

  // JSON.parse gives `__proto__` an own data property, so it shadows the prototype accessor and
  // both reads and writes land on the body rather than on Object.prototype.
  it("reads a __proto__ key as an ordinary field", () => {
    const body = JSON.parse('{"__proto__":{"x":1}}') as Record<string, unknown>;

    expect(collectSelectablePaths(buildFieldTree(body))).toEqual(["__proto__.x"]);
    expect(getAtPath(body, "__proto__.x")).toBe(1);
    expect(Object.getPrototypeOf(body)).toBe(Object.prototype);
  });

  it("collectSelectablePaths gathers the selectable leaves and array containers", () => {
    expect(collectSelectablePaths(buildFieldTree(sample()))).toEqual([
      "id",
      "user.name",
      "user.email",
      "user.verified",
      "user.deletedAt",
      "tags",
      "tags[]",
      "items",
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

  // Null counts as its own type: an array agreeing on null is offered, a mix is not, because a
  // mix names no single type for a recipe to widen from.
  it("treats null as its own element type", () => {
    const ragged = leafFor({ items: [{ price: null }, { price: 2 }] }, "price");
    expect(ragged?.selectable).toBe(false);
    expect(ragged?.disabledReason).toContain("same type");

    const allNull = leafFor({ items: [{ price: null }, { price: null }] }, "price");
    expect(allNull).toMatchObject({ selectable: true, type: "null" });
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
    const uniform = buildFieldTree({
      items: [{ meta: { color: "red" } }, { meta: { color: "b" } }],
    });
    expect(collectSelectablePaths(uniform)).toEqual(["items", "items[].meta.color"]);

    // A ragged leaf disqualifies that leaf, not the array: how many elements there are is still
    // a perfectly good thing to vary.
    const ragged = buildFieldTree({ items: [{ meta: { color: "red" } }, { meta: { color: 2 } }] });
    expect(collectSelectablePaths(ragged)).toEqual(["items"]);
  });

  it("ignores elements past the cap the generator applies", () => {
    const items = [...Array.from({ length: 3 }, () => ({ price: 1 })), { price: "not a number" }];

    expect(collectSelectablePaths(buildFieldTree({ items }, 3))).toEqual([
      "items",
      "items[].price",
    ]);
    expect(collectSelectablePaths(buildFieldTree({ items }, 4))).toEqual(["items"]);
    expect(collectSelectablePaths(buildFieldTree({ items }))).toEqual(["items"]);
  });
});
