jest.mock("@/server/prisma/prisma_provider", () => ({
  __esModule: true,
  prisma: {
    projects: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      deleteMany: jest.fn(),
      delete: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
    },
  },
}));

import { prisma } from "@/server/prisma/prisma_provider";
import projectService from "@/server/services/project.service";
import { AppError } from "@/server/core/errors";

describe("src/server/services/project.service.ts", () => {
  it("checkPermission returns true when matching project exists", async () => {
    (prisma.projects.findUnique as jest.Mock).mockResolvedValue({ id: 1n });
    await expect(
      projectService.checkPermission({ userProps: { id: 1n }, projectProps: { id: 1n } })
    ).resolves.toBe(true);
  });

  it("checkPermission bubbles prisma error (current behavior)", async () => {
    (prisma.projects.findUnique as jest.Mock).mockRejectedValue(new Error("boom"));
    await expect(
      projectService.checkPermission({ userProps: { id: 1n }, projectProps: { id: 1n } })
    ).rejects.toThrow("boom");
  });

  it("updateProjectById converts description undefined -> null", async () => {
    (prisma.projects.update as jest.Mock).mockResolvedValue({ id: 1n });
    await projectService.updateProjectById({ id: 1n, name: "P", description: undefined });
    expect(prisma.projects.update).toHaveBeenCalledWith({
      where: { id: 1n },
      data: { name: "P", description: null },
    });
  });

  it("createProject wraps error into AppError", async () => {
    (prisma.projects.create as jest.Mock).mockRejectedValue(new Error("db down"));
    await expect(
      projectService.createProject({ user_id: 1n, name: "P", description: null })
    ).rejects.toBeInstanceOf(AppError);
  });
});

