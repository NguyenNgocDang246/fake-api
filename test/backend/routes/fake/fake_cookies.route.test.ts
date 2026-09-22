jest.mock("@/server/services/endpoint/endpoint.service", () =>
  jest.requireActual("./fake_fixture").endpointServiceMock()
);

jest.mock("@/server/services/project.service", () => ({
  __esModule: true,
  default: { getCorsConfig: jest.fn() },
}));

jest.mock("@/server/services/endpoint/variant/plan.service", () => ({
  __esModule: true,
  default: { loadRenderable: jest.fn(), ensurePlan: jest.fn() },
}));

import EndpointService from "@/server/services/endpoint/endpoint.service";
import projectService from "@/server/services/project.service";
import { GET } from "@/app/api/fake/[projectId]/route";
import { STATUS_CODE } from "@/server/core/constants";
import { ResponseCookie } from "@/models/endpoint/response_cookies.model";
import { servable } from "./fake_fixture";
import { createJsonRequest, createRouteParams } from "../../helpers/http";

const PARAMS = createRouteParams({ projectId: "projectpubab" });
const MOCK_HOST = "projectpubab.localhost";

const base = {
  method: "GET",
  path: "/users",
  status_code: 200,
  response_body: "{}",
  response_headers: "[]",
  response_cookies: "[]",
  delay_ms: 0,
};

const cookie = (overrides: Partial<ResponseCookie> = {}) => ({
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

const stored = (...rows: unknown[]) => JSON.stringify(rows);

function serve(overrides: Partial<typeof base> = {}, headers: Record<string, string> = {}) {
  (EndpointService.getServableEndpointByPath as jest.Mock).mockResolvedValue(
    servable({ ...base, ...overrides })
  );
  return GET(
    createJsonRequest({}, { pathname: "/users", headers: { host: MOCK_HOST, ...headers } }),
    PARAMS
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  (projectService.getCorsConfig as jest.Mock).mockResolvedValue({
    cors_enabled: true,
    cors_origins: [],
    cors_allow_credentials: false,
  });
});

describe("the cookies a scenario sets", () => {
  it("sends none when the author set none", async () => {
    const res = await serve();

    expect(res.headers.getSetCookie()).toEqual([]);
  });

  // `Set-Cookie` is the one response header a browser reads as a list, so each row is its own
  // line. Asserted on `getSetCookie`, never on `get`, which joins them with a comma.
  it("writes one Set-Cookie per row, in the order they are stored", async () => {
    const res = await serve({
      response_cookies: stored(cookie({ name: "sid" }), cookie({ name: "theme", value: "dark" })),
    });

    const written = res.headers.getSetCookie();
    expect(written).toHaveLength(2);
    expect(written[0]).toContain("sid=abc");
    expect(written[1]).toContain("theme=dark");
  });

  it("writes the attributes the author picked", async () => {
    const res = await serve({
      response_cookies: stored(cookie({ http_only: true, max_age: 3600, path: "/admin" })),
    });

    const [written] = res.headers.getSetCookie();
    expect(written).toContain("HttpOnly");
    expect(written).toContain("Max-Age=3600");
    expect(written).toContain("Path=/admin");
  });
});

// The boundary the feature rests on: a mock cookie belongs to the project's own subdomain, so it
// can never reach the apex where the app's own session lives, nor another project's jar.
describe("the Domain a mock never sends", () => {
  it("leaves it out even when a stored row carries one", async () => {
    const res = await serve({
      response_cookies: stored({ ...cookie(), domain: ".evil.example" }),
    });

    expect(res.status).toBe(200);
    expect(res.headers.getSetCookie()[0]).not.toContain("Domain");
  });
});

describe("SameSite and Secure travel together", () => {
  it("adds Secure to SameSite None, whatever the row said", async () => {
    const res = await serve({
      response_cookies: stored(cookie({ same_site: "none", secure: false })),
    });

    const [written] = res.headers.getSetCookie();
    expect(written).toContain("SameSite=None");
    expect(written).toContain("Secure");
  });

  it("leaves SameSite Lax without it", async () => {
    const res = await serve({
      response_cookies: stored(cookie({ same_site: "lax", secure: false })),
    });

    expect(res.headers.getSetCookie()[0]).not.toContain("Secure");
  });
});

describe("the statuses that still carry cookies", () => {
  // A mocked logout answers 204, which is exactly the case that has to keep its Set-Cookie.
  it("sends them on a 204, which carries no body", async () => {
    const res = await serve({
      status_code: STATUS_CODE.NO_CONTENT,
      response_cookies: stored(cookie({ max_age: 0 })),
    });

    expect(res.status).toBe(STATUS_CODE.NO_CONTENT);
    expect(res.headers.getSetCookie()).toHaveLength(1);
    expect(res.headers.get("content-type")).toBeNull();
  });

  // The cookie pass runs after the redirect check, so a Location dropped for leaving the host
  // must not take the cookies with it.
  it("keeps them on a redirect whose Location was dropped", async () => {
    const res = await serve({
      status_code: 302,
      response_headers: JSON.stringify([{ name: "Location", value: "https://evil.example" }]),
      response_cookies: stored(cookie()),
    });

    expect(res.headers.get("location")).toBeNull();
    expect(res.headers.getSetCookie()).toHaveLength(1);
  });
});

describe("a stored row the rules would refuse today", () => {
  it.each([
    ["a name that is not a token", cookie({ name: "a b" })],
    ["a comma in the value", cookie({ value: "a,b" })],
    ["a path going nowhere", cookie({ path: "admin" })],
  ])("skips %s and still sends the good one beside it", async (_label, bad) => {
    const res = await serve({
      response_cookies: stored(bad, cookie({ name: "kept", value: "yes" })),
    });

    expect(res.status).toBe(200);
    expect(res.headers.getSetCookie()).toEqual([expect.stringContaining("kept=yes")]);
  });

  it.each(["not json at all", '{"a":1}', ""])(
    "serves the endpoint anyway when the cookies column reads %j",
    async (column) => {
      const res = await serve({ response_cookies: column });

      expect(res.status).toBe(200);
      expect(res.headers.getSetCookie()).toEqual([]);
    }
  );
});

describe("what a browser is told about them", () => {
  // `Set-Cookie` is a forbidden response-header name: no browser hands it to script whatever CORS
  // says, so naming it would be a promise that cannot be kept.
  it("never names Set-Cookie in the expose list, but still names the author's own header", async () => {
    const res = await serve(
      {
        response_headers: JSON.stringify([{ name: "X-Total-Count", value: "42" }]),
        response_cookies: stored(cookie()),
      },
      { origin: "http://localhost" }
    );

    const exposed = res.headers.get("access-control-expose-headers");
    expect(exposed).not.toContain("set-cookie");
    expect(exposed).toContain("x-total-count");
  });

  // The pairing a browser actually needs before it will keep a cross-site cookie.
  it("answers with allow-credentials beside the cookie when the project allows it", async () => {
    (projectService.getCorsConfig as jest.Mock).mockResolvedValue({
      cors_enabled: true,
      cors_origins: ["http://localhost"],
      cors_allow_credentials: true,
    });

    const res = await serve(
      { response_cookies: stored(cookie({ same_site: "none" })) },
      { origin: "http://localhost" }
    );

    expect(res.headers.get("access-control-allow-credentials")).toBe("true");
    expect(res.headers.getSetCookie()).toHaveLength(1);
  });
});
