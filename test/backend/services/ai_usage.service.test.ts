const txCount = jest.fn();
const txCreate = jest.fn();
const txQueryRaw = jest.fn();

jest.mock("@/server/prisma/prisma_provider", () => ({
  __esModule: true,
  prisma: {
    ai_usage_logs: { create: jest.fn(), count: jest.fn() },
    $transaction: (run: (tx: unknown) => unknown) =>
      run({
        $queryRaw: txQueryRaw,
        ai_usage_logs: { count: txCount, create: txCreate },
      }),
  },
}));

jest.mock("@/server/services/user.service", () => ({
  __esModule: true,
  default: { getUserById: jest.fn() },
}));

import aiUsageService from "@/server/services/ai_usage.service";
import userService from "@/server/services/user.service";
import { prisma } from "@/server/prisma/prisma_provider";
import { ROLE_LIMITS } from "@/server/core/role_limits";

const lockReturns = (row: { id: bigint; role: string } | undefined) =>
  txQueryRaw.mockResolvedValue(row ? [row] : []);

describe("trySpend", () => {
  it("locks the user row before it counts, so two claims cannot read the same total", async () => {
    lockReturns({ id: 5n, role: "USER" });
    txCount.mockResolvedValue(0);

    await aiUsageService.trySpend({ public_id: "aaaaaaaaaaaa" });

    // The lock has to be taken first: counting before it is what let two requests both pass.
    expect(txQueryRaw).toHaveBeenCalled();
    const sql = String(txQueryRaw.mock.calls[0]?.[0]);
    expect(sql).toContain("FOR UPDATE");
    expect(txQueryRaw.mock.invocationCallOrder[0]).toBeLessThan(
      txCount.mock.invocationCallOrder[0]!
    );
  });

  it("grants and records when the user is under their daily limit", async () => {
    lockReturns({ id: 5n, role: "USER" });
    txCount.mockResolvedValue(ROLE_LIMITS.USER.maxAiPlansPerDay - 1);

    await expect(aiUsageService.trySpend({ public_id: "aaaaaaaaaaaa" })).resolves.toEqual({
      id: 5n,
      public_id: "aaaaaaaaaaaa",
    });
    expect(txCreate).toHaveBeenCalledWith({ data: { users_id: 5n, kind: "plan" } });
  });

  it("refuses and records nothing once the limit is reached", async () => {
    lockReturns({ id: 5n, role: "USER" });
    txCount.mockResolvedValue(ROLE_LIMITS.USER.maxAiPlansPerDay);

    await expect(aiUsageService.trySpend({ public_id: "aaaaaaaaaaaa" })).resolves.toBeNull();
    expect(txCreate).not.toHaveBeenCalled();
  });

  it("refuses a role whose limit is zero without counting anything", async () => {
    lockReturns({ id: 5n, role: "GUEST" });

    await expect(aiUsageService.trySpend({ public_id: "aaaaaaaaaaaa" })).resolves.toBeNull();
    expect(txCount).not.toHaveBeenCalled();
    expect(txCreate).not.toHaveBeenCalled();
  });

  it("refuses an unknown user", async () => {
    lockReturns(undefined);

    await expect(aiUsageService.trySpend({ public_id: "aaaaaaaaaaaa" })).resolves.toBeNull();
    expect(txCreate).not.toHaveBeenCalled();
  });
});

describe("quotaFor", () => {
  const getUserById = userService.getUserById as jest.Mock;
  const count = prisma.ai_usage_logs.count as unknown as jest.Mock;

  it("reports the role's limit beside today's spend", async () => {
    getUserById.mockResolvedValue({ id: 5n, role: "USER" });
    count.mockResolvedValue(7);

    await expect(aiUsageService.quotaFor({ public_id: "aaaaaaaaaaaa" })).resolves.toEqual({
      limit: ROLE_LIMITS.USER.maxAiPlansPerDay,
      spent: 7,
    });
  });

  it("counts by the internal id, which is what the index is on", async () => {
    getUserById.mockResolvedValue({ id: 5n, role: "USER" });
    count.mockResolvedValue(0);

    await aiUsageService.quotaFor({ public_id: "aaaaaaaaaaaa" });

    expect(count).toHaveBeenCalledWith({
      where: { users_id: 5n, created_at: { gte: expect.any(Date) } },
    });
  });

  it("takes no lock, since nothing is being claimed", async () => {
    getUserById.mockResolvedValue({ id: 5n, role: "USER" });
    count.mockResolvedValue(0);
    txQueryRaw.mockClear();

    await aiUsageService.quotaFor({ public_id: "aaaaaaaaaaaa" });

    expect(txQueryRaw).not.toHaveBeenCalled();
  });

  it("reports a zero limit for a role with no AI", async () => {
    getUserById.mockResolvedValue({ id: 5n, role: "GUEST" });
    count.mockResolvedValue(0);

    await expect(aiUsageService.quotaFor({ public_id: "aaaaaaaaaaaa" })).resolves.toEqual({
      limit: 0,
      spent: 0,
    });
  });

  it("reports nothing spent for an unknown user", async () => {
    getUserById.mockResolvedValue(null);
    count.mockClear();

    await expect(aiUsageService.quotaFor({ public_id: "aaaaaaaaaaaa" })).resolves.toEqual({
      limit: 0,
      spent: 0,
    });
    expect(count).not.toHaveBeenCalled();
  });
});
