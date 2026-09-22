import {
  MAX_COOKIE_MAX_AGE,
  MAX_COOKIE_NAME_LENGTH,
  MAX_COOKIE_VALUE_LENGTH,
  MAX_RESPONSE_COOKIES,
  ResponseCookie,
  ResponseCookieListSchema,
  parseResponseCookies,
  serializeResponseCookie,
} from "@/models/endpoint/response_cookies.model";
import { ClientScenarioSchema, ScenarioWriteSchema } from "@/models/endpoint/endpoint.model";
import { VALID_SCENARIO } from "./endpoint_fixture";

// Widened the way the schema is: a form row carries its numbers as the strings an input holds.
type CookieRowInput = Omit<ResponseCookie, "max_age" | "same_site"> & {
  max_age: number | string | null;
  same_site: string;
};

const cookie = (overrides: Partial<CookieRowInput> = {}): CookieRowInput => ({
  name: "sid",
  value: "abc",
  path: "/",
  max_age: null,
  http_only: false,
  secure: false,
  same_site: "lax",
  partitioned: false,
  ...overrides,
});

const parseList = (value: unknown) => ResponseCookieListSchema.safeParse(value);

describe("what a cookie name may be", () => {
  it("takes the ones a mock actually needs", () => {
    expect(parseList([cookie({ name: "sid" }), cookie({ name: "csrf_token" })]).success).toBe(true);
  });

  it.each(["a b", "a=b", "a;b", "", "   ", "phiên"])("refuses %j", (name) => {
    expect(parseList([cookie({ name })]).success).toBe(false);
  });

  it("refuses a name past the length cap", () => {
    expect(parseList([cookie({ name: "x".repeat(MAX_COOKIE_NAME_LENGTH + 1) })]).success).toBe(
      false
    );
  });

  it("refuses the very same cookie twice", () => {
    expect(parseList([cookie({ name: "sid" }), cookie({ name: "sid" })]).success).toBe(false);
  });

  // Unlike a header name, a cookie name is case sensitive, so these are two different cookies.
  it("takes the same letters in a different case", () => {
    expect(parseList([cookie({ name: "SID" }), cookie({ name: "sid" })]).success).toBe(true);
  });

  it("takes one name at two paths, which the browser keeps apart", () => {
    expect(
      parseList([cookie({ path: "/admin" }), cookie({ path: "/public" })]).success
    ).toBe(true);
  });
});

describe("what a cookie value may be", () => {
  // A newline splits the response, and a comma is what `Headers.get` joins two cookies with.
  it.each(["a\r\nSet-Cookie: x=y", "a\nb", "a\rb", "a,b", "a;b", "a b", 'a"b', "a\\b"])(
    "refuses %j",
    (value) => {
      expect(parseList([cookie({ value })]).success).toBe(false);
    }
  );

  it("accepts an empty value, which is a cookie that is present and blank", () => {
    expect(parseList([cookie({ name: "sid", value: "" })]).success).toBe(true);
  });

  it("refuses a value past the length cap", () => {
    expect(parseList([cookie({ value: "v".repeat(MAX_COOKIE_VALUE_LENGTH + 1) })]).success).toBe(
      false
    );
  });
});

describe("the attributes an author fills in", () => {
  it.each(["admin", "/a;b"])("refuses the path %j", (path) => {
    expect(parseList([cookie({ path })]).success).toBe(false);
  });

  // Empty is the row a form hands over untouched, and it means the default rather than nothing.
  it("takes an empty path, which stands for /", () => {
    expect(parseList([cookie({ path: "" })]).success).toBe(true);
  });

  it.each(["abc", "-1", "1.5", String(MAX_COOKIE_MAX_AGE + 1)])("refuses a max age of %j", (max_age) => {
    expect(parseList([cookie({ max_age })]).success).toBe(false);
  });

  // Empty is a session cookie, and zero is how a browser is told to delete one.
  it.each(["", "0", "3600"])("accepts a max age of %j", (max_age) => {
    expect(parseList([cookie({ max_age })]).success).toBe(true);
  });

  it("refuses a SameSite it has never heard of", () => {
    expect(parseList([cookie({ same_site: "sometimes" })]).success).toBe(false);
  });
});

// The boundary of the whole feature: a mock cookie belongs to the project's own subdomain, so
// nothing an author writes may aim it at the apex where the app's own session lives.
describe("the Domain nobody may set", () => {
  it("refuses a row carrying one", () => {
    expect(parseList([{ ...cookie(), domain: ".evil.example" }]).success).toBe(false);
  });

  it("reads a stored row back without it", () => {
    const [row] = parseResponseCookies(
      JSON.stringify([{ ...cookie(), domain: ".evil.example" }])
    );

    expect(row).not.toHaveProperty("domain");
  });

  it("never emits one, whatever the row held", () => {
    const [row] = parseResponseCookies(
      JSON.stringify([{ ...cookie(), domain: ".evil.example" }])
    );

    expect(serializeResponseCookie(row as ResponseCookie)).not.toContain("Domain");
  });
});

// A browser drops a prefixed cookie that breaks its contract without a word, and silence is the
// worst answer a mock can give, so the contract is checked here instead.
describe("the __Host- and __Secure- prefixes", () => {
  it("refuses __Host- that is not secure", () => {
    expect(parseList([cookie({ name: "__Host-sid", secure: false })]).success).toBe(false);
  });

  it("refuses __Host- on a path of its own", () => {
    expect(
      parseList([cookie({ name: "__Host-sid", secure: true, path: "/admin" })]).success
    ).toBe(false);
  });

  it("refuses __Secure- that is not secure", () => {
    expect(parseList([cookie({ name: "__Secure-sid", secure: false })]).success).toBe(false);
  });

  it("takes __Host- when SameSite None has supplied the Secure", () => {
    expect(
      parseList([cookie({ name: "__Host-sid", secure: false, same_site: "none" })]).success
    ).toBe(true);
  });
});

describe("turning a row into a Set-Cookie", () => {
  const serialize = (overrides: Partial<ResponseCookie> = {}) =>
    serializeResponseCookie(cookie(overrides) as ResponseCookie);

  it("writes the plain case", () => {
    expect(serialize()).toBe("sid=abc; Path=/; SameSite=Lax");
  });

  // No browser keeps SameSite=None without Secure, so the tick is overridden rather than obeyed.
  it("adds Secure to SameSite None even when the author left it off", () => {
    expect(serialize({ same_site: "none", secure: false })).toContain("Secure");
  });

  it("leaves SameSite Lax alone when the author left Secure off", () => {
    expect(serialize({ same_site: "lax", secure: false })).not.toContain("Secure");
  });

  it("writes Max-Age=0, which is how a cookie is deleted", () => {
    expect(serialize({ max_age: 0 })).toContain("Max-Age=0");
  });

  it("writes no Max-Age at all for a session cookie", () => {
    expect(serialize({ max_age: null })).not.toContain("Max-Age");
  });

  // The author's bytes, not a re-encoding of them: `serialize` percent-encodes by default.
  it("emits the value verbatim", () => {
    expect(serialize({ value: "a|b~c" })).toContain("sid=a|b~c");
  });

  it("writes HttpOnly and Partitioned when they are asked for", () => {
    const written = serialize({ http_only: true, partitioned: true, same_site: "none" });

    expect(written).toContain("HttpOnly");
    expect(written).toContain("Partitioned");
  });

  // A row stored before a rule existed must be skipped, never allowed to fail the request.
  it("answers null for a row it cannot write rather than throwing", () => {
    expect(serialize({ name: "a b" })).toBeNull();
  });
});

describe("how many a mock may carry", () => {
  it(`stops past ${MAX_RESPONSE_COOKIES}`, () => {
    const many = Array.from({ length: MAX_RESPONSE_COOKIES + 1 }, (_, i) =>
      cookie({ name: `c${i}` })
    );

    expect(parseList(many).success).toBe(false);
  });
});

describe("an error points at the row that caused it", () => {
  it("names the index the form rendered, not one shifted by a blank row above", () => {
    const result = parseList([cookie({ name: "", value: "" }), cookie({ name: "a b" })]);

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual([1, "name"]);
  });

  it("names the field that is wrong, not the row as a whole", () => {
    const result = parseList([cookie({ value: "a,b" })]);

    expect(result.error?.issues[0]?.path).toEqual([0, "value"]);
  });
});

describe("the column round trip", () => {
  it("turns what the form sends into the text the column holds", () => {
    const result = ScenarioWriteSchema.safeParse({
      ...VALID_SCENARIO,
      response_cookies: [cookie({ http_only: true, max_age: "3600" })],
    });

    expect(result.success).toBe(true);
    expect(result.data?.response_cookies).toBe(
      '[{"name":"sid","value":"abc","path":"/","max_age":3600,"http_only":true,"secure":false,"same_site":"lax","partitioned":false}]'
    );
  });

  it("drops a blank row and trims the names it keeps", () => {
    const result = ScenarioWriteSchema.safeParse({
      ...VALID_SCENARIO,
      response_cookies: [cookie({ name: "", value: "" }), cookie({ name: "  sid  " })],
    });

    expect(JSON.parse(result.data?.response_cookies ?? "[]")).toEqual([
      expect.objectContaining({ name: "sid" }),
    ]);
  });

  // The stored row must never disagree with what is emitted, or the form reads the box back wrong.
  it("stores Secure as on once SameSite is None", () => {
    const result = ScenarioWriteSchema.safeParse({
      ...VALID_SCENARIO,
      response_cookies: [cookie({ same_site: "none", secure: false })],
    });

    expect(JSON.parse(result.data?.response_cookies ?? "[]")[0].secure).toBe(true);
  });

  it("stores / for the path a row arrived without", () => {
    const result = ScenarioWriteSchema.safeParse({
      ...VALID_SCENARIO,
      response_cookies: [cookie({ path: "" })],
    });

    expect(JSON.parse(result.data?.response_cookies ?? "[]")[0].path).toBe("/");
  });

  it("keeps a path the author did write", () => {
    const result = ScenarioWriteSchema.safeParse({
      ...VALID_SCENARIO,
      response_cookies: [cookie({ path: "/admin" })],
    });

    expect(JSON.parse(result.data?.response_cookies ?? "[]")[0].path).toBe("/admin");
  });

  it("accepts the text a stored row already holds", () => {
    const result = ScenarioWriteSchema.safeParse({
      ...VALID_SCENARIO,
      response_cookies: JSON.stringify([cookie()]),
    });

    expect(result.success).toBe(true);
  });

  it("defaults to no cookies at all", () => {
    expect(ScenarioWriteSchema.safeParse(VALID_SCENARIO).data?.response_cookies).toBe("[]");
  });

  it("refuses text that is not a list of cookies", () => {
    expect(
      ScenarioWriteSchema.safeParse({ ...VALID_SCENARIO, response_cookies: '{"a":1}' }).success
    ).toBe(false);
  });

  // The resolver needs zod's input and output types to agree, so this one stays an array.
  it("leaves the client schema handing back rows, not text", () => {
    const result = ClientScenarioSchema.safeParse({
      public_id: null,
      name: "Default",
      response_body: '{"a":1}',
      response_headers: [],
      response_cookies: [cookie({ max_age: "3600" })],
      delay_ms: "0",
      status_code: "200",
      ai_enabled: false,
      ai_fields: [],
      ai_prompt: null,
    });

    expect(result.data?.response_cookies).toEqual([cookie({ max_age: "3600" })]);
  });
});

describe("reading a row back", () => {
  it.each([["not json"], ['{"a":1}'], [null], [undefined], [""]])(
    "answers with no cookies for %j rather than throwing",
    (stored) => {
      expect(parseResponseCookies(stored)).toEqual([]);
    }
  );

  it("skips an entry that is not a cookie", () => {
    expect(parseResponseCookies('[{"name":"a","value":"1"},{"name":2},null]')).toEqual([
      expect.objectContaining({ name: "a", value: "1" }),
    ]);
  });

  it("fills in the defaults a hand-written row left out", () => {
    const [row] = parseResponseCookies('[{"name":"sid","value":"abc"}]');

    expect(row).toEqual({
      name: "sid",
      value: "abc",
      path: "/",
      max_age: null,
      http_only: false,
      secure: false,
      same_site: "none",
      partitioned: false,
    });
  });
});
