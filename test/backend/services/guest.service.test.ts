jest.mock("@/server/prisma/prisma_provider", () => ({
  __esModule: true,
  prisma: {
    users: { findUnique: jest.fn(), create: jest.fn() },
    projects: { deleteMany: jest.fn() },
  },
}));

jest.mock("@/server/services/auth/hash.service", () => ({
  __esModule: true,
  hashPassword: jest.fn(async () => "hashed"),
}));

jest.mock("@/server/services/project.service", () => ({
  __esModule: true,
  default: { createProject: jest.fn(), canCreateProject: jest.fn(async () => true) },
}));

jest.mock("@/server/services/endpoint_group.service", () => ({
  __esModule: true,
  default: { getAllEndpointGroups: jest.fn() },
}));

import { prisma } from "@/server/prisma/prisma_provider";
import projectService from "@/server/services/project.service";
import endpointGroupService from "@/server/services/endpoint_group.service";
import {
  GUEST_EMAIL,
  GUEST_MESSAGES,
  GUEST_PROJECT_LIFETIME_IN_SECONDS,
} from "@/server/services/guest.constants";
import { STATUS_CODE } from "@/server/core/constants";

const GUEST_ROW = { id: 1n, public_id: "guestPublicI" };

// The service caches the guest user on the instance, so each spec needs a fresh module.
async function loadService() {
  let service!: typeof import("@/server/services/guest.service").default;
  await jest.isolateModulesAsync(async () => {
    service = (await import("@/server/services/guest.service")).default;
  });
  return service;
}

describe("src/server/services/guest.service.ts", () => {
  // `clearMocks` wipes calls but keeps implementations, so a `mockResolvedValue` from one spec
  // would otherwise decide the next one.
  beforeEach(() => {
    (projectService.canCreateProject as jest.Mock).mockResolvedValue(true);
  });

  it("getGuestUser returns the existing row without creating one", async () => {
    (prisma.users.findUnique as jest.Mock).mockResolvedValue(GUEST_ROW);
    const guestService = await loadService();

    await expect(guestService.getGuestUser()).resolves.toEqual(GUEST_ROW);
    expect(prisma.users.findUnique).toHaveBeenCalledWith({ where: { email: GUEST_EMAIL } });
    expect(prisma.users.create).not.toHaveBeenCalled();
  });

  it("getGuestUser creates the shared account the first time, as a verified GUEST", async () => {
    (prisma.users.findUnique as jest.Mock).mockResolvedValue(null);
    (prisma.users.create as jest.Mock).mockResolvedValue(GUEST_ROW);
    const guestService = await loadService();

    await expect(guestService.getGuestUser()).resolves.toEqual(GUEST_ROW);

    const data = (prisma.users.create as jest.Mock).mock.calls[0][0].data;
    expect(data).toMatchObject({
      email: GUEST_EMAIL,
      role: "GUEST",
      is_verified: true,
      password: "hashed",
    });
    expect(data.public_id).toEqual(expect.any(String));
  });

  it("getGuestUser reads the winner back when two first requests race on email", async () => {
    (prisma.users.findUnique as jest.Mock)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(GUEST_ROW);
    (prisma.users.create as jest.Mock).mockRejectedValue(new Error("duplicate email"));
    const guestService = await loadService();

    await expect(guestService.getGuestUser()).resolves.toEqual(GUEST_ROW);
  });

  it("getGuestUser rethrows when the create failed and no row appeared", async () => {
    (prisma.users.findUnique as jest.Mock).mockResolvedValue(null);
    (prisma.users.create as jest.Mock).mockRejectedValue(new Error("boom"));
    const guestService = await loadService();

    await expect(guestService.getGuestUser()).rejects.toBeDefined();
  });

  it("getGuestUser caches, so a second call does not hit the database again", async () => {
    (prisma.users.findUnique as jest.Mock).mockResolvedValue(GUEST_ROW);
    const guestService = await loadService();

    await guestService.getGuestUser();
    await guestService.getGuestUser();

    expect(prisma.users.findUnique).toHaveBeenCalledTimes(1);
  });

  it("deleteExpiredSandboxes only sweeps projects of the guest account", async () => {
    (prisma.projects.deleteMany as jest.Mock).mockResolvedValue({ count: 3 });
    const guestService = await loadService();
    const cutoff = new Date("2026-01-01T00:00:00.000Z");

    await guestService.deleteExpiredSandboxes(cutoff);

    expect(prisma.projects.deleteMany).toHaveBeenCalledWith({
      where: { users: { email: GUEST_EMAIL }, created_at: { lt: cutoff } },
    });
  });

  it("createSandbox creates one project and reads back the group createProject already made", async () => {
    (prisma.users.findUnique as jest.Mock).mockResolvedValue(GUEST_ROW);
    (prisma.projects.deleteMany as jest.Mock).mockResolvedValue({ count: 0 });
    (projectService.createProject as jest.Mock).mockResolvedValue({ public_id: "projectPubl" });
    (endpointGroupService.getAllEndpointGroups as jest.Mock).mockResolvedValue([
      { public_id: "groupPublicI", name: "default" },
    ]);
    const guestService = await loadService();

    await expect(guestService.createSandbox()).resolves.toEqual({
      project_id: "projectPubl",
      endpoint_group_id: "groupPublicI",
    });

    expect(projectService.createProject).toHaveBeenCalledTimes(1);
    expect(projectService.createProject).toHaveBeenCalledWith(
      expect.objectContaining({ user_public_id: GUEST_ROW.public_id })
    );
    expect(endpointGroupService.getAllEndpointGroups).toHaveBeenCalledWith({
      public_id: "projectPubl",
    });
  });

  it("createSandbox sweeps expired sandboxes using the configured lifetime", async () => {
    jest.useFakeTimers().setSystemTime(new Date("2026-09-07T00:00:00.000Z"));
    (prisma.users.findUnique as jest.Mock).mockResolvedValue(GUEST_ROW);
    (prisma.projects.deleteMany as jest.Mock).mockResolvedValue({ count: 0 });
    (projectService.createProject as jest.Mock).mockResolvedValue({ public_id: "projectPubl" });
    (endpointGroupService.getAllEndpointGroups as jest.Mock).mockResolvedValue([
      { public_id: "groupPublicI" },
    ]);
    const guestService = await loadService();

    await guestService.createSandbox();

    const expected = new Date(Date.now() - GUEST_PROJECT_LIFETIME_IN_SECONDS * 1000);
    expect(prisma.projects.deleteMany).toHaveBeenCalledWith({
      where: { users: { email: GUEST_EMAIL }, created_at: { lt: expected } },
    });
    jest.useRealTimers();
  });

  it("createSandbox sweeps before it checks the ceiling, not after", async () => {
    const order: string[] = [];
    (prisma.users.findUnique as jest.Mock).mockResolvedValue(GUEST_ROW);
    (prisma.projects.deleteMany as jest.Mock).mockImplementation(async () => {
      order.push("sweep");
      return { count: 4 };
    });
    (projectService.canCreateProject as jest.Mock).mockImplementation(async () => {
      order.push("check");
      return true;
    });
    (projectService.createProject as jest.Mock).mockResolvedValue({ public_id: "projectPubl" });
    (endpointGroupService.getAllEndpointGroups as jest.Mock).mockResolvedValue([
      { public_id: "groupPublicI" },
    ]);
    const guestService = await loadService();

    await guestService.createSandbox();

    expect(order).toEqual(["sweep", "check"]);
  });

  it("createSandbox turns a visitor away with 503 once every trial slot is taken", async () => {
    (prisma.users.findUnique as jest.Mock).mockResolvedValue(GUEST_ROW);
    (prisma.projects.deleteMany as jest.Mock).mockResolvedValue({ count: 0 });
    (projectService.canCreateProject as jest.Mock).mockResolvedValue(false);
    const guestService = await loadService();

    await expect(guestService.createSandbox()).rejects.toMatchObject({
      statusCode: STATUS_CODE.SERVICE_UNAVAILABLE,
      message: GUEST_MESSAGES.TRIAL_FULL,
    });
    expect(projectService.createProject).not.toHaveBeenCalled();
  });

  it("createSandbox fails rather than returning a sandbox with no group", async () => {
    (prisma.users.findUnique as jest.Mock).mockResolvedValue(GUEST_ROW);
    (prisma.projects.deleteMany as jest.Mock).mockResolvedValue({ count: 0 });
    (projectService.createProject as jest.Mock).mockResolvedValue({ public_id: "projectPubl" });
    (endpointGroupService.getAllEndpointGroups as jest.Mock).mockResolvedValue([]);
    const guestService = await loadService();

    await expect(guestService.createSandbox()).rejects.toBeDefined();
  });
});
