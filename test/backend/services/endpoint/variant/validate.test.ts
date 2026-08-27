import {
  VariantPlanDTO,
} from "@/models/endpoint_plan/endpoint_plan.model";
import { validatePlan } from "@/server/services/endpoint/variant/validate";
import { plan } from "./faker_harness";

describe("validatePlan refuses a plan rather than letting it run", () => {
  const BASE = { name: "a", age: 1, items: [{ price: 1 }], empty: [] as unknown[] };
  const ALLOWED = ["name", "age", "items", "items[].price", "empty"];

  function reject(fields: VariantPlanDTO["fields"], extra: Partial<VariantPlanDTO> = {}) {
    const candidate = plan({ fields, ...extra });
    return validatePlan(candidate, BASE, ALLOWED).errors;
  }

  // Two declarations sharing an id used to slip through: validation read the last one and the
  // executor drew from the first, so a plan could pass a type check against a kind it never ran.
  it("blocks two entities that share an id", () => {
    const errors = reject([{ path: "name", recipe: { kind: "entity", entity: "a", attr: "name" } }], {
      entities: [
        { id: "a", kind: "company" },
        { id: "a", kind: "person" },
      ],
    });
    expect(errors.join(" ")).toContain("share the same id");
  });

  it("blocks two catalogs that share an id", () => {
    const errors = reject([{ path: "name", recipe: { kind: "catalog", catalog: "c", column: "n" } }], {
      catalogs: [
        { id: "c", columns: ["n"], rows: [["x"]] },
        { id: "c", columns: ["n"], rows: [["y"]] },
      ],
    });
    expect(errors.join(" ")).toContain("share the same id");
  });

  it("blocks a path the user never selected", () => {
    const errors = validatePlan(
      plan({ fields: [{ path: "secret", recipe: { kind: "semantic", name: "uuid" } }] }),
      BASE,
      ALLOWED
    ).errors;
    expect(errors.join(" ")).toContain("was not selected");
  });

  it("blocks a recipe whose type disagrees with the body", () => {
    expect(reject([{ path: "age", recipe: { kind: "semantic", name: "uuid" } }]).join(" ")).toContain(
      "produces string where the body holds number"
    );
  });

  it("blocks a null from anything other than a branch", () => {
    expect(reject([{ path: "name", recipe: { kind: "const", value: null } }]).join(" ")).toContain(
      "produces null where the body holds string"
    );
  });

  it("blocks an undeclared entity and an unknown attribute", () => {
    expect(reject([{ path: "name", recipe: { kind: "entity", entity: "ghost", attr: "full_name" } }]).join(" ")).toContain(
      "not declared"
    );
    expect(
      reject([{ path: "name", recipe: { kind: "entity", entity: "p", attr: "nickname" } }], {
        entities: [{ id: "p", kind: "person" }],
      }).join(" ")
    ).toContain("no attribute");
  });

  it("blocks a catalog with a ragged row or a non numeric range column", () => {
    expect(
      reject([{ path: "name", recipe: { kind: "catalog", catalog: "c", column: "a" } }], {
        catalogs: [{ id: "c", columns: ["a", "b"], rows: [["x"]] }],
      }).join(" ")
    ).toContain("one value per column");

    expect(
      reject(
        [
          {
            path: "age",
            recipe: { kind: "catalog_range", catalog: "c", min_column: "a", max_column: "b" },
          },
        ],
        { catalogs: [{ id: "c", columns: ["a", "b"], rows: [["x", 2]] }] }
      ).join(" ")
    ).toContain("must be a number in every row");
  });

  it("blocks an entity used both inside and outside an array", () => {
    expect(
      reject(
        [
          { path: "name", recipe: { kind: "entity", entity: "p", attr: "full_name" } },
          { path: "items[].price", recipe: { kind: "entity", entity: "p", attr: "age" } },
        ],
        { entities: [{ id: "p", kind: "person" }] }
      ).join(" ")
    ).toContain("both inside and outside an array");
  });

  // A reference resolves to one element at the index being drawn, and a field outside the array
  // has no index, so this used to pass every check and then leave the field at its base value on
  // every call with nothing logged anywhere.
  it("blocks a reference reaching into an array from outside it", () => {
    expect(
      reject([{ path: "age", recipe: { kind: "copy", of: "items[].price" } }]).join(" ")
    ).toContain('is inside an array "age" is not part of');

    expect(
      reject([
        {
          path: "age",
          recipe: {
            kind: "branch",
            on: "items[].price",
            cases: { "1": { kind: "int", min: 1, max: 2 } },
            default: { kind: "int", min: 3, max: 4 },
          },
        },
      ]).join(" ")
    ).toContain("is not part of");
  });

  it("allows sum, and allows an array field reading one outside", () => {
    // `sum` reads the whole array through `getAtPath`, not one element, so it is the one
    // dependency that legitimately crosses a scope.
    expect(reject([{ path: "age", recipe: { kind: "sum", of: "items[].price" } }])).toEqual([]);

    expect(reject([{ path: "items[].price", recipe: { kind: "copy", of: "age" } }])).toEqual([]);
  });

  it("blocks a date offset that never says how to write itself back", () => {
    // A number could be epoch seconds or epoch milliseconds, so guessing moves every date by a
    // factor of a thousand. The blueprint has to say which.
    expect(
      reject([{ path: "age", recipe: { kind: "after", of: "age", min_delta: 1, max_delta: 2 } }]).join(" ")
    ).toContain("needs a date format");

    expect(
      reject([
        {
          path: "name",
          recipe: { kind: "after", of: "age", min_delta: 1, max_delta: 2, unit: "number" },
        },
      ]).join(" ")
    ).toContain("offsets a plain number but the body holds string");
  });

  it("blocks a dependency loop", () => {
    expect(
      reject([
        { path: "name", recipe: { kind: "copy", of: "age" } },
        { path: "age", recipe: { kind: "copy", of: "name" } },
      ]).join(" ")
    ).toContain("loop");
  });

  it("blocks a template placeholder that resolves to nothing", () => {
    expect(
      reject([
        {
          path: "name",
          recipe: { kind: "template", pattern: "hi {{slot:missing}}", slots: { other: ["a"] } },
        },
      ]).join(" ")
    ).toContain("never declares");
  });

  it("blocks array_length on an empty array and on a non array", () => {
    expect(reject([{ path: "empty", recipe: { kind: "array_length", min: 1, max: 3 } }]).join(" ")).toContain(
      "no element to build more from"
    );
    expect(reject([{ path: "name", recipe: { kind: "array_length", min: 1, max: 3 } }]).join(" ")).toContain(
      "not an array"
    );
  });

  it("blocks a duplicated field path", () => {
    expect(
      reject([
        { path: "name", recipe: { kind: "semantic", name: "full_name" } },
        { path: "name", recipe: { kind: "semantic", name: "city" } },
      ]).join(" ")
    ).toContain("more than once");
  });

  it("accepts the shapes it should", () => {
    expect(
      reject([
        { path: "name", recipe: { kind: "semantic", name: "full_name" } },
        { path: "age", recipe: { kind: "int", min: 18, max: 70 } },
        { path: "items[].price", recipe: { kind: "float", min: 1, max: 9 } },
      ])
    ).toEqual([]);
  });
});

describe("validatePlan on aggregate", () => {
  const BASE = {
    total: 0,
    tags: ["a", "b"],
    items: [{ price: 1 }],
    empty: [] as unknown[],
    name: "a",
  };
  const ALLOWED = ["total", "tags", "tags[]", "items", "items[].price", "empty", "name"];

  function errorsFor(fields: VariantPlanDTO["fields"]) {
    return validatePlan(plan({ fields }), BASE, ALLOWED).errors;
  }

  // The point of `wholeArrayReads`: without it a field outside the array is a scope violation.
  it("lets a field outside an array read the whole array", () => {
    expect(
      errorsFor([
        { path: "total", recipe: { kind: "aggregate", op: "avg", of: "items[].price" } },
      ])
    ).toEqual([]);
  });

  it("blocks avg over a path that holds no numbers", () => {
    expect(
      errorsFor([{ path: "total", recipe: { kind: "aggregate", op: "avg", of: "tags[]" } }]).join(" ")
    ).toContain("does not hold numbers");
  });

  it("blocks avg over a path that crosses no array", () => {
    expect(
      errorsFor([{ path: "total", recipe: { kind: "aggregate", op: "min", of: "name" } }]).join(" ")
    ).toContain("single value rather than an array");
  });

  it("blocks count over something that is not an array", () => {
    expect(
      errorsFor([{ path: "total", recipe: { kind: "aggregate", op: "count", of: "name" } }]).join(" ")
    ).toContain("not an array");
  });

  // Unlike array_length, which needs an element to clone: counting an empty array answers zero.
  it("accepts count over an empty array", () => {
    expect(
      errorsFor([{ path: "total", recipe: { kind: "aggregate", op: "count", of: "empty" } }])
    ).toEqual([]);
  });

  it("blocks an aggregate written into a field the body holds as a string", () => {
    expect(
      errorsFor([{ path: "name", recipe: { kind: "aggregate", op: "count", of: "items" } }]).join(" ")
    ).toContain("produces number where the body holds string");
  });
});
