jest.mock("@/server/services/mail/mail.service", () => ({
  __esModule: true,
  default: { sendForgotPasswordEmail: jest.fn() },
}));
jest.mock("@/server/services/user.service", () => ({
  __esModule: true,
  default: { getUserByEmail: jest.fn() },
}));
jest.mock("@/server/services/auth/token.service", () => ({
  __esModule: true,
  default: { createResetPasswordToken: jest.fn() },
}));

import MailService from "@/server/services/mail/mail.service";
import UserService from "@/server/services/user.service";
import TokenService from "@/server/services/auth/token.service";
import { POST } from "@/app/api/auth/password/forgot/route";
import { ERROR_MESSAGES, STATUS_CODE } from "@/server/core/constants";
import { createJsonRequest, expectSuccess, expectError } from "../../helpers/http";

describe("POST src/app/api/auth/password/forgot/route.ts", () => {
  it("returns 200 and does not leak information for non-existing user", async () => {
    (UserService.getUserByEmail as jest.Mock).mockResolvedValue(null);
    const res = await POST(createJsonRequest({ email: "x@example.com" }));
    await expectSuccess(res, 200);
    expect(MailService.sendForgotPasswordEmail).not.toHaveBeenCalled();
  });

  it("returns 200 and does not send mail for unverified user", async () => {
    (UserService.getUserByEmail as jest.Mock).mockResolvedValue({
      public_id: "aaaaaaaaaaaa",
      token_version: 0n,
      is_verified: false,
    });
    const res = await POST(createJsonRequest({ email: "x@example.com" }));
    await expectSuccess(res, 200);
    expect(MailService.sendForgotPasswordEmail).not.toHaveBeenCalled();
  });

  it("sends reset password email for verified user", async () => {
    (UserService.getUserByEmail as jest.Mock).mockResolvedValue({
      public_id: "aaaaaaaaaaaa",
      token_version: 2n,
      is_verified: true,
    });
    (TokenService.createResetPasswordToken as jest.Mock).mockResolvedValue("reset-token");

    const res = await POST(createJsonRequest({ email: "x@example.com" }));
    await expectSuccess(res, 200);
    expect(MailService.sendForgotPasswordEmail).toHaveBeenCalledWith({
      to: "x@example.com",
      token: "reset-token",
    });
  });

  it("returns 400 for invalid email", async () => {
    const res = await POST(createJsonRequest({ email: "not-an-email" }));
    await expectError(res, STATUS_CODE.BAD_REQUEST, ERROR_MESSAGES.VALIDATION_FAILED);
  });
});

