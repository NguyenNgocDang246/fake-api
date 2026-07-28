jest.mock("@/server/prisma/prisma_provider", () => ({
  __esModule: true,
  prisma: {
    endpoints: {
      findUnique: jest.fn(),
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
      update: jest.fn(),
    },
  },
}));

import { prisma } from "@/server/prisma/prisma_provider";
import endpointService, { matchPathTemplate } from "@/server/services/endpoint.service";
import { AppError } from "@/server/core/errors";

describe("src/server/services/endpoint.service.ts", () => {
  it("checkPermissions returns true when record exists", async () => {
    (prisma.endpoints.findUnique as jest.Mock).mockResolvedValue({ public_id: "endpoint1" });
    await expect(
      endpointService.checkPermissions({
        userProps: { public_id: "user1" },
        projectProps: { public_id: "proj1" },
        endpointGroupProps: { public_id: "group1" },
        endpointProps: { public_id: "endpoint1" },
      })
    ).resolves.toBe(true);
  });

  it("checkPermissions bubbles prisma error (current behavior)", async () => {
    (prisma.endpoints.findUnique as jest.Mock).mockRejectedValue(new Error("boom"));
    await expect(
      endpointService.checkPermissions({
        userProps: { public_id: "user1" },
        projectProps: { public_id: "proj1" },
        endpointGroupProps: { public_id: "group1" },
        endpointProps: { public_id: "endpoint1" },
      })
    ).rejects.toThrow("boom");
  });

  it("getEndpointByPath wraps error into AppError", async () => {
    (prisma.endpoints.findFirst as jest.Mock).mockRejectedValue(new Error("db down"));
    await expect(
      endpointService.getEndpointByPath({ project_public_id: "proj1", path: "/x", method: "GET" })
    ).rejects.toBeInstanceOf(AppError);
  });

  describe("matchPathTemplate", () => {
    it("returns false when segment counts differ", () => {
      expect(matchPathTemplate("/user/:id", "/user/1/orders")).toBe(false);
    });

    it("returns false when a static segment mismatches", () => {
      expect(matchPathTemplate("/user/:id/orders", "/account/1/orders")).toBe(false);
    });

    it("matches a single :param segment", () => {
      expect(matchPathTemplate("/user/:id", "/user/abc123")).toBe(true);
    });

    it("matches multiple :param segments", () => {
      expect(matchPathTemplate("/user/:projectId/orders/:orderId", "/user/abc/orders/99")).toBe(true);
    });
  });

  describe("getEndpointByDynamicPath", () => {
    it("scopes the lookup by method, project, and template-only rows", async () => {
      (prisma.endpoints.findMany as jest.Mock).mockResolvedValue([]);
      await endpointService.getEndpointByDynamicPath({
        project_public_id: "proj1",
        path: "/user/abc123",
        method: "GET",
      });
      expect(prisma.endpoints.findMany).toHaveBeenCalledWith({
        where: {
          method: "GET",
          path: { contains: ":" },
          endpoint_groups: { projects: { public_id: "proj1" } },
        },
        orderBy: { updated_at: "desc" },
      });
    });

    it("returns the first candidate whose template matches the path", async () => {
      const match = { public_id: "e2", path: "/user/:id", method: "GET" };
      (prisma.endpoints.findMany as jest.Mock).mockResolvedValue([
        { public_id: "e1", path: "/user/:id/orders/:orderId", method: "GET" },
        match,
      ]);
      await expect(
        endpointService.getEndpointByDynamicPath({
          project_public_id: "proj1",
          path: "/user/abc123",
          method: "GET",
        })
      ).resolves.toEqual(match);
    });

    it("returns null when no candidate template matches", async () => {
      (prisma.endpoints.findMany as jest.Mock).mockResolvedValue([
        { public_id: "e1", path: "/user/:id/orders/:orderId", method: "GET" },
      ]);
      await expect(
        endpointService.getEndpointByDynamicPath({
          project_public_id: "proj1",
          path: "/user/abc123",
          method: "GET",
        })
      ).resolves.toBeNull();
    });

    it("wraps error into AppError", async () => {
      (prisma.endpoints.findMany as jest.Mock).mockRejectedValue(new Error("db down"));
      await expect(
        endpointService.getEndpointByDynamicPath({
          project_public_id: "proj1",
          path: "/user/abc123",
          method: "GET",
        })
      ).rejects.toBeInstanceOf(AppError);
    });
  });
});
