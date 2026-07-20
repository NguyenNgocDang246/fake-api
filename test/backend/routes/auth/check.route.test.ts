import { GET } from "@/app/api/auth/check/route";
import { expectSuccess, createJsonRequest } from "../../helpers/http";

describe("GET src/app/api/auth/check/route.ts", () => {
  it("returns 200 success", async () => {
    const res = await GET(createJsonRequest({}, {}));
    await expectSuccess(res, 200);
  });
});

