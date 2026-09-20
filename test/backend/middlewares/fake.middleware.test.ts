import type { NextRequest, NextResponse } from "next/server";
import fakeMiddleware from "@/server/middlewares/fake.middleware";
import { ERROR_MESSAGES, STATUS_CODE } from "@/server/core/constants";

// `jest.setup.ts` sets DOMAIN to http://localhost, so a mock answers on `{id}.localhost`.
const PROJECT_ID = "projectpubab";

function createRequest(host: string, path = "/users", headers: Record<string, string> = {}) {
  const url = new URL(`http://${host}${path}`);
  return {
    headers: new Headers({ host, ...headers }),
    nextUrl: {
      pathname: url.pathname,
      search: url.search,
      clone: () => new URL(url.toString()),
    },
  } as unknown as NextRequest;
}

function rewrittenTo(res: NextResponse): string | null {
  return res.headers.get("x-middleware-rewrite");
}

describe("src/server/middlewares/fake.middleware.ts", () => {
  describe("hosts that are not a mock", () => {
    it("lets the apex through", () => {
      expect(fakeMiddleware(createRequest("localhost", "/docs"))).toBeNull();
    });

    // A preview deployment answers on a host outside the wildcard, and the app has to keep
    // working there even though no mock can.
    it("lets a host outside the wildcard through", () => {
      expect(fakeMiddleware(createRequest("fake-api-git-x.vercel.app", "/docs"))).toBeNull();
    });

    it("does not treat a host merely ending in the same letters as a subdomain", () => {
      expect(fakeMiddleware(createRequest("notlocalhost", "/docs"))).toBeNull();
    });

    // The app's own API and the guest proxy answer on the apex, and both sit behind this branch.
    it("leaves the app's own API alone", () => {
      expect(fakeMiddleware(createRequest("localhost", "/api/project"))).toBeNull();
      expect(fakeMiddleware(createRequest("localhost", "/api/guest/sandbox"))).toBeNull();
    });

    it.each(["localhost", "fake-api-git-x.vercel.app"])(
      "answers 404 for the fake route called directly on %s",
      (host) => {
        const res = fakeMiddleware(createRequest(host, `/api/fake/${PROJECT_ID}`));

        expect(res!.status).toBe(STATUS_CODE.NOT_FOUND);
      }
    );

    it("does not take a port DOMAIN does not name for the same host", () => {
      expect(fakeMiddleware(createRequest(`${PROJECT_ID}.localhost:3000`))).toBeNull();
    });

    // A missing Host header must not be read as a match on the suffix.
    it("returns null when no host header arrived at all", () => {
      const req = { headers: new Headers(), nextUrl: { pathname: "/", search: "" } };
      expect(fakeMiddleware(req as unknown as NextRequest)).toBeNull();
    });
  });

  describe("a project subdomain", () => {
    it("rewrites onto the fake route, keeping the path and query on the URL", () => {
      const res = fakeMiddleware(createRequest(`${PROJECT_ID}.localhost`, "/users?active=true"));

      expect(rewrittenTo(res!)).toBe(`http://${PROJECT_ID}.localhost/api/fake/${PROJECT_ID}?active=true`);
    });

    it("reads the host case-insensitively", () => {
      const res = fakeMiddleware(createRequest(`${PROJECT_ID.toUpperCase()}.LOCALHOST`));

      expect(rewrittenTo(res!)).toContain(`/api/fake/${PROJECT_ID}`);
    });

    it.each([
      ["a trailing dot", `${PROJECT_ID}.localhost.`],
      ["a default port", `${PROJECT_ID}.localhost:443`],
    ])("still recognizes the host written with %s", (_label, host) => {
      expect(rewrittenTo(fakeMiddleware(createRequest(host))!)).toContain(`/api/fake/${PROJECT_ID}`);
    });

    it("prefers x-forwarded-host over host", () => {
      const req = createRequest("localhost", "/users", {
        "x-forwarded-host": `${PROJECT_ID}.localhost`,
      });

      expect(rewrittenTo(fakeMiddleware(req)!)).toContain(`/api/fake/${PROJECT_ID}`);
    });

    // The app's API is not reachable from a mock host: that path is just a path the project has
    // no endpoint for, so it 404s as a mock instead of running the real handler.
    it("claims the whole path, the app's own API routes included", () => {
      const res = fakeMiddleware(createRequest(`${PROJECT_ID}.localhost`, "/api/project"));

      expect(rewrittenTo(res!)).toContain(`/api/fake/${PROJECT_ID}`);
    });

    it("takes only the first host when a proxy chained them", () => {
      const req = createRequest("localhost", "/users", {
        "x-forwarded-host": `${PROJECT_ID}.localhost, other.localhost`,
      });

      expect(rewrittenTo(fakeMiddleware(req)!)).toContain(`/api/fake/${PROJECT_ID}`);
    });
  });

  // The whole point of the host branch: a subdomain never falls through to the app, so a label
  // naming no project answers like a mock that does not exist rather than serving a page. `www`
  // is in the list on purpose: sending a vanity host back to the app is the DNS layer's job.
  describe("a subdomain that names no project", () => {
    it.each([
      ["a word", "docs"],
      ["www", "www"],
      ["one character short", "projectpuba"],
      ["a character outside the alphabet", "projectpub0l"],
      ["more than one label", "a.b"],
    ])("answers 404 for %s", async (_label, sub) => {
      const res = fakeMiddleware(createRequest(`${sub}.localhost`));

      expect(res!.status).toBe(STATUS_CODE.NOT_FOUND);
      expect(await res!.json()).toMatchObject({
        status: "error",
        message: ERROR_MESSAGES.NOT_FOUND,
      });
    });
  });
});
