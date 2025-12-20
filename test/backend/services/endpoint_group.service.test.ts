jest.mock("@/server/prisma/prisma_provider", () => ({
  __esModule: true,
  prisma: {
    endpoint_groups: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  },
}));

import { prisma } from "@/server/prisma/prisma_provider";
import endpointGroupService from "@/server/services/endpoint_group.service";
import { AppError } from "@/server/core/errors";

describe("src/server/services/endpoint_group.service.ts", () => {
  it("checkPermission returns false when not found", async () => {
    (prisma.endpoint_groups.findUnique as jest.Mock).mockResolvedValue(null);
    await expect(
      endpointGroupService.checkPermission({
        userProps: { id: 1n },
        projectProps: { id: 1n },
        endpointGroupProps: { id: 10n },
      })
    ).resolves.toBe(false);
  });

  it("checkPermission bubbles prisma error (current behavior)", async () => {
    (prisma.endpoint_groups.findUnique as jest.Mock).mockRejectedValue(new Error("boom"));
    await expect(
      endpointGroupService.checkPermission({
        userProps: { id: 1n },
        projectProps: { id: 1n },
        endpointGroupProps: { id: 10n },
      })
    ).rejects.toThrow("boom");
  });

  it("createEndpointGroup wraps error into AppError", async () => {
    (prisma.endpoint_groups.create as jest.Mock).mockRejectedValue(new Error("db down"));
    await expect(
      endpointGroupService.createEndpointGroup({ project_id: 1n, name: "G" })
    ).rejects.toBeInstanceOf(AppError);
  });
});

