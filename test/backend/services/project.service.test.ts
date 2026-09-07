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
      count: jest.fn(),
    },
  },
}));

jest.mock("@/server/services/endpoint_group.service", () => ({
  __esModule: true,
  default: {
    createEndpointGroup: jest.fn(),
  },
}));

jest.mock("@/server/services/user.service", () => ({
  __esModule: true,
  default: { getUserById: jest.fn() },
}));

import { prisma } from "@/server/prisma/prisma_provider";
import projectService from "@/server/services/project.service";
import endpointGroupService from "@/server/services/endpoint_group.service";
import userService from "@/server/services/user.service";
import { ROLE_LIMITS } from "@/server/core/role_limits";
import { AppError } from "@/server/core/errors";

describe("src/server/services/project.service.ts", () => {
  describe("canCreateProject", () => {
    it("counts against the role's cap", async () => {
      (userService.getUserById as jest.Mock).mockResolvedValue({ role: "USER" });
      (prisma.projects.count as jest.Mock).mockResolvedValue(ROLE_LIMITS.USER.maxProjects);

      await expect(projectService.canCreateProject("user1")).resolves.toBe(false);
    });

    it("caps GUEST too, on the count of trial sandboxes", async () => {
      (userService.getUserById as jest.Mock).mockResolvedValue({ role: "GUEST" });
      (prisma.projects.count as jest.Mock).mockResolvedValue(ROLE_LIMITS.GUEST.maxProjects);

      await expect(projectService.canCreateProject("guest1")).resolves.toBe(false);
    });

    it("allows a role that is still under its cap", async () => {
      (userService.getUserById as jest.Mock).mockResolvedValue({ role: "GUEST" });
      (prisma.projects.count as jest.Mock).mockResolvedValue(ROLE_LIMITS.GUEST.maxProjects - 1);

      await expect(projectService.canCreateProject("guest1")).resolves.toBe(true);
    });

    it("refuses when the user is gone", async () => {
      (userService.getUserById as jest.Mock).mockResolvedValue(null);

      await expect(projectService.canCreateProject("ghost")).resolves.toBe(false);
    });
  });

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

  it("createProject also creates a default endpoint group for the new project", async () => {
    (prisma.projects.create as jest.Mock).mockResolvedValue({ public_id: "proj1", name: "P" });
    (endpointGroupService.createEndpointGroup as jest.Mock).mockResolvedValue({
      public_id: "group1",
      name: "default",
    });

    const result = await projectService.createProject({
      user_public_id: "user1",
      name: "P",
      description: null,
    });

    expect(result).toEqual({ public_id: "proj1", name: "P" });
    expect(endpointGroupService.createEndpointGroup).toHaveBeenCalledWith({
      project_public_id: "proj1",
      name: "default",
    });
  });
});
