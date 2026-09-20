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
import { servable } from "./fake_fixture";
import { createJsonRequest, createRouteParams } from "../../helpers/http";

const PARAMS = createRouteParams({ projectId: "PUBLIC" });
const MOCK_HOST = "projectpubab.localhost";

const base = {
  method: "GET",
  path: "/users",
  status_code: 200,
  response_body: "{}",
  response_headers: "[]",
  delay_ms: 0,
};

function serve(overrides: Partial<typeof base> = {}) {
  (EndpointService.getServableEndpointByPath as jest.Mock).mockResolvedValue(servable({ ...base, ...overrides }));
  return GET(createJsonRequest({}, { pathname: "/users", headers: { host: MOCK_HOST } }), PARAMS);
}

function redirectTo(location: string, status_code = 302) {
  return serve({
    status_code,
    response_headers: JSON.stringify([{ name: "Location", value: location }]),
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  (projectService.getCorsConfig as jest.Mock).mockResolvedValue({
    cors_enabled: true,
    cors_origins: [],
    cors_allow_credentials: false,
  });
});

describe("what a mock answers with when nobody set a header", () => {
  it("declares JSON in UTF-8", async () => {
    const res = await serve();

    expect(res.headers.get("content-type")).toBe("application/json; charset=utf-8");
  });

  // Bodies are edited constantly and an AI endpoint answers differently every call, so a cached
  // GET would show the author a response they already replaced.
  it("keeps the browser from caching the response", async () => {
    const res = await serve();

    expect(res.headers.get("cache-control")).toBe("no-store");
  });
});

describe("headers the endpoint sets", () => {
  it("sends them alongside the body", async () => {
    const res = await serve({
      response_headers: JSON.stringify([
        { name: "X-Total-Count", value: "42" },
        { name: "ETag", value: '"v1"' },
      ]),
    });

    expect(res.headers.get("x-total-count")).toBe("42");
    expect(res.headers.get("etag")).toBe('"v1"');
  });

  // A header the browser cannot read is a header that may as well not have been sent, so the
  // name has to be exposed. Only a browser call gets that, which is why this one sends an Origin.
  it("names them so a browser is allowed to read them", async () => {
    (EndpointService.getServableEndpointByPath as jest.Mock).mockResolvedValue(servable({ ...base, response_headers: JSON.stringify([{ name: "X-Total-Count", value: "42" }]) }));

    const res = await GET(
      createJsonRequest({}, { pathname: "/users", headers: { origin: "http://localhost" } }),
      PARAMS
    );

    expect(res.headers.get("access-control-expose-headers")).toContain("x-total-count");
  });

  // `constructor` is a valid header name and a key every object answers to, so the locked list
  // has to be asked what it owns rather than what it inherits.
  it("names one that happens to be spelled like an object's own key", async () => {
    (EndpointService.getServableEndpointByPath as jest.Mock).mockResolvedValue(servable({ ...base, response_headers: JSON.stringify([{ name: "constructor", value: "42" }]) }));

    const res = await GET(
      createJsonRequest({}, { pathname: "/users", headers: { origin: "http://localhost" } }),
      PARAMS
    );

    expect(res.headers.get("access-control-expose-headers")).toContain("constructor");
  });

  it("replaces a default rather than sitting beside it", async () => {
    const res = await serve({
      response_headers: JSON.stringify([
        { name: "Cache-Control", value: "max-age=60" },
        { name: "content-type", value: "text/plain" },
      ]),
    });

    expect(res.headers.get("cache-control")).toBe("max-age=60");
    expect(res.headers.get("content-type")).toBe("text/plain");
  });

  it("sends them on a 204, which carries no body but still carries headers", async () => {
    const res = await serve({
      status_code: STATUS_CODE.NO_CONTENT,
      response_headers: JSON.stringify([{ name: "Location", value: "/users/1" }]),
    });

    expect(res.status).toBe(STATUS_CODE.NO_CONTENT);
    expect(res.headers.get("location")).toBe("/users/1");
    expect(res.headers.get("content-type")).toBeNull();
  });

  // The model refuses these on the way in, but a row written before that rule never passed
  // through it. Serving one still answers, it just leaves the header out: failing the request
  // would take down a whole endpoint over a header nobody can see.
  it.each(["Set-Cookie", "Content-Length", "Access-Control-Allow-Origin", "Refresh"])(
    "answers normally and drops %s when a stored row carries it",
    async (name) => {
      const res = await serve({
        response_headers: JSON.stringify([
          { name, value: "anything" },
          { name: "X-Kept", value: "yes" },
        ]),
      });

      expect(res.status).toBe(200);
      expect(res.headers.get(name)).not.toBe("anything");
      expect(res.headers.get("x-kept")).toBe("yes");
    }
  );

  it.each(["not json at all", '{"a":1}', ""])(
    "serves the endpoint anyway when the headers column reads %j",
    async (stored) => {
      const res = await serve({ response_headers: stored });

      expect(res.status).toBe(200);
      expect(res.headers.get("content-type")).toBe("application/json; charset=utf-8");
    }
  );
});

describe("what an author cannot take over", () => {
  it("sandboxes the response and turns off sniffing, whatever content type was picked", async () => {
    const res = await serve({
      response_headers: JSON.stringify([
        { name: "content-type", value: "text/html" },
        { name: "Content-Security-Policy", value: "default-src *" },
      ]),
    });

    expect(res.headers.get("content-type")).toBe("text/html");
    expect(res.headers.get("content-security-policy")).toBe("sandbox");
    expect(res.headers.get("x-content-type-options")).toBe("nosniff");
  });

  // A project answers on a host of its own, and that host serves no robots.txt: the rewrite hands
  // `/robots.txt` to this route like any other mock path, so the header is the only refusal left.
  it("refuses indexing, whatever the stored row asked for", async () => {
    const res = await serve({
      response_headers: JSON.stringify([{ name: "X-Robots-Tag", value: "all" }]),
    });

    expect(res.headers.get("x-robots-tag")).toBe("noindex");
  });

  it.each(["/login", "?step=2", `http://${MOCK_HOST}/login`])(
    "keeps a redirect to %s, which stays on the mock's own host",
    async (location) => {
      const res = await redirectTo(location);

      expect(res.status).toBe(302);
      expect(res.headers.get("location")).toBe(location);
    }
  );

  // Both slash spellings are ones a browser reads as a different host.
  it.each([
    "https://evil.example/login",
    "//evil.example/login",
    "/\\evil.example/login",
    `http://${MOCK_HOST}.evil.example/login`,
    "javascript:alert(1)",
  ])("drops a redirect to %s", async (location) => {
    const res = await redirectTo(location);

    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toBeNull();
  });

  it("keeps a Location off the host on a status a browser does not follow", async () => {
    const res = await redirectTo("https://elsewhere.example/users/1", STATUS_CODE.CREATED);

    expect(res.headers.get("location")).toBe("https://elsewhere.example/users/1");
  });
});
