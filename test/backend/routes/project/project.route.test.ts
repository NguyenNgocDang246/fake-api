jest.mock("@/server/services/project.service", () => ({
  __esModule: true,
  default: {
    getAllProjectsByUserId: jest.fn(),
    createProject: jest.fn(),
    deleteAllProjectsByUserId: jest.fn(),
    canCreateProject: jest.fn(),
  },
}));

import projectService from "@/server/services/project.service";
import { GET, POST, DELETE } from "@/app/api/project/route";
import { ERROR_MESSAGES, STATUS_CODE } from "@/server/core/constants";
import { createJsonRequest, expectError, expectSuccess, readJson } from "../../helpers/http";

const USER_PUBLIC_ID = "aaaaaaaaaaaa";
const PROJECT_PUBLIC_ID = "bbbbbbbbbbbb";

describe("src/app/api/project/route.ts", () => {
  describe("GET", () => {
    it("returns 204 when no projects", async () => {
      (projectService.getAllProjectsByUserId as jest.Mock).mockResolvedValue([]);
      const res = await GET(
        createJsonRequest({}, { headers: { "x-userId": USER_PUBLIC_ID } })
      );
      expect(res.status).toBe(204);
    });

    it("returns 200 with project info list", async () => {
      (projectService.getAllProjectsByUserId as jest.Mock).mockResolvedValue([
        { public_id: PROJECT_PUBLIC_ID, name: "P1", description: null },
      ]);
      const res = await GET(
        createJsonRequest({}, { headers: { "x-userId": USER_PUBLIC_ID } })
      );
      await expectSuccess(res, 200);
      const body = await readJson(res);
      expect(Array.isArray(body.data)).toBe(true);
      expect(body.data[0]).toMatchObject({ name: "P1" });
      expect(typeof body.data[0].public_id).toBe("string");
    });

    it("returns 400 when x-userId is missing", async () => {
      const res = await GET(createJsonRequest({}, {}));
      await expectError(res, STATUS_CODE.BAD_REQUEST, ERROR_MESSAGES.VALIDATION_FAILED);
    });
  });

  describe("POST", () => {
    beforeEach(() => {
      (projectService.canCreateProject as jest.Mock).mockResolvedValue(true);
    });

    it("creates project and returns info", async () => {
      (projectService.createProject as jest.Mock).mockResolvedValue({
        public_id: PROJECT_PUBLIC_ID,
        name: "P1",
        description: null,
      });
      const res = await POST(
        createJsonRequest(
          { name: "P1", description: null },
          { headers: { "x-userId": USER_PUBLIC_ID } }
        )
      );
      await expectSuccess(res, 200);
      const body = await readJson(res);
      expect(body.data).toMatchObject({ name: "P1" });
      expect(projectService.createProject).toHaveBeenCalled();
    });

    it("returns 400 for invalid body (strict)", async () => {
      const res = await POST(
        createJsonRequest(
          { name: "P1", description: null, extra: true },
          { headers: { "x-userId": USER_PUBLIC_ID } }
        )
      );
      await expectError(res, STATUS_CODE.BAD_REQUEST, ERROR_MESSAGES.VALIDATION_FAILED);
    });
  });

  describe("DELETE", () => {
    it("returns 204 when nothing deleted", async () => {
      (projectService.deleteAllProjectsByUserId as jest.Mock).mockResolvedValue({ count: 0 });
      const res = await DELETE(
        createJsonRequest({}, { headers: { "x-userId": USER_PUBLIC_ID } })
      );
      expect(res.status).toBe(204);
    });

    it("returns 200 when deleted", async () => {
      (projectService.deleteAllProjectsByUserId as jest.Mock).mockResolvedValue({ count: 2 });
      const res = await DELETE(
        createJsonRequest({}, { headers: { "x-userId": USER_PUBLIC_ID } })
      );
      await expectSuccess(res, 200);
    });
  });
});
