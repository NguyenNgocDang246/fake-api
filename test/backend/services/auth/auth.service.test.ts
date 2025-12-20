jest.mock("@/server/services/user.service", () => ({
  __esModule: true,
  default: {
    getUserByEmail: jest.fn(),
    createUser: jest.fn(),
    verifyUserEmail: jest.fn(),
    getUserById: jest.fn(),
    updatePassword: jest.fn(),
  },
}));
jest.mock("@/server/services/mail/mail.service", () => ({
  __esModule: true,
  default: { sendVerificationEmail: jest.fn() },
}));
jest.mock("@/server/services/auth/hash.service", () => ({
  __esModule: true,
  hashPassword: jest.fn(),
  verifyPassword: jest.fn(),
}));
jest.mock("@/server/services/auth/token.service", () => ({
  __esModule: true,
  default: {
    createVerifyEmailToken: jest.fn(),
    createRefreshToken: jest.fn(),
    createAccessToken: jest.fn(),
  },
}));

import authService from "@/server/services/auth/auth.service";
import userService from "@/server/services/user.service";
import MailService from "@/server/services/mail/mail.service";
import tokenService from "@/server/services/auth/token.service";
import { hashPassword, verifyPassword } from "@/server/services/auth/hash.service";
import { AppError } from "@/server/core/errors";
import { AUTH_MESSAGES, STATUS_CODE } from "@/server/core/constants";

describe("src/server/services/auth/auth.service.ts", () => {
  describe("register", () => {
    it("throws when email duplicated", async () => {
      (userService.getUserByEmail as jest.Mock).mockResolvedValue({ id: 1n });
      await expect(
        authService.register({ name: "A", email: "a@b.com", password: "123456" })
      ).rejects.toMatchObject({
        statusCode: STATUS_CODE.BAD_REQUEST,
        message: AUTH_MESSAGES.EMAIL_DUPLICATED,
      });
    });

    it("hashes password and creates user", async () => {
      (userService.getUserByEmail as jest.Mock).mockResolvedValue(null);
      (hashPassword as jest.Mock).mockResolvedValue("hashed");
      (userService.createUser as jest.Mock).mockResolvedValue({ id: 1n });

      await authService.register({ name: "A", email: "a@b.com", password: "123456" });
      expect(hashPassword).toHaveBeenCalledWith("123456");
      expect(userService.createUser).toHaveBeenCalledWith({
        name: "A",
        email: "a@b.com",
        password: "hashed",
      });
    });
  });

  describe("login", () => {
    it("throws unauthorized when user not found", async () => {
      (userService.getUserByEmail as jest.Mock).mockResolvedValue(null);
      await expect(authService.login({ email: "a@b.com", password: "123456" })).rejects.toMatchObject(
        {
          statusCode: STATUS_CODE.UNAUTHORIZED,
          message: AUTH_MESSAGES.INVALID_CREDENTIALS,
        }
      );
    });

    it("sends verify email then throws forbidden when user not verified", async () => {
      (userService.getUserByEmail as jest.Mock).mockResolvedValue({
        id: 1n,
        email: "a@b.com",
        password: "hashed",
        is_verified: false,
        token_version: 2n,
      });
      (tokenService.createVerifyEmailToken as jest.Mock).mockResolvedValue("verify-token");
      (MailService.sendVerificationEmail as jest.Mock).mockResolvedValue(undefined);

      await expect(authService.login({ email: "a@b.com", password: "123456" })).rejects.toMatchObject(
        {
          statusCode: STATUS_CODE.FORBIDDEN,
          message: AUTH_MESSAGES.EMAIL_NOT_VERIFIED,
        }
      );
      expect(MailService.sendVerificationEmail).toHaveBeenCalled();
    });

    it("throws unauthorized when password invalid", async () => {
      (userService.getUserByEmail as jest.Mock).mockResolvedValue({
        id: 1n,
        email: "a@b.com",
        password: "hashed",
        is_verified: true,
        token_version: 2n,
      });
      (verifyPassword as jest.Mock).mockResolvedValue(false);

      await expect(authService.login({ email: "a@b.com", password: "123456" })).rejects.toMatchObject(
        {
          statusCode: STATUS_CODE.UNAUTHORIZED,
          message: AUTH_MESSAGES.INVALID_CREDENTIALS,
        }
      );
    });

    it("returns tokens when login succeeds", async () => {
      (userService.getUserByEmail as jest.Mock).mockResolvedValue({
        id: 1n,
        email: "a@b.com",
        password: "hashed",
        is_verified: true,
        token_version: 2n,
      });
      (verifyPassword as jest.Mock).mockResolvedValue(true);
      (tokenService.createRefreshToken as jest.Mock).mockResolvedValue("refresh");
      (tokenService.createAccessToken as jest.Mock).mockResolvedValue("access");

      await expect(authService.login({ email: "a@b.com", password: "123456" })).resolves.toEqual({
        access_token: "access",
        refresh_token: "refresh",
      });
    });

    it("wraps non-AppError into AppError", async () => {
      (userService.getUserByEmail as jest.Mock).mockRejectedValue(new Error("db down"));
      await expect(authService.login({ email: "a@b.com", password: "123456" })).rejects.toBeInstanceOf(
        AppError
      );
    });
  });

  describe("updatePassword", () => {
    it("throws NO_CONTENT when user not found (current behavior)", async () => {
      (userService.getUserById as jest.Mock).mockResolvedValue(null);
      await expect(authService.updatePassword({ id: 1n, password: "123456" })).rejects.toMatchObject({
        statusCode: STATUS_CODE.NO_CONTENT,
        message: AUTH_MESSAGES.USER_NOT_FOUND,
      });
    });
  });
});

