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
    (prisma.projects.findUnique as jest.Mock).mockResolvedValue({ public_id: "proj1" });
    await expect(
      projectService.checkPermission({
        userProps: { public_id: "user1" },
        projectProps: { public_id: "proj1" },
      })
    ).resolves.toBe(true);
  });

  it("checkPermission bubbles prisma error (current behavior)", async () => {
    (prisma.projects.findUnique as jest.Mock).mockRejectedValue(new Error("boom"));
    await expect(
      projectService.checkPermission({
        userProps: { public_id: "user1" },
        projectProps: { public_id: "proj1" },
      })
    ).rejects.toThrow("boom");
  });

  it("updateProjectById converts description undefined -> null", async () => {
    (prisma.projects.update as jest.Mock).mockResolvedValue({ public_id: "proj1" });
    await projectService.updateProjectById({ public_id: "proj1", name: "P", description: undefined });
    expect(prisma.projects.update).toHaveBeenCalledWith({
      where: { public_id: "proj1" },
      data: { name: "P", description: null },
    });
  });

  it("createProject wraps error into AppError", async () => {
    (prisma.projects.create as jest.Mock).mockRejectedValue(new Error("db down"));
    await expect(
      projectService.createProject({ user_public_id: "user1", name: "P", description: null })
    ).rejects.toBeInstanceOf(AppError);
  });
});
