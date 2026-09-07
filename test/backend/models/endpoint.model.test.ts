import {
  ClientCreateEndpointSchema,
  CreateEndpointSchema,
  EndpointInfoSchema,
  MAX_ARRAY_ITEMS,
  MAX_DELAY_MS,
  MAX_RESPONSE_BODY_CHARS,
  MAX_RESPONSE_BODY_DEPTH,
  MAX_STATUS_CODE,
  MIN_STATUS_CODE,
} from "@/models/endpoint/endpoint.model";
import { VALID } from "./endpoint_fixture";

const parse = (overrides: Record<string, unknown>) =>
  CreateEndpointSchema.safeParse({ ...VALID, ...overrides });

const nest = (depth: number) => {
  let body: unknown = 1;
  for (let level = 0; level < depth; level += 1) body = { a: body };
  return JSON.stringify(body);
};

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

describe("response_body limits", () => {
  it("still refuses anything that is not a JSON object at the root", () => {
    for (const body of ["[1,2]", '"text"', "null", "1", "{oops"]) {
      expect(parse({ response_body: body }).success).toBe(false);
    }
  });

  it("refuses a body longer than the character ceiling", () => {
    const padding = "x".repeat(MAX_RESPONSE_BODY_CHARS);

    const result = parse({ response_body: JSON.stringify({ padding }) });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(["response_body"]);
    expect(result.error?.issues[0]?.message).toContain(String(MAX_RESPONSE_BODY_CHARS));
  });

  it("refuses a body nested past the depth ceiling", () => {
    expect(parse({ response_body: nest(MAX_RESPONSE_BODY_DEPTH) }).success).toBe(true);

    const result = parse({ response_body: nest(MAX_RESPONSE_BODY_DEPTH + 1) });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toContain(String(MAX_RESPONSE_BODY_DEPTH));
  });

  it("refuses an array holding more elements than a plan can ever touch", () => {
    const fits = Array.from({ length: MAX_ARRAY_ITEMS }, (_, i) => i);
    expect(parse({ response_body: JSON.stringify({ list: fits }) }).success).toBe(true);

    const result = parse({ response_body: JSON.stringify({ list: [...fits, 0] }) });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toContain(String(MAX_ARRAY_ITEMS));
  });

  it("names the path of the array that broke the rule", () => {
    const deep = { a: { b: [{ c: Array.from({ length: MAX_ARRAY_ITEMS + 1 }, () => 0) }] } };

    expect(parse({ response_body: JSON.stringify(deep) }).error?.issues[0]?.message).toContain(
      "a.b[0].c"
    );
  });

  // The field checks run on an already parsed body, so a body that failed must stop them rather
  // than reach them with nothing to parse.
  it("reports the body, not the field list, when both would fail", () => {
    const result = parse({
      response_body: JSON.stringify({ list: Array.from({ length: MAX_ARRAY_ITEMS + 1 }, () => 0) }),
      ai_enabled: true,
      ai_fields: ["nope"],
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues.map((issue) => issue.path)).toEqual([["response_body"]]);
  });

  // The limits guard writes only. Rows saved before them must keep loading, or the endpoint list
  // goes down for anyone who ever stored a long array.
  it("keeps reading a stored body the write path would now refuse", () => {
    const body = JSON.stringify({ list: Array.from({ length: MAX_ARRAY_ITEMS + 10 }, () => 0) });

    expect(parse({ response_body: body }).success).toBe(false);
    expect(
      EndpointInfoSchema.safeParse({
        public_id: "aaaaaaaaaaaa",
        endpoint_groups_id: "cccccccccccc",
        path: "/users",
        method: "GET",
        status_code: 200,
        response_body: body,
        delay_ms: 0,
        ai_enabled: false,
        ai_fields: [],
        ai_prompt: null,
      }).success
    ).toBe(true);
  });
});

// `JSON.stringify(JSON.parse(x))` is not the identity, and a mock whose whole job is to answer
// with a fixed body has to answer with the bytes its author wrote.
describe("response_body keeps the author's exact JSON", () => {
  it.each([
    ['{"b":1,"2":2,"1":3,"a":4}', "integer-like keys keep their place"],
    ['{"n":12345678901234567890}', "an integer past 2^53 keeps its digits"],
    ['{"n":1e999}', "an overflowing number does not become null"],
    ['{"n":-0}', "negative zero stays negative zero"],
    ['{"n":1.0,"m":1e2}', "the author's notation survives"],
    ['{\n  "a": 1\n}', "indentation survives"],
  ])("%s: %s", (body) => {
    expect(parse({ response_body: body }).data?.response_body).toBe(body);
  });

  it("is exactly what JSON.stringify would have destroyed", () => {
    const body = '{"b":1,"1":3,"n":12345678901234567890}';

    expect(JSON.stringify(JSON.parse(body))).not.toBe(body);
    expect(parse({ response_body: body }).data?.response_body).toBe(body);
  });

  // Duplicate keys are the one thing still lost, and JSON.parse decides that before any of this.
  it("still refuses a body that is not valid JSON at all", () => {
    expect(parse({ response_body: '{"a":1,,}' }).success).toBe(false);
  });
});

describe("ai_fields", () => {
  it("drops a repeated path instead of spending a slot on it", () => {
    const result = parse({
      response_body: '{"a":1,"b":2}',
      ai_enabled: true,
      ai_fields: ["a", "b", "a"],
    });

    expect(result.success).toBe(true);
    expect(result.data?.ai_fields).toEqual(["a", "b"]);
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
