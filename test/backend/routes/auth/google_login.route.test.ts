const generateAuthUrl = jest.fn();
jest.mock("@/app/api/auth/google/google.OAuth2", () => ({
  __esModule: true,
  getOauth2Client: () => ({ generateAuthUrl }),
}));

import { GET } from "@/app/api/auth/google/route";
import { ERROR_MESSAGES, OAUTH_STATE_COOKIE, STATUS_CODE } from "@/server/core/constants";
import { expectError, expectSuccess, readJson } from "../../helpers/http";

describe("GET src/app/api/auth/google/route.ts", () => {
  it("returns url from oauth2Client.generateAuthUrl", async () => {
    generateAuthUrl.mockReturnValue("http://google/auth");
    const res = await GET();
    await expectSuccess(res, 200);
    const body = await readJson(res);
    expect(body.data).toEqual({ url: "http://google/auth" });
  });

  it("sends a state to Google and stores the same value in a cookie", async () => {
    generateAuthUrl.mockReturnValue("http://google/auth");
    const res = await GET();
    await expectSuccess(res, 200);

    const state = generateAuthUrl.mock.calls[0]?.[0]?.state;
    expect(typeof state).toBe("string");
    expect(state).not.toHaveLength(0);

    const setCookie = res.headers.get("Set-Cookie") ?? "";
    expect(setCookie).toContain(`${OAUTH_STATE_COOKIE}=${state}`);
    expect(setCookie).toContain("HttpOnly");
  });

  it("returns 500 if oauth2Client throws", async () => {
    generateAuthUrl.mockImplementation(() => {
      throw new Error("boom");
    });
    const res = await GET();
    await expectError(res, STATUS_CODE.SERVER_ERROR, ERROR_MESSAGES.SERVER_ERROR);
  });
});
