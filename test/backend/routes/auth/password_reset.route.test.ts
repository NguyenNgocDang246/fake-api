jest.mock("@/server/services/auth/token.service", () => ({
  __esModule: true,
  default: { verifyResetPasswordToken: jest.fn() },
}));
jest.mock("@/server/services/user.service", () => ({
  __esModule: true,
  default: { getUserById: jest.fn(), increaseTokenVersion: jest.fn() },
}));
jest.mock("@/server/services/auth/auth.service", () => ({
  __esModule: true,
  default: { updatePassword: jest.fn() },
}));

import TokenService from "@/server/services/auth/token.service";
import UserService from "@/server/services/user.service";
import AuthService from "@/server/services/auth/auth.service";
import { POST } from "@/app/api/auth/password/reset/route";
import { ERROR_MESSAGES, STATUS_CODE, TOKEN_MESSAGE } from "@/server/core/constants";
import { createJsonRequest, expectError, expectSuccess } from "../../helpers/http";

describe("POST src/app/api/auth/password/reset/route.ts", () => {
  it("returns 400 if token is missing", async () => {
    const res = await POST(createJsonRequest({ password: "123456" }) as any);
    await expectError(res, STATUS_CODE.BAD_REQUEST, TOKEN_MESSAGE.INVALID_TOKEN);
  });

  it("returns 401 if user is missing", async () => {
    const consoleSpy = jest.spyOn(console, "log").mockImplementation(() => {});
    (TokenService.verifyResetPasswordToken as jest.Mock).mockResolvedValue({
      id: 1n,
      token_version: 1n,
    });
    (UserService.getUserById as jest.Mock).mockResolvedValue(null);

    const res = await POST(
      createJsonRequest({ token: "t", password: "123456" }) as any
    );
    await expectError(res, STATUS_CODE.UNAUTHORIZED, TOKEN_MESSAGE.INVALID_TOKEN);
    consoleSpy.mockRestore();
  });

  it("returns 200 and clears cookies on success", async () => {
    (TokenService.verifyResetPasswordToken as jest.Mock).mockResolvedValue({
      id: 1n,
      token_version: 1n,
    });
    (UserService.getUserById as jest.Mock).mockResolvedValue({
      id: 1n,
      token_version: 1n,
    });
    (AuthService.updatePassword as jest.Mock).mockResolvedValue(undefined);
    (UserService.increaseTokenVersion as jest.Mock).mockResolvedValue(undefined);

    const res = await POST(
      createJsonRequest({ token: "t", password: "123456" }) as any
    );
    await expectSuccess(res, 200);
    const setCookie = res.headers.get("Set-Cookie") ?? "";
    expect(setCookie).toContain("access_token=");
    expect(setCookie).toContain("Max-Age=0");
    expect(setCookie).toContain("refresh_token=");
  });

  it("returns 400 for invalid password", async () => {
    (TokenService.verifyResetPasswordToken as jest.Mock).mockResolvedValue({
      id: 1n,
      token_version: 1n,
    });
    (UserService.getUserById as jest.Mock).mockResolvedValue({
      id: 1n,
      token_version: 1n,
    });

    const res = await POST(createJsonRequest({ token: "t", password: "1" }) as any);
    await expectError(res, STATUS_CODE.BAD_REQUEST, ERROR_MESSAGES.VALIDATION_FAILED);
  });
});
