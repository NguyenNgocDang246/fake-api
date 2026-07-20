jest.mock("@/server/services/user.service", () => ({
  __esModule: true,
  default: { getUserById: jest.fn() },
}));

import UserService from "@/server/services/user.service";
import { GET } from "@/app/api/user/route";
import { ERROR_MESSAGES, STATUS_CODE } from "@/server/core/constants";
import { createJsonRequest, expectError, expectSuccess, readJson } from "../helpers/http";

const USER_PUBLIC_ID = "aaaaaaaaaaaa";

describe("GET src/app/api/user/route.ts", () => {
  it("returns 200 with user info", async () => {
    (UserService.getUserById as jest.Mock).mockResolvedValue({
      public_id: USER_PUBLIC_ID,
      name: "Alice",
      email: "alice@example.com",
    });
    const res = await GET(
      createJsonRequest({}, { headers: { "x-userId": USER_PUBLIC_ID } })
    );
    await expectSuccess(res, 200);
    const body = await readJson(res);
    expect(body.data).toMatchObject({ name: "Alice", email: "alice@example.com" });
    expect(typeof body.data.public_id).toBe("string");
  });

  it("returns 401 when user not found", async () => {
    (UserService.getUserById as jest.Mock).mockResolvedValue(null);
    const res = await GET(
      createJsonRequest({}, { headers: { "x-userId": USER_PUBLIC_ID } })
    );
    await expectError(res, STATUS_CODE.UNAUTHORIZED, ERROR_MESSAGES.UNAUTHORIZED);
  });

  it("returns 500 when x-userId is missing/invalid (current behavior)", async () => {
    const res = await GET(createJsonRequest({}, {}));
    await expectError(res, STATUS_CODE.SERVER_ERROR, ERROR_MESSAGES.SERVER_ERROR);
  });
});
