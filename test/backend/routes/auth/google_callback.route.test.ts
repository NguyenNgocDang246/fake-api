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
import { STATUS_CODE } from "@/server/core/constants";
import { GOOGLE_AUTH_MESSAGES, OAUTH_STATE_COOKIE } from "@/server/services/auth/auth.constants";
import { PAGE_ROUTES } from "@/app/libs/routes";
import { expectError } from "../../helpers/http";

const STATE = "state-123";

function callbackRequest({
  code = "abc",
  state = STATE,
  cookieState = STATE,
}: { code?: string | null; state?: string | null; cookieState?: string | null } = {}) {
  const params = new URLSearchParams();
  if (code !== null) params.set("code", code);
  if (state !== null) params.set("state", state);
  const init =
    cookieState === null
      ? undefined
      : { headers: { cookie: `${OAUTH_STATE_COOKIE}=${cookieState}` } };
  return new Request(`http://localhost/api/auth/google/callback?${params.toString()}`, init);
}

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
    const res = await GET(callbackRequest({ code: null }));
    await expectError(res, STATUS_CODE.BAD_REQUEST, GOOGLE_AUTH_MESSAGES.NO_CODE);
  });

  it("returns 400 if state is missing from the query", async () => {
    const res = await GET(callbackRequest({ state: null }));
    await expectError(res, STATUS_CODE.BAD_REQUEST, GOOGLE_AUTH_MESSAGES.INVALID_STATE);
    expect(getToken).not.toHaveBeenCalled();
  });

  it("returns 400 if the state cookie is missing", async () => {
    const res = await GET(callbackRequest({ cookieState: null }));
    await expectError(res, STATUS_CODE.BAD_REQUEST, GOOGLE_AUTH_MESSAGES.INVALID_STATE);
    expect(getToken).not.toHaveBeenCalled();
  });

  it("returns 400 if state does not match the cookie", async () => {
    const res = await GET(callbackRequest({ cookieState: "someone-elses-state" }));
    await expectError(res, STATUS_CODE.BAD_REQUEST, GOOGLE_AUTH_MESSAGES.INVALID_STATE);
    expect(getToken).not.toHaveBeenCalled();
  });

  it("returns 400 if email missing", async () => {
    userinfoGet.mockResolvedValue({ data: { email: null, name: "Alice" } });
    const res = await GET(callbackRequest());
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

    const res = await GET(callbackRequest());
    expect(res.status).toBe(307);
    expect(res.headers.get("Location")).toContain(PAGE_ROUTES.PROJECT);
    const setCookie = res.headers.get("Set-Cookie") ?? "";
    expect(setCookie).toContain("access_token=access");
    expect(setCookie).toContain("refresh_token=refresh");
    expect(setCookie).toContain(`${OAUTH_STATE_COOKIE}=;`);
    expect(setCookie).toContain("Max-Age=0");
  });
});
