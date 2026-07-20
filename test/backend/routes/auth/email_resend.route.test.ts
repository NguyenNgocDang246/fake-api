jest.mock("@/server/services/mail/mail.service", () => ({
  __esModule: true,
  default: { sendVerificationEmail: jest.fn() },
}));
jest.mock("@/server/services/user.service", () => ({
  __esModule: true,
  default: { getUserByEmail: jest.fn() },
}));
jest.mock("@/server/services/auth/token.service", () => ({
  __esModule: true,
  default: { createVerifyEmailToken: jest.fn() },
}));

import MailService from "@/server/services/mail/mail.service";
import UserService from "@/server/services/user.service";
import TokenService from "@/server/services/auth/token.service";
import { POST } from "@/app/api/auth/email/resend/route";
import { ERROR_MESSAGES, STATUS_CODE } from "@/server/core/constants";
import { createJsonRequest, expectError, expectSuccess } from "../../helpers/http";

describe("POST src/app/api/auth/email/resend/route.ts", () => {
  it("returns 200 when user does not exist (no-op)", async () => {
    (UserService.getUserByEmail as jest.Mock).mockResolvedValue(null);
    const res = await POST(createJsonRequest({ email: "x@example.com" }));
    await expectSuccess(res, 200);
    expect(MailService.sendVerificationEmail).not.toHaveBeenCalled();
  });

  it("returns 200 when user already verified (no-op)", async () => {
    (UserService.getUserByEmail as jest.Mock).mockResolvedValue({
      public_id: "aaaaaaaaaaaa",
      token_version: 0n,
      is_verified: true,
    });
    const res = await POST(createJsonRequest({ email: "x@example.com" }));
    await expectSuccess(res, 200);
    expect(MailService.sendVerificationEmail).not.toHaveBeenCalled();
  });

  it("sends verification email when user unverified", async () => {
    (UserService.getUserByEmail as jest.Mock).mockResolvedValue({
      public_id: "aaaaaaaaaaaa",
      token_version: 2n,
      is_verified: false,
    });
    (TokenService.createVerifyEmailToken as jest.Mock).mockResolvedValue("verify-token");

    const res = await POST(createJsonRequest({ email: "x@example.com" }));
    await expectSuccess(res, 200);
    expect(MailService.sendVerificationEmail).toHaveBeenCalledWith({
      to: "x@example.com",
      token: "verify-token",
    });
  });

  it("returns 400 for invalid email", async () => {
    const res = await POST(createJsonRequest({ email: "bad" }));
    await expectError(res, STATUS_CODE.BAD_REQUEST, ERROR_MESSAGES.VALIDATION_FAILED);
  });
});

