import {
  MAX_ARRAY_ITEMS,
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

describe("validatePlan on an array_length that follows a field", () => {
  const BASE = { limit: 5, label: "a", items: [{ price: 1 }] };
  const ALLOWED = ["limit", "label", "items", "items[].price"];

  function errorsFor(fields: VariantPlanDTO["fields"], base: unknown = BASE) {
    return validatePlan(plan({ fields }), base, ALLOWED).errors;
  }

  it("accepts a length that follows a number the body already holds", () => {
    expect(errorsFor([{ path: "items", recipe: { kind: "array_length", of: "limit" } }])).toEqual([]);
  });

  it("accepts a length that follows a pick the plan draws", () => {
    expect(
      errorsFor([
        { path: "items", recipe: { kind: "array_length", of: "limit" } },
        { path: "limit", recipe: { kind: "pick", values: [2, 5, 10] } },
      ])
    ).toEqual([]);
  });

  it("blocks a length that follows something the body does not hold as a number", () => {
    expect(
      errorsFor([{ path: "items", recipe: { kind: "array_length", of: "label" } }]).join(" ")
    ).toContain("not a single number");
  });

  // The executor draws a driver before it resizes, so a driver that reads anything would be drawn
  // out of order. Refusing the recipe kind is what keeps that one pass enough.
  it("blocks a length that follows a field drawn from other fields", () => {
    const errors = errorsFor([
      { path: "items", recipe: { kind: "array_length", of: "limit" } },
      { path: "limit", recipe: { kind: "aggregate", op: "count", of: "items" } },
    ]).join(" ");
    expect(errors).toContain(`needs a "const", "int" or "pick" recipe`);
    expect(errors).toContain("in a loop");
  });

  it("blocks a length that follows a number above the item ceiling", () => {
    expect(
      errorsFor([{ path: "items", recipe: { kind: "array_length", of: "limit" } }], {
        ...BASE,
        limit: MAX_ARRAY_ITEMS + 1,
      }).join(" ")
    ).toContain(`above the ${MAX_ARRAY_ITEMS} item limit`);
  });

  it("blocks a driver that can reach above the item ceiling", () => {
    expect(
      errorsFor([
        { path: "items", recipe: { kind: "array_length", of: "limit" } },
        { path: "limit", recipe: { kind: "int", min: 1, max: MAX_ARRAY_ITEMS } },
      ])
    ).toEqual([]);
    expect(
      errorsFor([
        { path: "items", recipe: { kind: "array_length", of: "limit" } },
        { path: "limit", recipe: { kind: "pick", values: [10, MAX_ARRAY_ITEMS + 1] } },
      ]).join(" ")
    ).toContain(`can reach ${MAX_ARRAY_ITEMS + 1}`);
  });

  it("blocks a band missing one of its two ends", () => {
    expect(
      errorsFor([{ path: "items", recipe: { kind: "array_length", min: 1 } }]).join(" ")
    ).toContain("needs both a minimum and a maximum");
  });
});

describe("validatePlan on an ordered array", () => {
  const BASE = {
    limit: 3,
    tags: ["b", "a"],
    items: [{ price: 1, meta: { at: "2024-01-01" } }],
    others: [{ price: 2 }],
  };
  const ALLOWED = ["limit", "tags", "tags[]", "items", "items[].price", "items[].meta.at", "others"];

  function errorsFor(fields: VariantPlanDTO["fields"]) {
    return validatePlan(plan({ fields }), BASE, ALLOWED).errors;
  }

  it("accepts a key inside the array, nested or not", () => {
    expect(
      errorsFor([
        { path: "items", recipe: { kind: "array_length", of: "limit", order_by: "items[].price", order: "desc" } },
      ])
    ).toEqual([]);
    expect(
      errorsFor([{ path: "items", recipe: { kind: "array_length", order_by: "items[].meta.at" } }])
    ).toEqual([]);
  });

  it("accepts a list of plain values ordered by the element itself", () => {
    expect(errorsFor([{ path: "tags", recipe: { kind: "array_length", order_by: "tags[]" } }])).toEqual([]);
  });

  it("blocks a key outside the array and one in a different array", () => {
    expect(
      errorsFor([{ path: "items", recipe: { kind: "array_length", order_by: "limit" } }]).join(" ")
    ).toContain("not a path inside it");
    expect(
      errorsFor([{ path: "items", recipe: { kind: "array_length", order_by: "others[].price" } }]).join(" ")
    ).toContain("not a path inside it");
  });

  it("blocks ordering by something with no order", () => {
    expect(
      errorsFor([{ path: "items", recipe: { kind: "array_length", order_by: "items[].meta" } }]).join(" ")
    ).toContain("nothing that can be ordered");
  });
});

describe("validatePlan on compute, compare and bounded dates", () => {
  const BASE = {
    page: 1,
    per_page: 10,
    total: 42,
    page_count: 1,
    has_next: false,
    label: "a",
    from: "2024-01-01",
    to: "2024-06-30",
    created_at: "2024-03-01",
  };
  const ALLOWED = Object.keys(BASE);

  function errorsFor(fields: VariantPlanDTO["fields"]) {
    return validatePlan(plan({ fields }), BASE, ALLOWED).errors;
  }

  it("accepts a page count, a flag and a bounded date", () => {
    expect(
      errorsFor([
        { path: "page_count", recipe: { kind: "compute", op: "ceil_divide", of: ["total", "per_page"] } },
        { path: "has_next", recipe: { kind: "compare", op: "lt", of: ["page", "page_count"] } },
        { path: "created_at", recipe: { kind: "date", format: "date", not_before: "from", not_after: "to" } },
      ])
    ).toEqual([]);
  });

  it("blocks computing with an operand the body does not hold as a number", () => {
    expect(
      errorsFor([{ path: "total", recipe: { kind: "compute", op: "add", of: ["page", "label"] } }]).join(" ")
    ).toContain(`computes with "label"`);
  });

  it("blocks comparing two operands of different types", () => {
    expect(
      errorsFor([{ path: "has_next", recipe: { kind: "compare", op: "lt", of: ["page", "label"] } }]).join(" ")
    ).toContain("hold different types");
  });

  it("blocks a bound that holds no date", () => {
    expect(
      errorsFor([
        { path: "created_at", recipe: { kind: "date", format: "date", not_after: "has_next" } },
      ]).join(" ")
    ).toContain("holds no date");
  });

  it("blocks a compute written into a field the body holds as a string", () => {
    expect(
      errorsFor([{ path: "label", recipe: { kind: "compute", op: "add", of: ["page", "total"] } }]).join(" ")
    ).toContain("produces number where the body holds string");
  });

  // `recipeDependencies` reports both operands, so the graph check needs nothing of its own.
  it("blocks two computed fields that depend on each other", () => {
    expect(
      errorsFor([
        { path: "total", recipe: { kind: "compute", op: "multiply", of: ["page_count", "per_page"] } },
        { path: "page_count", recipe: { kind: "compute", op: "ceil_divide", of: ["total", "per_page"] } },
      ]).join(" ")
    ).toContain("in a loop");
  });
});
