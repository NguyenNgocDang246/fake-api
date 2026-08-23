import {
  AI_CONTEXT_MAX_CHARS,
  AI_MAX_OUTPUT_TOKENS,
  AI_MESSAGES,
  AI_MIN_OUTPUT_TOKENS,
  AI_THINKING_RESERVE,
  AI_TOKENS_PER_VALUE,
} from "@/server/core/constants";
import { MAX_AI_ARRAY_ITEMS, MAX_AI_VALUES } from "@/models/endpoint.model";
import type { AiChatParams, AiChatResult } from "@/server/services/ai/ai.types";

const chatMock = jest.fn<Promise<AiChatResult>, [AiChatParams]>();

jest.mock("@/server/services/ai/ai_router.service", () => ({
  __esModule: true,
  default: { chat: (params: AiChatParams) => chatMock(params) },
}));

import {
  applyPatch,
  buildContextBody,
  buildEditableFields,
  generateVariants,
  planBatch,
  validateVariantPatch,
} from "@/server/services/endpoint/endpoint_variant_generator.service";

const BASE = {
  id: 1,
  user: { name: "Nguyen Van An", email: "an@example.com" },
  status: "active",
};
const BASE_JSON = JSON.stringify(BASE);
const FIELDS = ["user.name", "user.email"];

function respond(payload: unknown): void {
  chatMock.mockResolvedValue({
    text: typeof payload === "string" ? payload : JSON.stringify(payload),
    provider: "anthropic",
    model: "claude-opus-5",
  });
}

const input = (overrides: Partial<Parameters<typeof generateVariants>[0]> = {}) => ({
  method: "GET",
  path: "/user/:id",
  responseBody: BASE_JSON,
  aiFields: FIELDS,
  count: 3,
  ...overrides,
});

describe("buildContextBody", () => {
  it("passes a small body through untouched", () => {
    const context = buildContextBody(BASE, FIELDS);

    expect(context.truncated).toBe(false);
    expect(JSON.parse(context.text)).toEqual(BASE);
  });

  it("keeps only a few sample elements of a long array and stays under the char cap", () => {
    const items = Array.from({ length: 5000 }, (_, index) => ({
      sku: `SKU-${index}`,
      price: index,
    }));
    const context = buildContextBody({ items }, ["items[].price"]);

    expect(context.truncated).toBe(true);
    expect(context.text.length).toBeLessThan(AI_CONTEXT_MAX_CHARS);
    expect(context.text).toContain("4998 similar elements");
    expect(context.text).toContain("SKU-0");
    expect(context.text).not.toContain("SKU-4999");
  });

  it("truncates long strings except at an editable field", () => {
    const long = "x".repeat(5_000);
    const context = buildContextBody({ note: long, title: long }, ["title"]);
    const parsed = JSON.parse(context.text);

    expect(parsed.title).toBe(long);
    expect(parsed.note.length).toBeLessThan(long.length);
    expect(parsed.note.endsWith("…")).toBe(true);
  });

  it("collapses deep branches except the one leading to an editable field", () => {
    const deep = {
      keep: { a: { b: { c: { d: { e: { f: { target: "keep me" } } } } } } },
      drop: { a: { b: { c: { d: { e: { f: { other: "drop me" } } } } } } },
      filler: "y".repeat(AI_CONTEXT_MAX_CHARS / 2),
    };
    const context = buildContextBody(deep, ["keep.a.b.c.d.e.f.target"]);

    expect(context.text).toContain("keep me");
    expect(context.text).not.toContain("drop me");
    expect(context.text).toContain("{...}");
  });
});

describe("buildEditableFields", () => {
  it("reports the type and current value of each field", () => {
    expect(buildEditableFields(BASE, FIELDS)).toEqual([
      { path: "user.name", type: "string", currentValue: "Nguyen Van An" },
      { path: "user.email", type: "string", currentValue: "an@example.com" },
    ]);
  });

  it("skips a path that no longer exists in the body", () => {
    expect(buildEditableFields(BASE, ["user.phone"])).toEqual([]);
  });

  it("caps an array path at the upper bound and records the real length", () => {
    const items = Array.from({ length: 200 }, (_, index) => ({ price: index }));
    const [field] = buildEditableFields({ items }, ["items[].price"]);

    expect(field?.arrayLength).toBe(MAX_AI_ARRAY_ITEMS);
    expect(field?.totalArrayLength).toBe(200);
    expect((field?.currentValue as number[]).length).toBe(MAX_AI_ARRAY_ITEMS);
  });

  it("drops a path pointing at an object rather than a leaf", () => {
    expect(buildEditableFields(BASE, ["user"])).toEqual([]);
  });

  it("drops a path pointing at an array of objects", () => {
    expect(buildEditableFields({ items: [{ price: 1 }] }, ["items"])).toEqual([]);
  });

  it("drops an array path whose elements are not leaves", () => {
    expect(buildEditableFields({ items: [{ price: 1 }, { price: 2 }] }, ["items[]"])).toEqual([]);
  });

  it("keeps the usable fields when an unusable one sits beside them", () => {
    expect(buildEditableFields(BASE, ["user", "user.name"])).toEqual([
      { path: "user.name", type: "string", currentValue: "Nguyen Van An" },
    ]);
  });
});

describe("planBatch", () => {
  it("asks for the full variant count when there are few fields", () => {
    const fields = buildEditableFields(BASE, FIELDS);
    expect(planBatch(fields, 10).variantCount).toBe(10);
  });

  it("lowers the variant count when a long array makes each variant expensive", () => {
    const items = Array.from({ length: 200 }, (_, index) => ({ price: index }));
    const fields = buildEditableFields({ items }, ["items[].price"]);
    const plan = planBatch(fields, 10);

    expect(plan.variantCount).toBeLessThan(10);
    expect(plan.variantCount).toBeGreaterThanOrEqual(1);
    expect(plan.maxTokens).toBeLessThanOrEqual(8_000);
  });

  it("refuses a selection too wide for even one variant to fit", () => {
    const wide: Record<string, string> = {};
    for (let index = 0; index < 400; index += 1) wide[`f${index}`] = "x";
    const fields = buildEditableFields(wide, Object.keys(wide));

    expect(() => planBatch(fields, 1)).toThrow(AI_MESSAGES.FIELDS_TOO_LARGE);
  });

  it("floors the budget so a small selection still has room to think", () => {
    const fields = buildEditableFields({ name: "An" }, ["name"]);

    expect(planBatch(fields, 1).maxTokens).toBe(AI_MIN_OUTPUT_TOKENS);
  });

  it("keeps room for thinking at the wide end, where the floor never applies", () => {
    const items = Array.from({ length: 200 }, (_, index) => ({ price: index }));
    const fields = buildEditableFields({ items }, ["items[].price"]);
    const plan = planBatch(fields, 10);

    const jsonTokens = plan.variantCount * MAX_AI_ARRAY_ITEMS * AI_TOKENS_PER_VALUE + 512;
    expect(plan.maxTokens).toBeGreaterThan(jsonTokens);
    expect(plan.maxTokens - jsonTokens).toBeGreaterThanOrEqual(
      Math.floor(jsonTokens * AI_THINKING_RESERVE)
    );
    expect(plan.maxTokens).toBeLessThanOrEqual(AI_MAX_OUTPUT_TOKENS);
  });

  it("accepts a selection at the MAX_AI_VALUES ceiling", () => {
    const body = Object.fromEntries(
      Array.from({ length: MAX_AI_VALUES }, (_, index) => [`f${index}`, "x"])
    );
    const fields = buildEditableFields(body, Object.keys(body));

    expect(fields).toHaveLength(MAX_AI_VALUES);
    expect(() => planBatch(fields, 1)).not.toThrow();
    expect(planBatch(fields, 1).maxTokens).toBeLessThanOrEqual(AI_MAX_OUTPUT_TOKENS);
  });
});

describe("validateVariantPatch", () => {
  const fields = buildEditableFields(BASE, FIELDS);

  it("accepts a patch with the right keys and types", () => {
    expect(
      validateVariantPatch({ "user.name": "Tran Binh", "user.email": "binh@example.com" }, fields)
    ).toEqual({ "user.name": "Tran Binh", "user.email": "binh@example.com" });
  });

  it("drops keys outside the allowed list", () => {
    const clean = validateVariantPatch(
      { "user.name": "Tran Binh", "user.email": "b@x.com", status: "banned", id: 999 },
      fields
    );

    expect(clean).toEqual({ "user.name": "Tran Binh", "user.email": "b@x.com" });
    expect(clean).not.toHaveProperty("status");
    expect(clean).not.toHaveProperty("id");
  });

  it("rejects the whole patch when a key is missing", () => {
    expect(validateVariantPatch({ "user.name": "Tran Binh" }, fields)).toBeNull();
  });

  it("rejects the whole patch on a type mismatch", () => {
    expect(
      validateVariantPatch({ "user.name": 123, "user.email": "b@x.com" }, fields)
    ).toBeNull();
  });

  it("rejects a patch whose array is the wrong length", () => {
    const arrayFields = buildEditableFields({ items: [{ p: 1 }, { p: 2 }] }, ["items[].p"]);

    expect(validateVariantPatch({ "items[].p": [9, 8] }, arrayFields)).toEqual({
      "items[].p": [9, 8],
    });
    expect(validateVariantPatch({ "items[].p": [9] }, arrayFields)).toBeNull();
    expect(validateVariantPatch({ "items[].p": [9, 8, 7] }, arrayFields)).toBeNull();
    expect(validateVariantPatch({ "items[].p": [9, "8"] }, arrayFields)).toBeNull();
  });
});

describe("applyPatch", () => {
  it("changes only the allowed fields and leaves the rest alone", () => {
    const body = applyPatch(BASE, { "user.name": "Le Hoa", "user.email": "hoa@example.com" });

    expect(JSON.parse(body!)).toEqual({
      id: 1,
      user: { name: "Le Hoa", email: "hoa@example.com" },
      status: "active",
    });
  });

  it("does not mutate the base body", () => {
    applyPatch(BASE, { "user.name": "Le Hoa" });
    expect(BASE.user.name).toBe("Nguyen Van An");
  });

  it("discards a variant identical to the base", () => {
    expect(applyPatch(BASE, { "user.name": "Nguyen Van An" })).toBeNull();
  });
});

describe("generateVariants", () => {
  it("assembles patches into complete bodies", async () => {
    respond({
      variants: [
        { "user.name": "Tran Binh", "user.email": "binh@example.com" },
        { "user.name": "Le Hoa", "user.email": "hoa@example.com" },
      ],
    });

    const { bodies } = await generateVariants(input());

    expect(bodies).toHaveLength(2);
    expect(bodies.map((body) => JSON.parse(body).user.name)).toEqual(["Tran Binh", "Le Hoa"]);
  });

  it("keeps unticked fields intact even when the model tries to change them", async () => {
    respond({
      variants: [
        {
          "user.name": "Tran Binh",
          "user.email": "binh@example.com",
          id: 999,
          status: "deleted",
        },
      ],
    });

    const { bodies } = await generateVariants(input());
    const body = JSON.parse(bodies[0]!);

    expect(body.id).toBe(1);
    expect(body.status).toBe("active");
    expect(body.user.name).toBe("Tran Binh");
  });

  it("keeps the valid patches and drops the broken ones in the same batch", async () => {
    respond({
      variants: [
        { "user.name": "Tran Binh", "user.email": "binh@example.com" },
        { "user.name": 42, "user.email": "x@example.com" },
        { "user.name": "only me" },
      ],
    });

    const { bodies } = await generateVariants(input());

    expect(bodies).toHaveLength(1);
    expect(JSON.parse(bodies[0]!).user.name).toBe("Tran Binh");
  });

  it("returns an empty array on unusable text instead of throwing", async () => {
    respond("the model rambled and produced no JSON at all");
    await expect(generateVariants(input())).resolves.toEqual({ bodies: [] });

    respond({ no_variants_key: true });
    await expect(generateVariants(input())).resolves.toEqual({ bodies: [] });
  });

  it("reads JSON wrapped in a markdown fence", async () => {
    respond(
      '```json\n{"variants":[{"user.name":"Tran Binh","user.email":"binh@example.com"}]}\n```'
    );

    const { bodies } = await generateVariants(input());
    expect(bodies).toHaveLength(1);
  });

  it("removes duplicate bodies within a batch", async () => {
    respond({
      variants: [
        { "user.name": "Tran Binh", "user.email": "binh@example.com" },
        { "user.name": "Tran Binh", "user.email": "binh@example.com" },
      ],
    });

    expect((await generateVariants(input())).bodies).toHaveLength(1);
  });

  it("sends a two block system prompt and marks the context block cacheable", async () => {
    respond({ variants: [] });
    await generateVariants(input());

    const system = chatMock.mock.calls[0]![0].system as { text: string; cacheable?: boolean }[];

    expect(system).toHaveLength(2);
    expect(system[0]!.cacheable).toBeUndefined();
    expect(system[1]!.cacheable).toBe(true);
    expect(system[1]!.text).toContain("GET /user/:id");
  });

  it("does not repeat the body in the message, so tokens are not paid for twice", async () => {
    respond({ variants: [] });
    await generateVariants(input());

    const content = chatMock.mock.calls[0]![0].messages[0]!.content;

    expect(content).toContain("user.name");
    expect(content).not.toContain("Response body");
  });

  it("includes the API author hint in the message under a clear label", async () => {
    respond({ variants: [] });
    await generateVariants(input({ aiPrompt: "Use northern Vietnamese names" }));

    const content = chatMock.mock.calls[0]![0].messages[0]!.content;

    expect(content).toContain("Additional instructions from the API author");
    expect(content).toContain("Use northern Vietnamese names");
  });

  it("regenerates only the head of a long array and leaves the tail at its original values", async () => {
    const items = Array.from({ length: 200 }, (_, index) => ({ sku: `S${index}`, price: index }));
    respond({
      variants: [{ "items[].price": Array.from({ length: MAX_AI_ARRAY_ITEMS }, () => 999) }],
    });

    const { bodies } = await generateVariants(
      input({
        responseBody: JSON.stringify({ items }),
        aiFields: ["items[].price"],
        count: 1,
      })
    );

    const result = JSON.parse(bodies[0]!);
    expect(result.items).toHaveLength(200);
    expect(result.items.slice(0, MAX_AI_ARRAY_ITEMS).every((i: { price: number }) => i.price === 999)).toBe(true);
    expect(result.items[MAX_AI_ARRAY_ITEMS].price).toBe(MAX_AI_ARRAY_ITEMS);
    expect(result.items[199].price).toBe(199);
    expect(result.items[0].sku).toBe("S0");
  });

  it("reports a clear error when the base body is not a JSON object", async () => {
    await expect(generateVariants(input({ responseBody: "not-json-at-all" }))).rejects.toMatchObject(
      { message: AI_MESSAGES.INVALID_BASE_BODY }
    );
    await expect(generateVariants(input({ responseBody: "[1,2,3]" }))).rejects.toMatchObject({
      message: AI_MESSAGES.INVALID_BASE_BODY,
    });
  });

  it("errors instead of calling the model when no valid field is left", async () => {
    await expect(generateVariants(input({ aiFields: ["does.not.exist"] }))).rejects.toMatchObject({
      message: AI_MESSAGES.FIELDS_NOT_PATCHABLE,
    });
    expect(chatMock).not.toHaveBeenCalled();
  });

  it("says nothing was selected only when the field list really is empty", async () => {
    await expect(generateVariants(input({ aiFields: [] }))).rejects.toMatchObject({
      message: AI_MESSAGES.NO_FIELDS_SELECTED,
    });
    expect(chatMock).not.toHaveBeenCalled();
  });

  it("reports a ragged array path as unpatchable rather than as an empty selection", async () => {
    await expect(
      generateVariants(
        input({
          responseBody: JSON.stringify({ items: [{ price: 1 }, { price: "2" }] }),
          aiFields: ["items[].price"],
        })
      )
    ).rejects.toMatchObject({ message: AI_MESSAGES.FIELDS_NOT_PATCHABLE });
    expect(chatMock).not.toHaveBeenCalled();
  });

  it("says the selection is too large when the answer was cut off at the budget", async () => {
    chatMock.mockResolvedValue({
      text: '{"variants":[{"user.name":"Tran',
      provider: "anthropic",
      model: "claude-opus-5",
      stopReason: "max_tokens",
    });

    await expect(generateVariants(input())).rejects.toMatchObject({
      message: AI_MESSAGES.FIELDS_TOO_LARGE,
    });
  });

  it("still returns nothing, without erroring, when a complete answer is unusable", async () => {
    chatMock.mockResolvedValue({
      text: "the model apologises and explains itself in prose",
      provider: "anthropic",
      model: "claude-opus-5",
      stopReason: "stop",
    });

    await expect(generateVariants(input())).resolves.toMatchObject({ bodies: [] });
  });

  it("does not error on a truncated answer that still yielded a usable variant", async () => {
    chatMock.mockResolvedValue({
      text: '{"variants":[{"user.name":"Tran Binh","user.email":"binh@example.com"}]}',
      provider: "anthropic",
      model: "claude-opus-5",
      stopReason: "max_tokens",
    });

    const { bodies } = await generateVariants(input());

    expect(bodies).toHaveLength(1);
  });
});
