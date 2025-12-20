jest.mock("@/server/services/project.service", () => ({
  __esModule: true,
  default: {
    getProjectById: jest.fn(),
    updateProjectById: jest.fn(),
    deleteProjectById: jest.fn(),
  },
}));

import projectService from "@/server/services/project.service";
import { GET, PUT, DELETE } from "@/app/api/project/[projectId]/route";
import { ERROR_MESSAGES, STATUS_CODE } from "@/server/core/constants";
import IdConverter from "@/app/libs/helpers/idConverter";
import { createJsonRequest, expectError, expectSuccess } from "../../helpers/http";

describe("src/app/api/project/[projectId]/route.ts", () => {
  const props = (projectId: string) => ({ params: Promise.resolve({ projectId }) });

  describe("GET", () => {
    it("returns 404 when project not found", async () => {
      (projectService.getProjectById as jest.Mock).mockResolvedValue(null);
      const res = await GET(
        createJsonRequest({}, { headers: { "x-userId": "1" } }) as any,
        props(IdConverter.encode(1n)) as any
      );
      await expectError(res, STATUS_CODE.NOT_FOUND, ERROR_MESSAGES.NOT_FOUND);
    });

    it("returns 403 when project belongs to another user", async () => {
      (projectService.getProjectById as jest.Mock).mockResolvedValue({
        id: 1n,
        user_id: 2n,
        name: "P",
        description: null,
      });
      const res = await GET(
        createJsonRequest({}, { headers: { "x-userId": "1" } }) as any,
        props(IdConverter.encode(1n)) as any
      );
      await expectError(res, STATUS_CODE.FORBIDDEN, ERROR_MESSAGES.FORBIDDEN);
    });

    it("returns 200 when project belongs to user", async () => {
      (projectService.getProjectById as jest.Mock).mockResolvedValue({
        id: 1n,
        user_id: 1n,
        name: "P",
        description: null,
      });
      const res = await GET(
        createJsonRequest({}, { headers: { "x-userId": "1" } }) as any,
        props(IdConverter.encode(1n)) as any
      );
      await expectSuccess(res, 200);
    });
  });

  describe("PUT", () => {
    it("returns 204 when project does not exist", async () => {
      (projectService.getProjectById as jest.Mock).mockResolvedValue(null);
      const res = await PUT(
        createJsonRequest({ name: "P", description: null }, { headers: { "x-userId": "1" } }) as any,
        props(IdConverter.encode(1n)) as any
      );
      expect(res.status).toBe(204);
    });

    it("returns 200 when updated", async () => {
      (projectService.getProjectById as jest.Mock).mockResolvedValue({
        id: 1n,
        user_id: 1n,
        name: "P",
        description: null,
      });
      (projectService.updateProjectById as jest.Mock).mockResolvedValue({
        id: 1n,
        user_id: 1n,
        name: "P2",
        description: null,
      });
      const res = await PUT(
        createJsonRequest({ name: "P2", description: null }, { headers: { "x-userId": "1" } }) as any,
        props(IdConverter.encode(1n)) as any
      );
      await expectSuccess(res, 200);
    });
  });

  describe("DELETE", () => {
    it("returns 200 when deleted", async () => {
      (projectService.getProjectById as jest.Mock).mockResolvedValue({
        id: 1n,
        user_id: 1n,
        name: "P",
        description: null,
      });
      (projectService.deleteProjectById as jest.Mock).mockResolvedValue(undefined);
      const res = await DELETE(
        createJsonRequest({}, { headers: { "x-userId": "1" } }) as any,
        props(IdConverter.encode(1n)) as any
      );
      await expectSuccess(res, 200);
    });
  });
});

