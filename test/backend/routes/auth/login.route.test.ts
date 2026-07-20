jest.mock("@/server/services/auth/auth.service", () => ({
  __esModule: true,
  default: { login: jest.fn() },
}));

import authService from "@/server/services/auth/auth.service";
import { AppError } from "@/server/core/errors";
import { ERROR_MESSAGES, STATUS_CODE } from "@/server/core/constants";
import { POST } from "@/app/api/auth/login/route";
import { createJsonRequest, createThrowingJsonRequest, expectError, expectSuccess } from "../../helpers/http";

describe("POST src/app/api/auth/login/route.ts", () => {
  it("returns 200 and sets cookies", async () => {
    (authService.login as jest.Mock).mockResolvedValue({
      access_token: "access",
      refresh_token: "refresh",
    });

    const res = await POST(
      createJsonRequest({ email: "a@b.com", password: "123456" })
    );

    await expectSuccess(res, 200);
    const setCookie = res.headers.get("Set-Cookie") ?? "";
    expect(setCookie).toContain("access_token=access");
    expect(setCookie).toContain("Path=/");
    expect(setCookie).toContain("refresh_token=refresh");
    expect(setCookie).toContain("Path=/api/auth/refresh-token");
  });

  it("returns 400 on validation error (missing fields)", async () => {
    const res = await POST(createJsonRequest({ email: "a@b.com" }));
    await expectError(res, STATUS_CODE.BAD_REQUEST, ERROR_MESSAGES.VALIDATION_FAILED);
  });

  it("returns 500 when req.json throws", async () => {
    const res = await POST(createThrowingJsonRequest());
    await expectError(res, STATUS_CODE.SERVER_ERROR, ERROR_MESSAGES.SERVER_ERROR);
  });

  it("maps AppError from service", async () => {
    (authService.login as jest.Mock).mockRejectedValue(
      new AppError({ statusCode: STATUS_CODE.UNAUTHORIZED, message: "nope" })
    );
    const res = await POST(
      createJsonRequest({ email: "a@b.com", password: "123456" })
    );
    await expectError(res, STATUS_CODE.UNAUTHORIZED, "nope");
  });
});
