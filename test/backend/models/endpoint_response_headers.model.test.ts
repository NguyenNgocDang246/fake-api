import {
  MAX_HEADER_NAME_LENGTH,
  MAX_HEADER_VALUE_LENGTH,
  MAX_RESPONSE_HEADERS,
  ResponseHeaderListSchema,
  isBlockedHeader,
  parseResponseHeaders,
} from "@/models/endpoint/response_headers.model";
import { ClientCreateEndpointSchema, CreateEndpointSchema } from "@/models/endpoint/endpoint.model";
import { VALID } from "./endpoint_fixture";

const rows = (...pairs: [string, string][]) => pairs.map(([name, value]) => ({ name, value }));

const parseList = (value: unknown) => ResponseHeaderListSchema.safeParse(value);

describe("what a header name may be", () => {
  it("takes the ones a mock actually needs", () => {
    expect(parseList(rows(["X-Total-Count", "42"], ["Cache-Control", "max-age=60"])).success).toBe(
      true
    );
  });

  it.each(["X Total", "X:Count", "Tổng", "", "   "])("refuses %j", (name) => {
    expect(parseList(rows([name, "1"])).success).toBe(false);
  });

  it("refuses a name past the length cap", () => {
    expect(parseList(rows(["x".repeat(MAX_HEADER_NAME_LENGTH + 1), "1"])).success).toBe(false);
  });

  it("refuses the same name twice, however it was cased", () => {
    expect(parseList(rows(["X-Count", "1"], ["x-count", "2"])).success).toBe(false);
  });
});

describe("what a header value may be", () => {
  // A newline in a value is how a response gets split and headers invented, so it is the one
  // character this has to refuse.
  it.each(["a\r\nX-Injected: yes", "a\nb", "a\rb"])("refuses %j", (value) => {
    expect(parseList(rows(["X-Test", value])).success).toBe(false);
  });

  it("refuses a value past the length cap", () => {
    expect(parseList(rows(["X-Test", "v".repeat(MAX_HEADER_VALUE_LENGTH + 1)])).success).toBe(false);
  });

  it("accepts an empty value, which is a header that is present and blank", () => {
    expect(parseList(rows(["X-Test", ""])).success).toBe(true);
  });
});

describe("the headers Fake API keeps for itself", () => {
  // A mock answers on the same origin as the app, so a cookie set here would land on the app's
  // own session.
  it.each([
    "Set-Cookie",
    "set-cookie",
    "Content-Length",
    "Transfer-Encoding",
    "Access-Control-Allow-Origin",
  ])("refuses %s", (name) => {
    expect(isBlockedHeader(name)).toBe(true);
    expect(parseList(rows([name, "x"])).success).toBe(false);
  });

  it("leaves an ordinary header alone", () => {
    expect(isBlockedHeader("X-Total-Count")).toBe(false);
  });
});

describe("how many a mock may carry", () => {
  it(`stops past ${MAX_RESPONSE_HEADERS}`, () => {
    const many = Array.from({ length: MAX_RESPONSE_HEADERS + 1 }, (_, i) => ({
      name: `X-H${i}`,
      value: "1",
    }));

    expect(parseList(many).success).toBe(false);
  });
});

describe("an error points at the row that caused it", () => {
  it("names the index the form rendered, not one shifted by a blank row above", () => {
    const result = parseList(rows(["", ""], ["X Bad", "1"]));

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual([1, "name"]);
  });
});

describe("the column round trip", () => {
  it("turns what the form sends into the text the column holds", () => {
    const result = CreateEndpointSchema.safeParse({
      ...VALID,
      response_headers: rows(["X-Total-Count", "42"]),
    });

    expect(result.success).toBe(true);
    expect(result.data?.response_headers).toBe('[{"name":"X-Total-Count","value":"42"}]');
  });

  // A row the author added and left empty is not something to refuse, it is something to drop.
  it("drops a blank row and trims the names it keeps", () => {
    const result = CreateEndpointSchema.safeParse({
      ...VALID,
      response_headers: rows(["", ""], ["  X-Total-Count  ", "42"]),
    });

    expect(result.data?.response_headers).toBe('[{"name":"X-Total-Count","value":"42"}]');
  });

  it("accepts the text a stored row already holds", () => {
    const result = CreateEndpointSchema.safeParse({
      ...VALID,
      response_headers: '[{"name":"ETag","value":"v1"}]',
    });

    expect(result.success).toBe(true);
  });

  it("defaults to no headers at all", () => {
    const { response_headers, ...withoutHeaders } = VALID;
    void response_headers;

    expect(CreateEndpointSchema.safeParse(withoutHeaders).data?.response_headers).toBe("[]");
  });

  it("refuses text that is not a list of headers", () => {
    expect(
      CreateEndpointSchema.safeParse({ ...VALID, response_headers: '{"a":1}' }).success
    ).toBe(false);
  });

  // The resolver needs zod's input and output types to agree, so this one stays an array.
  it("leaves the client schema handing back rows, not text", () => {
    const result = ClientCreateEndpointSchema.safeParse({
      path: "/users",
      method: "GET",
      response_body: '{"a":1}',
      response_headers: rows(["X-Total-Count", "42"]),
      delay_ms: "0",
      status_code: "200",
      ai_enabled: false,
      ai_fields: [],
      ai_prompt: null,
    });

    expect(result.data?.response_headers).toEqual(rows(["X-Total-Count", "42"]));
  });
});

describe("reading a row back", () => {
  it.each([["not json"], ['{"a":1}'], [null], [undefined]])(
    "answers with no headers for %j rather than throwing",
    (stored) => {
      expect(parseResponseHeaders(stored)).toEqual([]);
    }
  );

  it("skips an entry that is not a header", () => {
    expect(parseResponseHeaders('[{"name":"A","value":"1"},{"name":2},null]')).toEqual(
      rows(["A", "1"])
    );
  });
});
