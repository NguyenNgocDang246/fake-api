import {
  AiPreviewSchema,
  CreateEndpointSchema,
  MAX_ARRAY_ITEMS,
  MAX_AI_PROMPT_LENGTH,
  MAX_AI_VALUES,
} from "@/models/endpoint/endpoint.model";
import { VALID } from "./endpoint_fixture";

const parse = (overrides: Record<string, unknown>) =>
  CreateEndpointSchema.safeParse({ ...VALID, ...overrides });

describe("AiPreviewSchema applies the same field checks as saving", () => {
  const PREVIEW_VALID = {
    method: "GET" as const,
    path: "/users",
    response_body: '{"name":"An"}',
    ai_fields: ["name"],
    ai_prompt: null,
    count: 3,
  };

  const parsePreview = (overrides: Record<string, unknown>) =>
    AiPreviewSchema.safeParse({ ...PREVIEW_VALID, ...overrides });

  it("accepts a leaf path, which is what the form sends", () => {
    expect(parsePreview({}).success).toBe(true);
  });

  it("rejects a path pointing at an object rather than a leaf", () => {
    const result = parsePreview({
      response_body: '{"user":{"name":"An"}}',
      ai_fields: ["user"],
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(["ai_fields"]);
    expect(result.error?.issues[0]?.message).toContain("user");
  });

  it("rejects a path the body does not have at all", () => {
    expect(parsePreview({ ai_fields: ["nope"] }).success).toBe(false);
  });

  it("rejects an array path whose elements do not share one type", () => {
    const result = parsePreview({
      response_body: '{"items":[{"price":1},{"price":"2"}]}',
      ai_fields: ["items[].price"],
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(["ai_fields"]);
    expect(result.error?.issues[0]?.message).toContain("items[].price");
  });

  it("still accepts the same path once every element agrees", () => {
    expect(
      parsePreview({
        response_body: '{"items":[{"price":1},{"price":2}]}',
        ai_fields: ["items[].price"],
      }).success
    ).toBe(true);
  });

  // The element cap used to be a truncation point, so a type break past it was invisible. A body
  // can no longer be long enough to have a "past it", which is the whole point of the cap moving.
  it("refuses the body outright rather than inspecting only its first elements", () => {
    const items = [
      ...Array.from({ length: MAX_ARRAY_ITEMS }, () => ({ price: 1 })),
      { price: "not a number" },
    ];

    const result = parsePreview({
      response_body: JSON.stringify({ items }),
      ai_fields: ["items[].price"],
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(["response_body"]);
    expect(result.error?.issues[0]?.message).toContain(String(MAX_ARRAY_ITEMS));
  });

  it("rejects an empty selection instead of calling a model with nothing to vary", () => {
    expect(parsePreview({ ai_fields: [] }).success).toBe(false);
  });

  it("rejects a selection asking for more values than one call can return", () => {
    const arrayCount = Math.ceil((MAX_AI_VALUES + 1) / MAX_ARRAY_ITEMS);
    const keys = Array.from({ length: arrayCount }, (_, index) => `list${index}`);
    const body = Object.fromEntries(
      keys.map((key) => [key, Array.from({ length: MAX_ARRAY_ITEMS }, (_, i) => i)])
    );

    const result = parsePreview({
      response_body: JSON.stringify(body),
      ai_fields: keys.map((key) => `${key}[]`),
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toContain(String(MAX_AI_VALUES));
  });

  it("agrees with CreateEndpointSchema on the same selection", () => {
    const body = '{"user":{"name":"An"}}';

    expect(parsePreview({ response_body: body, ai_fields: ["user"] }).success).toBe(false);
    expect(
      parse({ response_body: body, ai_enabled: true, ai_fields: ["user"] }).success
    ).toBe(false);

    expect(parsePreview({ response_body: body, ai_fields: ["user.name"] }).success).toBe(true);
    expect(
      parse({ response_body: body, ai_enabled: true, ai_fields: ["user.name"] }).success
    ).toBe(true);
  });
});

// The hint is author-written text handed to a model, so it is cleaned on the way in rather than
// judged for intent. Both write paths share one schema, so neither can drift from the other.
describe("the hint is cleaned before anything reads it", () => {
  const previewWith = (ai_prompt: unknown) =>
    AiPreviewSchema.safeParse({
      method: "GET" as const,
      path: "/users",
      response_body: '{"name":"An"}',
      ai_fields: ["name"],
      count: 3,
      ai_prompt,
    });

  it("folds a multi line hint onto one line", () => {
    expect(previewWith("use uuid for id\n\n\nand keep names short").data?.ai_prompt).toBe(
      "use uuid for id and keep names short"
    );
  });

  it("takes out zero width and bidi characters, which only ever hide text", () => {
    const hidden = "use​uuid\u202Efor id\u2066";

    expect(previewWith(hidden).data?.ai_prompt).toBe("useuuidfor id");
  });

  it("normalises a fullwidth lookalike to the plain character", () => {
    expect(previewWith("ｕｓｅ ｕｕｉｄ").data?.ai_prompt).toBe("use uuid");
  });

  it("refuses a hint past the cap, counting what the author typed", () => {
    const result = previewWith("x".repeat(MAX_AI_PROMPT_LENGTH + 1));

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toContain(String(MAX_AI_PROMPT_LENGTH));
  });

  it("cleans the same way when the endpoint is saved", () => {
    expect(parse({ ai_prompt: "  use​uuid  " }).data?.ai_prompt).toBe("useuuid");
  });
});
