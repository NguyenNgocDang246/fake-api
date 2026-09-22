jest.mock("@/server/middlewares/auth.middleware", () => ({
  __esModule: true,
  default: jest.fn(async () => null),
}));
jest.mock("@/server/middlewares/guest.middleware", () => ({
  __esModule: true,
  default: jest.fn(async () => null),
}));

import type { NextRequest } from "next/server";
import { NextURL } from "next/dist/server/web/next-url";
import { config, middleware } from "@/middleware";
import authMiddleware from "@/server/middlewares/auth.middleware";
import { PUBLIC_ID_ALPHABET, PUBLIC_ID_LENGTH } from "@/app/libs/helpers/publicId";
import { STATUS_CODE } from "@/server/core/constants";

const PROJECT_ID = "projectpubab";

function createRequest(host: string, pathname: string) {
  const url = new URL(`http://${host}${pathname}`);
  return {
    headers: new Headers({ host }),
    nextUrl: {
      pathname: url.pathname,
      search: url.search,
      clone: () => new URL(url.toString()),
    },
  } as unknown as NextRequest;
}

describe("src/middleware.ts", () => {
  it("routes `/api/fake/*` on a mock host to that host's project, not the one in the path", async () => {
    const res = await middleware(createRequest(`${PROJECT_ID}.localhost`, "/api/fake/otherprojec"));

    expect(res.headers.get("x-middleware-rewrite")).toContain(`/api/fake/${PROJECT_ID}`);
  });

  it("answers 404 for the fake route called directly on the apex, before the auth chain", async () => {
    const res = await middleware(createRequest("localhost", `/api/fake/${PROJECT_ID}`));

    expect(res.status).toBe(STATUS_CODE.NOT_FOUND);
    expect(authMiddleware).not.toHaveBeenCalled();
  });

  describe("a trailing slash", () => {
    // The real `NextURL`, because it remembers a trailing slash and formats it back on, which is
    // what turned an earlier version of this redirect into a loop.
    it("is redirected away on the apex, keeping the query", async () => {
      const req = {
        headers: new Headers({ host: "localhost" }),
        nextUrl: new NextURL("http://localhost/docs/?tab=1"),
      };
      const res = await middleware(req as unknown as NextRequest);

      expect(res.status).toBe(308);
      expect(res.headers.get("location")).toBe("http://localhost/docs?tab=1");
    });

    it("reaches the fake route on a mock host instead of being redirected", async () => {
      const res = await middleware(createRequest(`${PROJECT_ID}.localhost`, "/users/"));

      expect(res.headers.get("x-middleware-rewrite")).toContain(`/api/fake/${PROJECT_ID}`);
    });
  });

  // Next matches `has` against the hostname with the port cut off, anchored at both ends.
  describe("the mock host matcher", () => {
    const hostMatcher = config.matcher[1] as { has: { value: string }[] };
    const mockHost = new RegExp(`^(?:${hostMatcher.has[0]?.value ?? ""})$`);

    it.each([..."0123456789abcdefghijklmnopqrstuvwxyz"])(
      "agrees with the project alphabet on %s",
      (char) => {
        const host = `${char.repeat(PUBLIC_ID_LENGTH)}.fake-api.dev`;

        expect(mockHost.test(host)).toBe(PUBLIC_ID_ALPHABET.includes(char));
      }
    );

    it.each(["fake-api.dev", "localhost", `${"a".repeat(PUBLIC_ID_LENGTH - 1)}.fake-api.dev`])(
      "leaves %s to the static-path matcher",
      (host) => {
        expect(mockHost.test(host)).toBe(false);
      }
    );
  });
});
