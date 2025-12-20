jest.mock("@/server/prisma/prisma_provider", () => ({
  __esModule: true,
  prisma: {
    users: {
      findMany: jest.fn(),
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  },
}));

import { prisma } from "@/server/prisma/prisma_provider";
import userService from "@/server/services/user.service";
import { AppError } from "@/server/core/errors";

describe("src/server/services/user.service.ts", () => {
  it("getAllUsers returns prisma.users.findMany result", async () => {
    (prisma.users.findMany as jest.Mock).mockResolvedValue([{ id: 1n }]);
    await expect(userService.getAllUsers()).resolves.toEqual([{ id: 1n }]);
  });

  it("createUser wraps error into AppError", async () => {
    (prisma.users.create as jest.Mock).mockRejectedValue(new Error("db down"));
    await expect(
      userService.createUser({ name: "A", email: "a@b.com", password: "pw" })
    ).rejects.toBeInstanceOf(AppError);
  });

  it("increaseTokenVersion calls prisma.users.update with increment", async () => {
    (prisma.users.update as jest.Mock).mockResolvedValue({ id: 1n });
    await userService.increaseTokenVersion({ id: 1n });
    expect(prisma.users.update).toHaveBeenCalledWith({
      where: { id: 1n },
      data: { token_version: { increment: 1 } },
    });
  });
});

