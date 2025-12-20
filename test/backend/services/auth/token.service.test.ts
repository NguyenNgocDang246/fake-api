jest.mock("jose", () => {
  class SignJWTMock {
    #payload: Record<string, unknown>;
    constructor(payload: Record<string, unknown>) {
      this.#payload = payload;
    }
    setProtectedHeader() {
      return this;
    }
    setExpirationTime() {
      return this;
    }
    async sign() {
      return `token:${JSON.stringify(this.#payload)}`;
    }
  }

  const jwtVerify = jest.fn(async (token: string) => {
    if (token === "throw") throw new Error("bad token");
    if (!token.startsWith("token:")) throw new Error("bad token");
    const payload = JSON.parse(token.slice("token:".length));
    return { payload };
  });

  return { __esModule: true, SignJWT: SignJWTMock, jwtVerify };
});

import tokenService from "@/server/services/auth/token.service";
import IdConverter from "@/app/libs/helpers/idConverter";
import { STATUS_CODE, TOKEN_MESSAGE } from "@/server/core/constants";
import { jwtVerify } from "jose";

describe("src/server/services/auth/token.service.ts", () => {
  it("createAccessToken returns a string token", async () => {
    const token = await tokenService.createAccessToken({ id: 1n });
    expect(token).toContain("token:");
  });

  it("verifyAccessToken decodes public_id to id", async () => {
    const public_id = IdConverter.encode(1n);
    const token = `token:${JSON.stringify({ public_id })}`;
    await expect(tokenService.verifyAccessToken(token)).resolves.toEqual({ id: 1n });
  });

  it("verifyAccessToken throws 401 invalid/expired for invalid token", async () => {
    await expect(tokenService.verifyAccessToken("throw")).rejects.toMatchObject({
      statusCode: STATUS_CODE.UNAUTHORIZED,
      message: TOKEN_MESSAGE.INVALID_EXPIRED_TOKEN,
    });
  });

  it("verifyRefreshToken parses token_version into BigInt", async () => {
    const public_id = IdConverter.encode(1n);
    const token = `token:${JSON.stringify({ public_id, token_version: "2" })}`;
    await expect(tokenService.verifyRefreshToken(token)).resolves.toEqual({
      id: 1n,
      token_version: 2n,
    });
  });

  it("verifyRefreshToken wraps invalid token into default AppError", async () => {
    await expect(tokenService.verifyRefreshToken("throw")).rejects.toMatchObject({
      statusCode: STATUS_CODE.SERVER_ERROR,
    });
  });

  it("verifyResetPasswordToken throws 401 invalid/expired for invalid token", async () => {
    await expect(tokenService.verifyResetPasswordToken("throw")).rejects.toMatchObject({
      statusCode: STATUS_CODE.UNAUTHORIZED,
      message: TOKEN_MESSAGE.INVALID_EXPIRED_TOKEN,
    });
  });

  it("delegates jwtVerify to jose", async () => {
    const public_id = IdConverter.encode(1n);
    const token = `token:${JSON.stringify({ public_id })}`;
    await tokenService.verifyAccessToken(token);
    expect(jwtVerify).toHaveBeenCalled();
  });
});

