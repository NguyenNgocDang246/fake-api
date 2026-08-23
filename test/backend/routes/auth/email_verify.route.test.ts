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
import { STATUS_CODE } from "@/server/core/constants";
import { TOKEN_MESSAGE } from "@/server/services/auth/auth.constants";
import { createJsonRequest, expectError, expectSuccess } from "../../helpers/http";

describe("POST src/app/api/auth/email/verify/route.ts", () => {
  it("returns 400 if token missing", async () => {
    const res = await POST(createJsonRequest({}));
    await expectError(res, STATUS_CODE.BAD_REQUEST, TOKEN_MESSAGE.INVALID_TOKEN);
  });

  it("returns 401 if token_version mismatch", async () => {
    (TokenService.verifyVerifyEmailToken as jest.Mock).mockResolvedValue({
      public_id: "aaaaaaaaaaaa",
      token_version: 1n,
    });
    (UserService.getUserById as jest.Mock).mockResolvedValue({
      public_id: "aaaaaaaaaaaa",
      token_version: 2n,
    });
    const res = await POST(createJsonRequest({ token: "t" }));
    await expectError(res, STATUS_CODE.UNAUTHORIZED, TOKEN_MESSAGE.INVALID_TOKEN);
  });

  it("verifies email and increases token version on success", async () => {
    (TokenService.verifyVerifyEmailToken as jest.Mock).mockResolvedValue({
      public_id: "aaaaaaaaaaaa",
      token_version: 1n,
    });
    (UserService.getUserById as jest.Mock).mockResolvedValue({
      public_id: "aaaaaaaaaaaa",
      token_version: 1n,
    });

    const res = await POST(createJsonRequest({ token: "t" }));
    await expectSuccess(res, 200);
    expect(UserService.verifyUserEmail).toHaveBeenCalledWith({ public_id: "aaaaaaaaaaaa" });
    expect(UserService.increaseTokenVersion).toHaveBeenCalledWith({
      public_id: "aaaaaaaaaaaa",
    });
  });
});

