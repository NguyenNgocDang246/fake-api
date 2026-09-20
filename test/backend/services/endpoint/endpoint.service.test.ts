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

  // The duplicate check on both write routes, and nothing else. It must not drag a scenario
  // across the wire to answer "does this path already exist".
  describe("getEndpointByPath", () => {
    it("asks for the id alone", async () => {
      (prisma.endpoints.findFirst as jest.Mock).mockResolvedValue(null);

      await endpointService.getEndpointByPath({
        project_public_id: "proj1",
        path: "/x",
        method: "GET",
      });

      expect(prisma.endpoints.findFirst).toHaveBeenCalledWith({
        where: {
          path: "/x",
          method: "GET",
          endpoint_groups: { projects: { public_id: "proj1" } },
        },
        select: { public_id: true },
      });
    });

    it("wraps error into AppError", async () => {
      (prisma.endpoints.findFirst as jest.Mock).mockRejectedValue(new Error("db down"));
      await expect(
        endpointService.getEndpointByPath({ project_public_id: "proj1", path: "/x", method: "GET" })
      ).rejects.toBeInstanceOf(AppError);
    });
  });

  // The serving lookup orders rather than filters, because a switch deactivates before it
  // activates and an endpoint has none active in between. Filtering would 404 a live mock.
  describe("getServableEndpointByPath", () => {
    it("takes the active scenario, falling back to the first by position", async () => {
      (prisma.endpoints.findFirst as jest.Mock).mockResolvedValue(null);

      await endpointService.getServableEndpointByPath({
        project_public_id: "proj1",
        path: "/x",
        method: "GET",
      });

      expect(prisma.endpoints.findFirst).toHaveBeenCalledWith({
        where: {
          path: "/x",
          method: "GET",
          endpoint_groups: { projects: { public_id: "proj1" } },
        },
        include: { scenarios: { orderBy: [{ is_active: "desc" }, { position: "asc" }], take: 1 } },
      });
    });
  });

  describe("getAllEndpoints", () => {
    // The count is a subquery, not a second read of the bodies, so a row can say how many
    // scenarios it has while the list still ships one.
    it("reads the serving scenario and how many there are", async () => {
      (prisma.endpoints.findMany as jest.Mock).mockResolvedValue([]);

      await endpointService.getAllEndpoints({
        public_id: "group1",
        owner: { user_public_id: "user1", project_public_id: "proj1" },
      });

      expect(prisma.endpoints.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          include: {
            scenarios: { orderBy: [{ is_active: "desc" }, { position: "asc" }], take: 1 },
            _count: { select: { scenarios: true } },
          },
        })
      );
    });
  });

  describe("getServableEndpointByDynamicPath", () => {
    const find = (path: string) =>
      endpointService.getServableEndpointByDynamicPath({
        project_public_id: "proj1",
        path,
        method: "GET",
      });

    // Two phases: the winner is picked from ids and paths alone, and only the winner's body and
    // blueprint are read. One phase would drag every candidate's response across the wire.
    it("reads only the id and path of every candidate", async () => {
      (prisma.endpoints.findMany as jest.Mock).mockResolvedValue([]);

      await find("/user/abc123");

      expect(prisma.endpoints.findMany).toHaveBeenCalledWith({
        where: {
          method: "GET",
          path: { contains: ":" },
          endpoint_groups: { projects: { public_id: "proj1" } },
        },
        orderBy: { updated_at: "desc" },
        select: { id: true, path: true },
      });
      expect(prisma.endpoints.findUnique).not.toHaveBeenCalled();
    });

    it("fetches the winner alone, with its serving scenario", async () => {
      const row = { id: 2n, path: "/user/:id" };
      (prisma.endpoints.findMany as jest.Mock).mockResolvedValue([
        { id: 1n, path: "/user/:id/orders/:orderId" },
        row,
      ]);
      (prisma.endpoints.findUnique as jest.Mock).mockResolvedValue({ id: 2n, scenarios: [] });

      await find("/user/abc123");

      expect(prisma.endpoints.findUnique).toHaveBeenCalledWith({
        where: { id: 2n },
        include: { scenarios: { orderBy: [{ is_active: "desc" }, { position: "asc" }], take: 1 } },
      });
    });

    // Two templates can both match one path, and the order the rows came back in used to decide.
    // That made an unrelated write to either row reroute the request.
    it("picks the template whose literal segment comes first, whatever the row order", async () => {
      const specific = { id: 2n, path: "/shop/list/:name" };
      const loose = { id: 1n, path: "/shop/:id/item" };

      for (const rows of [
        [loose, specific],
        [specific, loose],
      ]) {
        (prisma.endpoints.findMany as jest.Mock).mockResolvedValue(rows);
        (prisma.endpoints.findUnique as jest.Mock).mockResolvedValue({ id: 2n, scenarios: [] });

        await find("/shop/list/item");

        expect(prisma.endpoints.findUnique).toHaveBeenLastCalledWith(
          expect.objectContaining({ where: { id: 2n } })
        );
      }
    });

    it("returns null without a second query when no template matches", async () => {
      (prisma.endpoints.findMany as jest.Mock).mockResolvedValue([
        { id: 1n, path: "/user/:id/orders/:orderId" },
      ]);

      await expect(find("/user/abc123")).resolves.toBeNull();
      expect(prisma.endpoints.findUnique).not.toHaveBeenCalled();
    });

    it("wraps error into AppError", async () => {
      (prisma.endpoints.findMany as jest.Mock).mockRejectedValue(new Error("db down"));

      await expect(find("/user/abc123")).rejects.toBeInstanceOf(AppError);
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
