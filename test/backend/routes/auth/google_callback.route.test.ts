jest.mock("googleapis", () => ({
  __esModule: true,
  google: {
    oauth2: jest.fn(() => ({
      userinfo: { get: jest.fn() },
    })),
  },
}));
const getToken = jest.fn();
const setCredentials = jest.fn();
jest.mock("@/app/api/auth/google/google.OAuth2", () => ({
  __esModule: true,
  getOauth2Client: () => ({ getToken, setCredentials }),
}));
jest.mock("@/server/services/user.service", () => ({
  __esModule: true,
  default: { getUserByEmail: jest.fn() },
}));
jest.mock("@/server/services/auth/auth.service", () => ({
  __esModule: true,
  default: { registerWithGoogle: jest.fn(), loginWithGoogle: jest.fn() },
}));

import { google } from "googleapis";
import UserService from "@/server/services/user.service";
import AuthService from "@/server/services/auth/auth.service";
import { GET } from "@/app/api/auth/google/callback/route";
import { GOOGLE_AUTH_MESSAGES, STATUS_CODE } from "@/server/core/constants";
import { PAGE_ROUTES } from "@/app/libs/routes";
import { expectError } from "../../helpers/http";

describe("GET src/app/api/auth/google/callback/route.ts", () => {
  let userinfoGet: jest.Mock;

  beforeEach(() => {
    getToken.mockResolvedValue({ tokens: { access_token: "x" } });
    setCredentials.mockReturnValue(undefined);
    userinfoGet = jest.fn();
    (google.oauth2 as jest.Mock).mockImplementation(() => ({
      userinfo: { get: userinfoGet },
    }));
  });

  it("returns 400 if code is missing", async () => {
    const res = await GET(new Request("http://localhost/api/auth/google/callback") as any);
    await expectError(res, STATUS_CODE.BAD_REQUEST, GOOGLE_AUTH_MESSAGES.NO_CODE);
  });

  it("returns 400 if email missing", async () => {
    userinfoGet.mockResolvedValue({ data: { email: null, name: "Alice" } });
    const res = await GET(
      new Request("http://localhost/api/auth/google/callback?code=abc") as any
    );
    await expectError(res, STATUS_CODE.BAD_REQUEST, GOOGLE_AUTH_MESSAGES.NO_EMAIL);
  });

  it("registers new user then redirects and sets cookies", async () => {
    userinfoGet.mockResolvedValue({ data: { email: "a@b.com", name: "Alice" } });
    (UserService.getUserByEmail as jest.Mock).mockResolvedValue(null);
    (AuthService.registerWithGoogle as jest.Mock).mockResolvedValue(undefined);
    (AuthService.loginWithGoogle as jest.Mock).mockResolvedValue({
      access_token: "access",
      refresh_token: "refresh",
    });

    const res: any = await GET(
      new Request("http://localhost/api/auth/google/callback?code=abc") as any
    );
    expect(res.status).toBe(307);
    expect(res.headers.get("Location")).toContain(PAGE_ROUTES.PROJECT);
    const setCookie = res.headers.get("Set-Cookie") ?? "";
    expect(setCookie).toContain("access_token=access");
    expect(setCookie).toContain("refresh_token=refresh");
  });
});
