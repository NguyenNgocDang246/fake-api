jest.mock("@/server/services/auth/auth.service", () => ({
  __esModule: true,
  default: { register: jest.fn() },
}));
jest.mock("@/server/services/user.service", () => ({
  __esModule: true,
  default: { getUserByEmail: jest.fn() },
}));
jest.mock("@/server/services/mail/mail.service", () => ({
  __esModule: true,
  default: { sendVerificationEmail: jest.fn() },
}));
jest.mock("@/server/services/auth/token.service", () => ({
  __esModule: true,
  default: { createVerifyEmailToken: jest.fn() },
}));

import authService from "@/server/services/auth/auth.service";
import UserService from "@/server/services/user.service";
import MailService from "@/server/services/mail/mail.service";
import TokenService from "@/server/services/auth/token.service";
import { POST } from "@/app/api/auth/register/route";
import { AUTH_MESSAGES, ERROR_MESSAGES, STATUS_CODE } from "@/server/core/constants";
import { createJsonRequest, expectError, expectSuccess, readJson } from "../../helpers/http";

describe("POST src/app/api/auth/register/route.ts", () => {
  it("registers user, sends verification email, returns user info", async () => {
    (UserService.getUserByEmail as jest.Mock).mockResolvedValue(null);
    (authService.register as jest.Mock).mockResolvedValue({
      public_id: "aaaaaaaaaaaa",
      token_version: 0n,
      name: "Alice",
      email: "alice@example.com",
      password: "hashed",
      is_verified: false,
    });
    (TokenService.createVerifyEmailToken as jest.Mock).mockResolvedValue("verify-token");
    (MailService.sendVerificationEmail as jest.Mock).mockResolvedValue(undefined);

    const res = await POST(
      createJsonRequest({
        name: "Alice",
        email: "alice@example.com",
        password: "123456",
      })
    );

    await expectSuccess(res, 200);
    const body = await readJson(res);
    expect(body.data).toMatchObject({ name: "Alice", email: "alice@example.com" });
    expect(typeof body.data.public_id).toBe("string");
    expect(MailService.sendVerificationEmail).toHaveBeenCalledWith({
      to: "alice@example.com",
      token: "verify-token",
    });
  });

  it("returns 409 when email already exists", async () => {
    (UserService.getUserByEmail as jest.Mock).mockResolvedValue({ id: 2n });
    const res = await POST(
      createJsonRequest({
        name: "Alice",
        email: "alice@example.com",
        password: "123456",
      })
    );
    await expectError(res, STATUS_CODE.CONFLICT, AUTH_MESSAGES.EMAIL_DUPLICATED);
  });

  it("returns 400 on validation error (extra field due to strict)", async () => {
    const res = await POST(
      createJsonRequest({
        name: "Alice",
        email: "alice@example.com",
        password: "123456",
        foo: "bar",
      })
    );
    await expectError(res, STATUS_CODE.BAD_REQUEST, ERROR_MESSAGES.VALIDATION_FAILED);
  });

  it("returns 400 if output UserInfo validation fails", async () => {
    (UserService.getUserByEmail as jest.Mock).mockResolvedValue(null);
    (authService.register as jest.Mock).mockResolvedValue({
      public_id: "aaaaaaaaaaaa",
      token_version: 0n,
      name: "",
      email: "alice@example.com",
      password: "hashed",
      is_verified: false,
    });
    (TokenService.createVerifyEmailToken as jest.Mock).mockResolvedValue("verify-token");
    (MailService.sendVerificationEmail as jest.Mock).mockResolvedValue(undefined);

    const res = await POST(
      createJsonRequest({
        name: "Alice",
        email: "alice@example.com",
        password: "123456",
      })
    );
    await expectError(res, STATUS_CODE.BAD_REQUEST, ERROR_MESSAGES.VALIDATION_FAILED);
  });
});

