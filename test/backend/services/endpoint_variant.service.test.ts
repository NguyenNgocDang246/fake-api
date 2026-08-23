jest.mock("@/server/prisma/prisma_provider", () => ({
  __esModule: true,
  prisma: {
    endpoint_ai_variants: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
      createMany: jest.fn(),
      deleteMany: jest.fn(),
    },
    endpoints: {
      findUnique: jest.fn(),
    },
    $executeRaw: jest.fn(),
  },
}));

jest.mock("@/server/services/endpoint/endpoint_variant_generator.service", () => ({
  __esModule: true,
  generateVariants: jest.fn(),
}));

jest.mock("@/server/services/user.service", () => ({
  __esModule: true,
  default: { getUserById: jest.fn() },
}));

jest.mock("@/server/services/ai/ai_router.service", () => ({
  __esModule: true,
  isAiConfigured: jest.fn(() => true),
}));

import { prisma } from "@/server/prisma/prisma_provider";
import { generateVariants } from "@/server/services/endpoint/endpoint_variant_generator.service";
import userService from "@/server/services/user.service";
import { isAiConfigured } from "@/server/services/ai/ai_router.service";
import endpointVariantService from "@/server/services/endpoint/endpoint_variant.service";
import { AI_POOL_LOW_WATER, AI_POOL_SIZE } from "@/server/services/endpoint/endpoint.constants";
import { ROLE_LIMITS } from "@/server/core/role_limits";

const ENDPOINT_ID = 7n;

const endpoint = {
  id: ENDPOINT_ID,
  method: "GET",
  path: "/user/:id",
  response_body: '{"name":"An"}',
  ai_enabled: true,
  ai_fields: ["name"],
  ai_prompt: null,
};

function mockCounts({ usable, today = 0 }: { usable: number; today?: number }) {
  (prisma.endpoint_ai_variants.count as jest.Mock).mockImplementation(async (args) => {
    const where = args?.where ?? {};
    return where.created_at ? today : usable;
  });
}

function takenLockTimestamp(): Date | null {
  const calls = (prisma.$executeRaw as unknown as jest.Mock).mock.calls;
  return calls[0]?.find((value: unknown) => value instanceof Date) ?? null;
}

function mockOwner(role = "USER", { lockHeld = true } = {}) {
  (prisma.endpoints.findUnique as jest.Mock).mockImplementation(async (args) => {
    if (args?.select?.ai_refill_started_at) {
      return { ai_refill_started_at: lockHeld ? takenLockTimestamp() : null };
    }
    return { endpoint_groups: { projects: { users: { public_id: "u1" } } } };
  });
  (userService.getUserById as jest.Mock).mockResolvedValue({ role });
}

describe("pickVariant", () => {
  it("asks for the least used variant, ties broken by id", async () => {
    (prisma.endpoint_ai_variants.findFirst as jest.Mock).mockResolvedValue({
      id: 1n,
      response_body: "{}",
    });

    await endpointVariantService.pickVariant(ENDPOINT_ID);

    expect(prisma.endpoint_ai_variants.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { endpoints_id: ENDPOINT_ID },
        orderBy: [{ used_count: "asc" }, { id: "asc" }],
      })
    );
  });

  it("returns null on an empty pool so the caller can use the base body", async () => {
    (prisma.endpoint_ai_variants.findFirst as jest.Mock).mockResolvedValue(null);

    await expect(endpointVariantService.pickVariant(ENDPOINT_ID)).resolves.toBeNull();
  });

  it("reads a single row rather than loading the whole pool", async () => {
    (prisma.endpoint_ai_variants.findFirst as jest.Mock).mockResolvedValue(null);

    await endpointVariantService.pickVariant(ENDPOINT_ID);

    expect(prisma.endpoint_ai_variants.findMany).not.toHaveBeenCalled();
  });
});

describe("needsRefill", () => {
  it("is true when too few variants still have uses left", async () => {
    mockCounts({ usable: AI_POOL_LOW_WATER - 1 });

    await expect(endpointVariantService.needsRefill(ENDPOINT_ID)).resolves.toBe(true);
  });

  it("is true when every variant is worn out", async () => {
    mockCounts({ usable: 0 });

    await expect(endpointVariantService.needsRefill(ENDPOINT_ID)).resolves.toBe(true);
  });

  it("is false for a full pool that is still fresh", async () => {
    mockCounts({ usable: AI_POOL_SIZE });

    await expect(endpointVariantService.needsRefill(ENDPOINT_ID)).resolves.toBe(false);
  });

  it("asks the database a single question", async () => {
    mockCounts({ usable: AI_POOL_SIZE });

    await endpointVariantService.needsRefill(ENDPOINT_ID);

    expect(prisma.endpoint_ai_variants.count).toHaveBeenCalledTimes(1);
    expect(prisma.endpoint_ai_variants.findFirst).not.toHaveBeenCalled();
  });
});

describe("refillIfNeeded", () => {
  it("does nothing when the pool is still healthy", async () => {
    mockCounts({ usable: AI_POOL_SIZE });

    await expect(endpointVariantService.refillIfNeeded(endpoint)).resolves.toBe(0);
    expect(generateVariants).not.toHaveBeenCalled();
    expect(prisma.$executeRaw).not.toHaveBeenCalled();
  });

  it("gives up when another process already holds the lock", async () => {
    mockCounts({ usable: 0 });
    (prisma.$executeRaw as unknown as jest.Mock).mockResolvedValue(0);

    await expect(endpointVariantService.refillIfNeeded(endpoint)).resolves.toBe(0);
    expect(generateVariants).not.toHaveBeenCalled();
  });

  it("generates only the missing variants and releases the lock", async () => {
    mockCounts({ usable: 2 });
    mockOwner();
    (prisma.$executeRaw as unknown as jest.Mock).mockResolvedValue(1);
    (generateVariants as jest.Mock).mockResolvedValue({ bodies: ['{"name":"Binh"}'] });
    (prisma.endpoint_ai_variants.createMany as jest.Mock).mockResolvedValue({ count: 1 });
    (prisma.endpoint_ai_variants.findMany as jest.Mock).mockResolvedValue([]);

    await expect(endpointVariantService.refillIfNeeded(endpoint)).resolves.toBe(1);

    expect(generateVariants).toHaveBeenCalledWith(
      expect.objectContaining({ count: AI_POOL_SIZE - 2 })
    );
    expect(prisma.$executeRaw).toHaveBeenCalledTimes(2);
  });

  it("replaces a full pool whose variants are all worn out", async () => {
    mockCounts({ usable: 0 });
    mockOwner();
    (prisma.$executeRaw as unknown as jest.Mock).mockResolvedValue(1);
    (generateVariants as jest.Mock).mockResolvedValue({ bodies: ['{"name":"Binh"}'] });
    (prisma.endpoint_ai_variants.createMany as jest.Mock).mockResolvedValue({ count: AI_POOL_SIZE });
    (prisma.endpoint_ai_variants.findMany as jest.Mock).mockResolvedValue([]);

    await expect(endpointVariantService.refillIfNeeded(endpoint)).resolves.toBe(AI_POOL_SIZE);
    expect(generateVariants).toHaveBeenCalledWith(
      expect.objectContaining({ count: AI_POOL_SIZE })
    );
  });

  it("releases the lock when another process filled the pool first", async () => {
    let usable = 0;
    (prisma.endpoint_ai_variants.count as jest.Mock).mockImplementation(async () => {
      const answer = usable;
      usable = AI_POOL_SIZE;
      return answer;
    });
    (prisma.$executeRaw as unknown as jest.Mock).mockResolvedValue(1);

    await expect(endpointVariantService.refillIfNeeded(endpoint)).resolves.toBe(0);
    expect(generateVariants).not.toHaveBeenCalled();
    expect(prisma.$executeRaw).toHaveBeenCalledTimes(2);
  });

  it("hands the lock back with the timestamp it took it with", async () => {
    mockCounts({ usable: 2 });
    mockOwner();
    (prisma.$executeRaw as unknown as jest.Mock).mockResolvedValue(1);
    (generateVariants as jest.Mock).mockResolvedValue({ bodies: ['{"name":"Binh"}'] });
    (prisma.endpoint_ai_variants.createMany as jest.Mock).mockResolvedValue({ count: 1 });
    (prisma.endpoint_ai_variants.findMany as jest.Mock).mockResolvedValue([]);

    await endpointVariantService.refillIfNeeded(endpoint);

    const calls = (prisma.$executeRaw as unknown as jest.Mock).mock.calls;
    const written = calls[0].find((value: unknown) => value instanceof Date) as Date;
    const cleared = calls[1].find((value: unknown) => value instanceof Date) as Date;
    expect(cleared.getTime()).toBe(written.getTime());
  });

  it("discards its work when the lock was taken away mid-generation", async () => {
    const consoleWarn = jest.spyOn(console, "warn").mockImplementation(() => {});
    mockCounts({ usable: 0 });
    mockOwner("USER", { lockHeld: false });
    (prisma.$executeRaw as unknown as jest.Mock).mockResolvedValue(1);
    (generateVariants as jest.Mock).mockResolvedValue({ bodies: ['{"name":"Binh"}'] });

    await expect(endpointVariantService.refillIfNeeded(endpoint)).resolves.toBe(0);

    expect(generateVariants).toHaveBeenCalled();
    expect(prisma.endpoint_ai_variants.createMany).not.toHaveBeenCalled();
    expect(consoleWarn).toHaveBeenCalled();

    consoleWarn.mockRestore();
  });

  it("still stores when it holds the same lock it took", async () => {
    mockCounts({ usable: 0 });
    mockOwner("USER", { lockHeld: true });
    (prisma.$executeRaw as unknown as jest.Mock).mockResolvedValue(1);
    (generateVariants as jest.Mock).mockResolvedValue({ bodies: ['{"name":"Binh"}'] });
    (prisma.endpoint_ai_variants.createMany as jest.Mock).mockResolvedValue({ count: 1 });
    (prisma.endpoint_ai_variants.findMany as jest.Mock).mockResolvedValue([]);

    await expect(endpointVariantService.refillIfNeeded(endpoint)).resolves.toBe(1);
    expect(prisma.endpoint_ai_variants.createMany).toHaveBeenCalled();
  });

  it("keeps the lock as a cooldown when the owner's daily quota is spent", async () => {
    mockCounts({ usable: 0, today: ROLE_LIMITS.USER.maxAiVariantsPerDay });
    mockOwner();
    (prisma.$executeRaw as unknown as jest.Mock).mockResolvedValue(1);

    await expect(endpointVariantService.refillIfNeeded(endpoint)).resolves.toBe(0);
    expect(generateVariants).not.toHaveBeenCalled();
    expect(prisma.$executeRaw).toHaveBeenCalledTimes(1);
  });

  it("swallows a generator failure and keeps the lock as a cooldown", async () => {
    const consoleError = jest.spyOn(console, "error").mockImplementation(() => {});
    mockCounts({ usable: 0 });
    mockOwner();
    (prisma.$executeRaw as unknown as jest.Mock).mockResolvedValue(1);
    (generateVariants as jest.Mock).mockRejectedValue(new Error("provider down"));

    await expect(endpointVariantService.refillIfNeeded(endpoint)).resolves.toBe(0);
    expect(prisma.$executeRaw).toHaveBeenCalledTimes(1);
    expect(consoleError).toHaveBeenCalled();

    consoleError.mockRestore();
  });

  it("logs and keeps the lock when the model returns no usable body", async () => {
    const consoleWarn = jest.spyOn(console, "warn").mockImplementation(() => {});
    mockCounts({ usable: 0 });
    mockOwner();
    (prisma.$executeRaw as unknown as jest.Mock).mockResolvedValue(1);
    (generateVariants as jest.Mock).mockResolvedValue({ bodies: [] });

    await expect(endpointVariantService.refillIfNeeded(endpoint)).resolves.toBe(0);
    expect(prisma.endpoint_ai_variants.createMany).not.toHaveBeenCalled();
    expect(prisma.$executeRaw).toHaveBeenCalledTimes(1);
    expect(consoleWarn).toHaveBeenCalled();

    consoleWarn.mockRestore();
  });

  it("skips an endpoint with no selected fields", async () => {
    await expect(
      endpointVariantService.refillIfNeeded({ ...endpoint, ai_fields: [] })
    ).resolves.toBe(0);
    expect(prisma.endpoint_ai_variants.count).not.toHaveBeenCalled();
  });

  it("does not take the lock when this server has no AI configured", async () => {
    (isAiConfigured as jest.Mock).mockReturnValueOnce(false);
    mockCounts({ usable: 0 });

    await expect(endpointVariantService.refillIfNeeded(endpoint)).resolves.toBe(0);
    expect(prisma.$executeRaw).not.toHaveBeenCalled();
    expect(prisma.endpoint_ai_variants.count).not.toHaveBeenCalled();
    expect(generateVariants).not.toHaveBeenCalled();
  });
});

describe("clearVariants", () => {
  it("deletes every variant of the endpoint", async () => {
    (prisma.endpoint_ai_variants.deleteMany as jest.Mock).mockResolvedValue({ count: 4 });

    await expect(endpointVariantService.clearVariants(ENDPOINT_ID)).resolves.toEqual({ count: 4 });
    expect(prisma.endpoint_ai_variants.deleteMany).toHaveBeenCalledWith({
      where: { endpoints_id: ENDPOINT_ID },
    });
  });

  it("drops the refill cooldown so a corrective edit is not made to wait it out", async () => {
    (prisma.endpoint_ai_variants.deleteMany as jest.Mock).mockResolvedValue({ count: 0 });

    await endpointVariantService.clearVariants(ENDPOINT_ID);

    expect(prisma.$executeRaw).toHaveBeenCalledTimes(1);
    expect(prisma.endpoints.update).toBeUndefined();
  });
});

describe("prunePool", () => {
  it("keeps the freshest pool and drops the worn tail", async () => {
    (prisma.endpoint_ai_variants.findMany as jest.Mock).mockResolvedValue([{ id: 9n }]);
    (prisma.endpoint_ai_variants.deleteMany as jest.Mock).mockResolvedValue({ count: 1 });

    await expect(endpointVariantService.prunePool(ENDPOINT_ID)).resolves.toBe(1);

    expect(prisma.endpoint_ai_variants.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: [{ used_count: "asc" }, { created_at: "desc" }],
        skip: AI_POOL_SIZE,
      })
    );
    expect(prisma.endpoint_ai_variants.deleteMany).toHaveBeenCalledWith({
      where: { id: { in: [9n] } },
    });
  });

  it("deletes nothing when the pool is not over size", async () => {
    (prisma.endpoint_ai_variants.findMany as jest.Mock).mockResolvedValue([]);

    await expect(endpointVariantService.prunePool(ENDPOINT_ID)).resolves.toBe(0);
    expect(prisma.endpoint_ai_variants.deleteMany).not.toHaveBeenCalled();
  });
});

describe("canRefill", () => {
  it("resolves the owning user and applies the same daily quota", async () => {
    mockOwner();
    mockCounts({ usable: 0, today: ROLE_LIMITS.USER.maxAiVariantsPerDay });

    await expect(endpointVariantService.canRefill(ENDPOINT_ID)).resolves.toBe(false);
  });

  it("refuses an endpoint whose owner cannot be resolved", async () => {
    (prisma.endpoints.findUnique as jest.Mock).mockResolvedValue(null);

    await expect(endpointVariantService.canRefill(ENDPOINT_ID)).resolves.toBe(false);
    expect(userService.getUserById).not.toHaveBeenCalled();
  });
});

describe("canGenerate", () => {
  it("refuses a role whose daily allowance is zero", async () => {
    (userService.getUserById as jest.Mock).mockResolvedValue({ role: "GUEST" });

    await expect(endpointVariantService.canGenerate({ public_id: "u1" })).resolves.toBe(false);
    expect(prisma.endpoint_ai_variants.count).not.toHaveBeenCalled();
  });

  it("allows a user still under the daily quota", async () => {
    (userService.getUserById as jest.Mock).mockResolvedValue({ role: "USER" });
    (prisma.endpoint_ai_variants.count as jest.Mock).mockResolvedValue(1);

    await expect(endpointVariantService.canGenerate({ public_id: "u1" })).resolves.toBe(true);
  });

  it("refuses a user who has hit the daily quota", async () => {
    (userService.getUserById as jest.Mock).mockResolvedValue({ role: "USER" });
    (prisma.endpoint_ai_variants.count as jest.Mock).mockResolvedValue(50);

    await expect(endpointVariantService.canGenerate({ public_id: "u1" })).resolves.toBe(false);
  });

  it("counts only variants created since midnight", async () => {
    (userService.getUserById as jest.Mock).mockResolvedValue({ role: "USER" });
    (prisma.endpoint_ai_variants.count as jest.Mock).mockResolvedValue(0);

    await endpointVariantService.canGenerate({ public_id: "u1" });

    const where = (prisma.endpoint_ai_variants.count as jest.Mock).mock.calls[0][0].where;
    const since = where.created_at.gte as Date;
    expect(since.getHours()).toBe(0);
    expect(since.getMinutes()).toBe(0);
  });
});
