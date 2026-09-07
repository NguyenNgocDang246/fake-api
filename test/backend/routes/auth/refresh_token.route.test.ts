jest.mock("@/server/services/auth/token.service", () => ({
  __esModule: true,
  default: { verifyRefreshToken: jest.fn(), createAccessToken: jest.fn() },
}));
jest.mock("@/server/services/user.service", () => ({
  __esModule: true,
  default: { getUserById: jest.fn() },
}));

import tokenService from "@/server/services/auth/token.service";
import userService from "@/server/services/user.service";
import { GET } from "@/app/api/auth/refresh-token/route";
import { ERROR_MESSAGES, STATUS_CODE } from "@/server/core/constants";
import { TOKEN_MESSAGE } from "@/server/services/auth/auth.constants";
import { AppError } from "@/server/core/errors";
import { expectError, expectSuccess } from "../../helpers/http";

describe("GET src/app/api/auth/refresh-token/route.ts", () => {
  const setCookies = async (entries: Record<string, string>) => {
    const headersModule = (await import("next/headers")) as unknown as {
      __setMockCookies: (entries: Record<string, string>) => void;
    };
    headersModule.__setMockCookies(entries);
  };

  it("returns 400 if refresh_token cookie is missing", async () => {
    await setCookies({});
    const res = await GET();
    await expectError(res, STATUS_CODE.BAD_REQUEST, TOKEN_MESSAGE.INVALID_REFRESH_TOKEN);
  });

  it("returns 200 and sets access_token cookie when refresh token is valid", async () => {
    await setCookies({ refresh_token: "rt" });
    (tokenService.verifyRefreshToken as jest.Mock).mockResolvedValue({
      public_id: "aaaaaaaaaaaa",
      token_version: 2n,
    });
    (userService.getUserById as jest.Mock).mockResolvedValue({
      public_id: "aaaaaaaaaaaa",
      token_version: 2n,
    });
    (tokenService.createAccessToken as jest.Mock).mockResolvedValue("access");

    const res = await GET();
    await expectSuccess(res, 200);
    const setCookie = res.headers.get("Set-Cookie") ?? "";
    expect(setCookie).toContain("access_token=access");
    expect(setCookie).toContain("Path=/");
  });

  it("returns 401 when token_version mismatches", async () => {
    await setCookies({ refresh_token: "rt" });
    (tokenService.verifyRefreshToken as jest.Mock).mockResolvedValue({
      public_id: "aaaaaaaaaaaa",
      token_version: 2n,
    });
    (userService.getUserById as jest.Mock).mockResolvedValue({
      public_id: "aaaaaaaaaaaa",
      token_version: 3n,
    });

    const res = await GET();
    await expectError(res, STATUS_CODE.UNAUTHORIZED, TOKEN_MESSAGE.INVALID_EXPIRED_REFRESH_TOKEN);
  });

  it("maps AppError thrown by service", async () => {
    await setCookies({ refresh_token: "rt" });
    (tokenService.verifyRefreshToken as jest.Mock).mockRejectedValue(
      new AppError({ statusCode: STATUS_CODE.UNAUTHORIZED, message: "bad token" })
    );
    const res = await GET();
    await expectError(res, STATUS_CODE.UNAUTHORIZED, "bad token");
  });

  it("returns 500 on unexpected error", async () => {
    await setCookies({ refresh_token: "rt" });
    (tokenService.verifyRefreshToken as jest.Mock).mockRejectedValue(new Error("boom"));
    const res = await GET();
    await expectError(res, STATUS_CODE.SERVER_ERROR, ERROR_MESSAGES.SERVER_ERROR);
  });
});

