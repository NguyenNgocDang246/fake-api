jest.mock("@/server/services/user.service", () => ({
  __esModule: true,
  default: { getUserById: jest.fn() },
}));

jest.mock("@/server/services/project.service", () => ({
  __esModule: true,
  default: { countForUser: jest.fn() },
}));

jest.mock("@/server/services/ai_usage.service", () => ({
  __esModule: true,
  default: { quotaFor: jest.fn() },
}));

import userService from "@/server/services/user.service";
import projectService from "@/server/services/project.service";
import aiUsageService from "@/server/services/ai_usage.service";
import { GET } from "@/app/api/user/usage/route";
import { ROLE_LIMITS } from "@/server/core/role_limits";
import { ERROR_MESSAGES, STATUS_CODE } from "@/server/core/constants";
import { createJsonRequest, expectError, expectSuccess, readJson } from "../helpers/http";

const USER_PUBLIC_ID = "aaaaaaaaaaaa";

const callGet = () =>
  GET(createJsonRequest({}, { headers: { "x-userId": USER_PUBLIC_ID } }));

describe("GET src/app/api/user/usage/route.ts", () => {
  beforeEach(() => {
    (userService.getUserById as jest.Mock).mockResolvedValue({ id: 5n, role: "USER" });
    (projectService.countForUser as jest.Mock).mockResolvedValue(3);
    (aiUsageService.quotaFor as jest.Mock).mockResolvedValue({
      limit: ROLE_LIMITS.USER.maxAiPlansPerDay,
      spent: 12,
    });
  });

  it("returns 200 with the role's limits and the counts only the server knows", async () => {
    const res = await callGet();

    await expectSuccess(res, 200);
    const body = await readJson(res);
    expect(body.data).toEqual({
      role: "USER",
      limits: {
        max_projects: ROLE_LIMITS.USER.maxProjects,
        max_groups_per_project: ROLE_LIMITS.USER.maxGroupsPerProject,
        max_endpoints_per_group: ROLE_LIMITS.USER.maxEndpointsPerGroup,
        max_ai_plans_per_day: ROLE_LIMITS.USER.maxAiPlansPerDay,
      },
      used: { projects: 3, ai_plans_today: 12 },
    });
  });

  it("reads the limits from the role on the row, not from the caller", async () => {
    (userService.getUserById as jest.Mock).mockResolvedValue({ id: 5n, role: "USER_VIP" });

    const res = await callGet();

    const body = await readJson(res);
    expect(body.data.limits.max_projects).toBe(ROLE_LIMITS.USER_VIP.maxProjects);
    expect(body.data.role).toBe("USER_VIP");
  });

  it("returns 401 when the user no longer exists", async () => {
    (userService.getUserById as jest.Mock).mockResolvedValue(null);

    await expectError(await callGet(), STATUS_CODE.UNAUTHORIZED, ERROR_MESSAGES.UNAUTHORIZED);
  });

  it("returns 400 when x-userId is missing or invalid", async () => {
    const res = await GET(createJsonRequest({}, {}));

    await expectError(res, STATUS_CODE.BAD_REQUEST, ERROR_MESSAGES.VALIDATION_FAILED);
  });
});
