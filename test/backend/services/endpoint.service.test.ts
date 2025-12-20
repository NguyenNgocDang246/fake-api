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
import endpointService from "@/server/services/endpoint.service";
import { AppError } from "@/server/core/errors";

describe("src/server/services/endpoint.service.ts", () => {
  it("checkPermissions returns true when record exists", async () => {
    (prisma.endpoints.findUnique as jest.Mock).mockResolvedValue({ id: 1n });
    await expect(
      endpointService.checkPermissions({
        userProps: { id: 1n },
        projectProps: { id: 1n },
        endpointGroupProps: { id: 10n },
        endpointProps: { id: 100n },
      })
    ).resolves.toBe(true);
  });

  it("checkPermissions bubbles prisma error (current behavior)", async () => {
    (prisma.endpoints.findUnique as jest.Mock).mockRejectedValue(new Error("boom"));
    await expect(
      endpointService.checkPermissions({
        userProps: { id: 1n },
        projectProps: { id: 1n },
        endpointGroupProps: { id: 10n },
        endpointProps: { id: 100n },
      })
    ).rejects.toThrow("boom");
  });

  it("getEndpointByPath wraps error into AppError", async () => {
    (prisma.endpoints.findFirst as jest.Mock).mockRejectedValue(new Error("db down"));
    await expect(
      endpointService.getEndpointByPath({ project_id: 1n, path: "/x", method: "GET" })
    ).rejects.toBeInstanceOf(AppError);
  });
});

