const generateAuthUrl = jest.fn();
jest.mock("@/app/api/auth/google/google.OAuth2", () => ({
  __esModule: true,
  getOauth2Client: () => ({ generateAuthUrl }),
}));

import { GET } from "@/app/api/auth/google/route";
import { ERROR_MESSAGES, STATUS_CODE } from "@/server/core/constants";
import { expectError, expectSuccess, readJson } from "../../helpers/http";

describe("GET src/app/api/auth/google/route.ts", () => {
  it("returns url from oauth2Client.generateAuthUrl", async () => {
    generateAuthUrl.mockReturnValue("http://google/auth");
    const res = await GET();
    await expectSuccess(res, 200);
    const body = await readJson(res);
    expect(body.data).toEqual({ url: "http://google/auth" });
  });

  it("returns 500 if oauth2Client throws", async () => {
    generateAuthUrl.mockImplementation(() => {
      throw new Error("boom");
    });
    const res = await GET();
    await expectError(res, STATUS_CODE.SERVER_ERROR, ERROR_MESSAGES.SERVER_ERROR);
  });
});
