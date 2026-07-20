import { GET } from "@/app/api/auth/logout/route";
import { expectSuccess, createJsonRequest } from "../../helpers/http";

describe("GET src/app/api/auth/logout/route.ts", () => {
  it("clears access_token and refresh_token cookies", async () => {
    const res = await GET(createJsonRequest({}, {}));
    await expectSuccess(res, 200);
    const setCookie = res.headers.get("Set-Cookie") ?? "";
    expect(setCookie).toContain("access_token=");
    expect(setCookie).toContain("Max-Age=0");
    expect(setCookie).toContain("refresh_token=");
    expect(setCookie).toContain("Path=/api/auth/refresh-token");
  });
});
