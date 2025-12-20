jest.mock("@/server/services/auth/token.service", () => ({
  __esModule: true,
  default: { verifyVerifyEmailToken: jest.fn() },
}));
jest.mock("@/server/services/user.service", () => ({
  __esModule: true,
  default: { getUserById: jest.fn(), verifyUserEmail: jest.fn(), increaseTokenVersion: jest.fn() },
}));

import TokenService from "@/server/services/auth/token.service";
import UserService from "@/server/services/user.service";
import { POST } from "@/app/api/auth/email/verify/route";
import { STATUS_CODE, TOKEN_MESSAGE } from "@/server/core/constants";
import { createJsonRequest, expectError, expectSuccess } from "../../helpers/http";

describe("POST src/app/api/auth/email/verify/route.ts", () => {
  it("returns 400 if token missing", async () => {
    const res = await POST(createJsonRequest({}) as any);
    await expectError(res, STATUS_CODE.BAD_REQUEST, TOKEN_MESSAGE.INVALID_TOKEN);
  });

  it("returns 401 if token_version mismatch", async () => {
    (TokenService.verifyVerifyEmailToken as jest.Mock).mockResolvedValue({
      id: 1n,
      token_version: 1n,
    });
    (UserService.getUserById as jest.Mock).mockResolvedValue({
      id: 1n,
      token_version: 2n,
    });
    const res = await POST(createJsonRequest({ token: "t" }) as any);
    await expectError(res, STATUS_CODE.UNAUTHORIZED, TOKEN_MESSAGE.INVALID_TOKEN);
  });

  it("verifies email and increases token version on success", async () => {
    (TokenService.verifyVerifyEmailToken as jest.Mock).mockResolvedValue({
      id: 1n,
      token_version: 1n,
    });
    (UserService.getUserById as jest.Mock).mockResolvedValue({
      id: 1n,
      token_version: 1n,
    });

    const res = await POST(createJsonRequest({ token: "t" }) as any);
    await expectSuccess(res, 200);
    expect(UserService.verifyUserEmail).toHaveBeenCalledWith({ id: 1n });
    expect(UserService.increaseTokenVersion).toHaveBeenCalledWith({ id: 1n });
  });
});

