import {
  AiPreviewSchema,
  ClientCreateEndpointSchema,
  CreateEndpointSchema,
  MAX_AI_ARRAY_ITEMS,
  MAX_AI_VALUES,
  MAX_DELAY_MS,
  MAX_STATUS_CODE,
  MIN_STATUS_CODE,
} from "@/models/endpoint.model";

const VALID = {
  endpoint_groups_public_id: "cccccccccccc",
  method: "GET" as const,
  path: "/users",
  status_code: 200,
  response_body: '{"name":"An"}',
  delay_ms: 0,
};

const parse = (overrides: Record<string, unknown>) =>
  CreateEndpointSchema.safeParse({ ...VALID, ...overrides });

describe("status_code and delay_ms coercion", () => {
  it("accepts a number as it is", () => {
    const result = parse({ status_code: 404, delay_ms: 250 });

    expect(result.success).toBe(true);
    expect(result.data).toMatchObject({ status_code: 404, delay_ms: 250 });
  });

  it("accepts the string the form actually sends", () => {
    const result = parse({ status_code: "404", delay_ms: "250" });

    expect(result.success).toBe(true);
    expect(result.data).toMatchObject({ status_code: 404, delay_ms: 250 });
  });

  it("tolerates surrounding whitespace", () => {
    expect(parse({ status_code: " 201 " }).data).toMatchObject({ status_code: 201 });
  });

  it.each(["abc", "", "   ", "NaN", "Infinity"])("rejects %j rather than storing NaN", (value) => {
    expect(parse({ status_code: value }).success).toBe(false);
    expect(parse({ delay_ms: value }).success).toBe(false);
  });

  it("rejects a number with trailing garbage instead of reading the prefix", () => {
    expect(parse({ status_code: "200abc" }).success).toBe(false);
    expect(parse({ delay_ms: "10s" }).success).toBe(false);
  });

  it("rejects a fraction, since the column is an integer", () => {
    expect(parse({ status_code: "200.5" }).success).toBe(false);
    expect(parse({ delay_ms: 1.5 }).success).toBe(false);
  });

  it("holds the status code to the range HTTP defines", () => {
    expect(parse({ status_code: MIN_STATUS_CODE }).success).toBe(true);
    expect(parse({ status_code: MAX_STATUS_CODE }).success).toBe(true);
    expect(parse({ status_code: MIN_STATUS_CODE - 1 }).success).toBe(false);
    expect(parse({ status_code: MAX_STATUS_CODE + 1 }).success).toBe(false);
  });

  it("holds the delay between zero and the ceiling", () => {
    expect(parse({ delay_ms: 0 }).success).toBe(true);
    expect(parse({ delay_ms: MAX_DELAY_MS }).success).toBe(true);
    expect(parse({ delay_ms: -1 }).success).toBe(false);
    expect(parse({ delay_ms: MAX_DELAY_MS + 1 }).success).toBe(false);
  });

  it("names the offending field so the form can show the message next to it", () => {
    const result = parse({ delay_ms: "abc" });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(["delay_ms"]);
  });
});

describe("the client schema applies the same numeric bounds", () => {
  const CLIENT_VALID = {
    path: "/users",
    method: "GET" as const,
    response_body: '{"name":"An"}',
    delay_ms: "0",
    status_code: "200",
    ai_enabled: false,
    ai_fields: [],
    ai_prompt: null,
  };

  const parseClient = (overrides: Record<string, unknown>) =>
    ClientCreateEndpointSchema.safeParse({ ...CLIENT_VALID, ...overrides });

  it("accepts what the form normally sends", () => {
    expect(parseClient({}).success).toBe(true);
  });

  it.each(["abc", "", "200abc", "200.5"])("rejects %j before it reaches the server", (value) => {
    expect(parseClient({ status_code: value }).success).toBe(false);
  });

  it("applies the same ranges as the server", () => {
    expect(parseClient({ status_code: String(MIN_STATUS_CODE - 1) }).success).toBe(false);
    expect(parseClient({ status_code: String(MAX_STATUS_CODE + 1) }).success).toBe(false);
    expect(parseClient({ delay_ms: "-1" }).success).toBe(false);
    expect(parseClient({ delay_ms: String(MAX_DELAY_MS + 1) }).success).toBe(false);
  });

  it("leaves both fields as strings, which is what the resolver needs", () => {
    const result = parseClient({});

    expect(result.data?.status_code).toBe("200");
    expect(result.data?.delay_ms).toBe("0");
  });
});

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

  it("ignores a type break past the element cap the generator applies", () => {
    const items = [
      ...Array.from({ length: MAX_AI_ARRAY_ITEMS }, () => ({ price: 1 })),
      { price: "not a number" },
    ];

    expect(
      parsePreview({
        response_body: JSON.stringify({ items }),
        ai_fields: ["items[].price"],
      }).success
    ).toBe(true);
  });

  it("rejects an empty selection instead of calling a model with nothing to vary", () => {
    expect(parsePreview({ ai_fields: [] }).success).toBe(false);
  });

  it("rejects a selection asking for more values than one call can return", () => {
    const arrayCount = Math.ceil((MAX_AI_VALUES + 1) / MAX_AI_ARRAY_ITEMS);
    const keys = Array.from({ length: arrayCount }, (_, index) => `list${index}`);
    const body = Object.fromEntries(
      keys.map((key) => [key, Array.from({ length: MAX_AI_ARRAY_ITEMS }, (_, i) => i)])
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
