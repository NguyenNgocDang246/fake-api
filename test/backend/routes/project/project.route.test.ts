jest.mock("@/server/services/project.service", () => ({
  __esModule: true,
  default: {
    getAllProjectsByUserId: jest.fn(),
    createProject: jest.fn(),
    deleteAllProjectsByUserId: jest.fn(),
  },
}));

import projectService from "@/server/services/project.service";
import { GET, POST, DELETE } from "@/app/api/project/route";
import { ERROR_MESSAGES, STATUS_CODE } from "@/server/core/constants";
import { createJsonRequest, expectError, expectSuccess, readJson } from "../../helpers/http";

describe("src/app/api/project/route.ts", () => {
  describe("GET", () => {
    it("returns 204 when no projects", async () => {
      (projectService.getAllProjectsByUserId as jest.Mock).mockResolvedValue([]);
      const res = await GET(createJsonRequest({}, { headers: { "x-userId": "1" } }) as any);
      expect(res.status).toBe(204);
    });

    it("returns 200 with project info list", async () => {
      (projectService.getAllProjectsByUserId as jest.Mock).mockResolvedValue([
        { id: 1n, user_id: 1n, name: "P1", description: null },
      ]);
      const res = await GET(createJsonRequest({}, { headers: { "x-userId": "1" } }) as any);
      await expectSuccess(res, 200);
      const body = await readJson(res);
      expect(Array.isArray(body.data)).toBe(true);
      expect(body.data[0]).toMatchObject({ name: "P1" });
      expect(typeof body.data[0].public_id).toBe("string");
    });

    it("returns 500 when x-userId missing (current behavior)", async () => {
      const res = await GET(createJsonRequest({}, {}) as any);
      await expectError(res, STATUS_CODE.SERVER_ERROR, ERROR_MESSAGES.SERVER_ERROR);
    });
  });

  describe("POST", () => {
    it("creates project and returns info", async () => {
      (projectService.createProject as jest.Mock).mockResolvedValue({
        id: 1n,
        user_id: 1n,
        name: "P1",
        description: null,
      });
      const res = await POST(
        createJsonRequest(
          { name: "P1", description: null },
          { headers: { "x-userId": "1" } }
        ) as any
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
          { headers: { "x-userId": "1" } }
        ) as any
      );
      await expectError(res, STATUS_CODE.BAD_REQUEST, ERROR_MESSAGES.VALIDATION_FAILED);
    });
  });

  describe("DELETE", () => {
    it("returns 204 when nothing deleted", async () => {
      (projectService.deleteAllProjectsByUserId as jest.Mock).mockResolvedValue({ count: 0 });
      const res = await DELETE(createJsonRequest({}, { headers: { "x-userId": "1" } }) as any);
      expect(res.status).toBe(204);
    });

    it("returns 200 when deleted", async () => {
      (projectService.deleteAllProjectsByUserId as jest.Mock).mockResolvedValue({ count: 2 });
      const res = await DELETE(createJsonRequest({}, { headers: { "x-userId": "1" } }) as any);
      await expectSuccess(res, 200);
    });
  });
});

