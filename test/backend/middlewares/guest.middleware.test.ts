jest.mock("@/server/services/guest.service", () => ({
  __esModule: true,
  default: { getGuestUser: jest.fn(async () => ({ id: 1n, public_id: "guestpubabcd" })) },
}));

import type { NextRequest, NextResponse } from "next/server";
import guestMiddleware from "@/server/middlewares/guest.middleware";
import { STATUS_CODE } from "@/server/core/constants";

// 12 chars each, and only characters `PUBLIC_ID_ALPHABET` actually contains.
const PROJECT_ID = "projectpubab";
const GROUP_ID = "grouppubabcd";
const ENDPOINT_ID = "endpointpub2";
const SCENARIO_ID = "scenariopub2";

function createRequest(pathname: string, headers: Record<string, string> = {}): NextRequest {
  const url = new URL(`http://localhost${pathname}`);
  return {
    headers: new Headers(headers),
    nextUrl: {
      pathname,
      clone: () => new URL(url.toString()),
    },
  } as unknown as NextRequest;
}

function rewrittenTo(res: NextResponse): string | null {
  return res.headers.get("x-middleware-rewrite");
}

function forwardedHeaders(res: NextResponse): Headers | undefined {
  return (res as NextResponse & { requestHeaders?: Headers }).requestHeaders;
}

describe("src/server/middlewares/guest.middleware.ts", () => {
  it("returns null for a path outside the guest prefix", async () => {
    await expect(guestMiddleware(createRequest("/api/project/x/y"))).resolves.toBeNull();
    await expect(guestMiddleware(createRequest("/docs"))).resolves.toBeNull();
  });

  it("rewrites the endpoint collection onto the real project route", async () => {
    const res = await guestMiddleware(
      createRequest(`/api/guest/project/${PROJECT_ID}/endpoint-group/${GROUP_ID}/endpoint`)
    );

    expect(rewrittenTo(res!)).toBe(
      `http://localhost/api/project/${PROJECT_ID}/endpoint-group/${GROUP_ID}/endpoint`
    );
  });

  it("rewrites a single endpoint onto the real project route", async () => {
    const res = await guestMiddleware(
      createRequest(
        `/api/guest/project/${PROJECT_ID}/endpoint-group/${GROUP_ID}/endpoint/${ENDPOINT_ID}`
      )
    );

    expect(rewrittenTo(res!)).toBe(
      `http://localhost/api/project/${PROJECT_ID}/endpoint-group/${GROUP_ID}/endpoint/${ENDPOINT_ID}`
    );
  });

  // A trial endpoint holds more than one scenario, so the visitor needs the one route that
  // switches which of them answers. It is the only path allowed past an endpoint id.
  it("rewrites a scenario activate onto the real project route", async () => {
    const res = await guestMiddleware(
      createRequest(
        `/api/guest/project/${PROJECT_ID}/endpoint-group/${GROUP_ID}/endpoint/${ENDPOINT_ID}/scenario/${SCENARIO_ID}/activate`
      )
    );

    expect(rewrittenTo(res!)).toBe(
      `http://localhost/api/project/${PROJECT_ID}/endpoint-group/${GROUP_ID}/endpoint/${ENDPOINT_ID}/scenario/${SCENARIO_ID}/activate`
    );
  });

  it("names the shared guest account on the forwarded request", async () => {
    const res = await guestMiddleware(
      createRequest(`/api/guest/project/${PROJECT_ID}/endpoint-group/${GROUP_ID}/endpoint`)
    );

    expect(forwardedHeaders(res!)?.get("x-userId")).toBe("guestpubabcd");
  });

  it("drops an x-userId the caller put on the wire", async () => {
    const res = await guestMiddleware(
      createRequest(`/api/guest/project/${PROJECT_ID}/endpoint-group/${GROUP_ID}/endpoint`, {
        "x-userId": "someoneElse",
        "x-role": "USER_VIP",
      })
    );

    expect(forwardedHeaders(res!)?.get("x-userId")).toBe("guestpubabcd");
    expect(forwardedHeaders(res!)?.get("x-role")).toBeNull();
  });

  it.each([
    ["a bare project", `/api/guest/project/${PROJECT_ID}`],
    ["the group collection", `/api/guest/project/${PROJECT_ID}/endpoint-group`],
    ["a bare group", `/api/guest/project/${PROJECT_ID}/endpoint-group/${GROUP_ID}`],
    [
      "anything past the endpoint id",
      `/api/guest/project/${PROJECT_ID}/endpoint-group/${GROUP_ID}/endpoint/${ENDPOINT_ID}/extra`,
    ],
    [
      "the ai-preview route",
      `/api/guest/project/${PROJECT_ID}/endpoint-group/${GROUP_ID}/endpoint/ai-preview`,
    ],
    [
      "a scenario that is not being activated",
      `/api/guest/project/${PROJECT_ID}/endpoint-group/${GROUP_ID}/endpoint/${ENDPOINT_ID}/scenario/${SCENARIO_ID}`,
    ],
    [
      "a scenario id that is not a public id",
      `/api/guest/project/${PROJECT_ID}/endpoint-group/${GROUP_ID}/endpoint/${ENDPOINT_ID}/scenario/x/activate`,
    ],
    [
      "anything past the activate segment",
      `/api/guest/project/${PROJECT_ID}/endpoint-group/${GROUP_ID}/endpoint/${ENDPOINT_ID}/scenario/${SCENARIO_ID}/activate/extra`,
    ],
    [
      "another verb on a scenario",
      `/api/guest/project/${PROJECT_ID}/endpoint-group/${GROUP_ID}/endpoint/${ENDPOINT_ID}/scenario/${SCENARIO_ID}/delete`,
    ],
    ["a project id that is not a public id", `/api/guest/project/x/endpoint-group/${GROUP_ID}/endpoint`],
    ["a group id that is not a public id", `/api/guest/project/${PROJECT_ID}/endpoint-group/x/endpoint`],
    ["a misspelled segment", `/api/guest/project/${PROJECT_ID}/endpoint-groups/${GROUP_ID}/endpoint`],
  ])("refuses %s with 404", async (_label, pathname) => {
    const res = await guestMiddleware(createRequest(pathname));

    expect(res?.status).toBe(STATUS_CODE.NOT_FOUND);
    expect(rewrittenTo(res!)).toBeNull();
  });
});
