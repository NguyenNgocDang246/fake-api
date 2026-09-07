// Pinned before the route module reads it, so this spec does not move when the shipped
// allowance changes.
process.env["GUEST_RATE_LIMIT_CALLS"] = "3";
process.env["GUEST_RATE_LIMIT_WINDOW_SECONDS"] = "3600";

jest.mock("@/server/services/guest.service", () => ({
  __esModule: true,
  default: { createSandbox: jest.fn() },
}));

import type { NextRequest } from "next/server";
import { POST } from "@/app/api/guest/sandbox/route";
import guestService from "@/server/services/guest.service";
import { createHeaders, expectError, expectSuccess, readJson } from "../../helpers/http";
import { STATUS_CODE } from "@/server/core/constants";
import { GUEST_MESSAGES } from "@/server/services/guest.constants";
import { AppError } from "@/server/core/errors";

const SANDBOX = { project_id: "projectPubAB", endpoint_group_id: "groupPubABCD" };

function createRequest(ip?: string): NextRequest {
  return {
    headers: createHeaders(ip === undefined ? {} : { "x-forwarded-for": ip }),
  } as unknown as NextRequest;
}

describe("src/app/api/guest/sandbox/route.ts", () => {
  beforeEach(() => {
    (guestService.createSandbox as jest.Mock).mockResolvedValue(SANDBOX);
  });

  it("returns the sandbox ids and sets no cookie", async () => {
    const res = await POST(createRequest("203.0.113.1"));

    await expectSuccess(res);
    expect((await readJson(res)).data).toEqual(SANDBOX);
    expect(res.headers.get("Set-Cookie")).toBeNull();
  });

  it("takes the first entry of a forwarded chain as the key", async () => {
    // Everything after the first hop is added by proxies and can be forged by the caller.
    await POST(createRequest("203.0.113.9, 10.0.0.1, 10.0.0.2"));
    await expect(POST(createRequest("203.0.113.9"))).resolves.toBeDefined();
    expect(guestService.createSandbox).toHaveBeenCalledTimes(2);
  });

  it("refuses once one address has asked too often", async () => {
    const ip = "198.51.100.7";
    for (let i = 0; i < 3; i++) await POST(createRequest(ip));

    await expectError(
      await POST(createRequest(ip)),
      STATUS_CODE.TOO_MANY_REQUESTS,
      GUEST_MESSAGES.TOO_MANY_SANDBOXES
    );
  });

  it("passes an AppError from the service through", async () => {
    (guestService.createSandbox as jest.Mock).mockRejectedValue(
      new AppError({ message: "nope", statusCode: STATUS_CODE.BAD_REQUEST })
    );

    await expectError(await POST(createRequest("192.0.2.5")), STATUS_CODE.BAD_REQUEST, "nope");
  });

  it("turns an unexpected error into the generic server error", async () => {
    (guestService.createSandbox as jest.Mock).mockRejectedValue(new Error("boom"));

    await expectError(await POST(createRequest("192.0.2.6")), STATUS_CODE.SERVER_ERROR);
  });
});
