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
import endpointService from "@/server/services/endpoint/endpoint.service";
import { AppError } from "@/server/core/errors";

describe("src/server/services/endpoint/endpoint.service.ts", () => {
  it("checkPermission returns true when record exists", async () => {
    (prisma.endpoints.findUnique as jest.Mock).mockResolvedValue({ public_id: "endpoint1" });
    await expect(
      endpointService.checkPermission({
        userProps: { public_id: "user1" },
        projectProps: { public_id: "proj1" },
        endpointGroupProps: { public_id: "group1" },
        endpointProps: { public_id: "endpoint1" },
      })
    ).resolves.toBe(true);
  });

  it("checkPermission bubbles prisma error (current behavior)", async () => {
    (prisma.endpoints.findUnique as jest.Mock).mockRejectedValue(new Error("boom"));
    await expect(
      endpointService.checkPermission({
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

    // Two templates can both match one path, and the order the rows came back in used to decide.
    // That made an unrelated write to either row reroute the request.
    it("picks the template whose literal segment comes first, whatever the row order", async () => {
      const specific = { public_id: "e2", path: "/shop/list/:name", method: "GET" };
      const loose = { public_id: "e1", path: "/shop/:id/item", method: "GET" };

      for (const rows of [
        [loose, specific],
        [specific, loose],
      ]) {
        (prisma.endpoints.findMany as jest.Mock).mockResolvedValue(rows);
        await expect(
          endpointService.getEndpointByDynamicPath({
            project_public_id: "proj1",
            path: "/shop/list/item",
            method: "GET",
          })
        ).resolves.toEqual(specific);
      }
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

  describe("findMethodsForPath", () => {
    const find = () =>
      endpointService.findMethodsForPath({ project_public_id: "proj1", path: "/users" });

    it("reports every method serving a literal path", async () => {
      (prisma.endpoints.findMany as jest.Mock).mockResolvedValue([
        { path: "/users", method: "POST" },
        { path: "/users", method: "PUT" },
      ]);

      await expect(find()).resolves.toEqual(["POST", "PUT"]);
    });

    it("matches through a :param template, not just a literal path", async () => {
      (prisma.endpoints.findMany as jest.Mock).mockResolvedValue([
        { path: "/user/:id", method: "DELETE" },
      ]);

      await expect(
        endpointService.findMethodsForPath({ project_public_id: "proj1", path: "/user/abc123" })
      ).resolves.toEqual(["DELETE"]);
    });

    it("drops a template that does not actually match the path", async () => {
      (prisma.endpoints.findMany as jest.Mock).mockResolvedValue([
        { path: "/order/:id/items", method: "GET" },
      ]);

      await expect(
        endpointService.findMethodsForPath({ project_public_id: "proj1", path: "/user/abc123" })
      ).resolves.toEqual([]);
    });

    it("reports a method once however many rows serve it", async () => {
      (prisma.endpoints.findMany as jest.Mock).mockResolvedValue([
        { path: "/users", method: "POST" },
        { path: "/users", method: "POST" },
      ]);

      await expect(find()).resolves.toEqual(["POST"]);
    });

    it("returns nothing when the project does not serve that path at all", async () => {
      (prisma.endpoints.findMany as jest.Mock).mockResolvedValue([]);

      await expect(find()).resolves.toEqual([]);
    });

    it("wraps error into AppError", async () => {
      (prisma.endpoints.findMany as jest.Mock).mockRejectedValue(new Error("db down"));

      await expect(find()).rejects.toBeInstanceOf(AppError);
    });
  });
});
