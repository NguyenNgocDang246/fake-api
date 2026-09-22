jest.mock("@/server/prisma/prisma_provider", () => {
  const scenarios = {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    deleteMany: jest.fn(),
  };
  return {
    __esModule: true,
    prisma: {
      endpoint_scenarios: scenarios,
      // The array form runs its statements in the order they were given, inside one
      // transaction, which is what the two-statement switch relies on.
      $transaction: jest.fn(async (arg: unknown) =>
        typeof arg === "function"
          ? (arg as (tx: unknown) => Promise<unknown>)({ endpoint_scenarios: scenarios })
          : Promise.all(arg as Promise<unknown>[])
      ),
    },
  };
});

jest.mock("@/app/libs/helpers/publicId", () => ({
  __esModule: true,
  ...jest.requireActual("@/app/libs/helpers/publicId"),
  generatePublicId: jest.fn(),
}));

jest.mock("@/server/services/user.service", () => ({
  __esModule: true,
  default: { getUserById: jest.fn() },
}));

import { prisma } from "@/server/prisma/prisma_provider";
import userService from "@/server/services/user.service";
import { generatePublicId } from "@/app/libs/helpers/publicId";
import scenarioService, {
  reconcileScenarios,
} from "@/server/services/endpoint/scenario.service";
import { AppError } from "@/server/core/errors";
import { ROLE_LIMITS } from "@/server/core/role_limits";

const row = (overrides: Record<string, unknown> = {}) => ({
  public_id: null,
  name: "Default",
  status_code: 200,
  response_body: '{"a":1}',
  response_headers: "[]",
  response_cookies: "[]",
  delay_ms: 0,
  ai_enabled: false,
  ai_fields: [],
  ai_prompt: null,
  ...overrides,
});

const tx = () => ({ endpoint_scenarios: prisma.endpoint_scenarios }) as never;

beforeEach(() => {
  let next = 0;
  (generatePublicId as jest.Mock).mockImplementation(() => `newscenario${String.fromCharCode(97 + next++)}`);
  (prisma.endpoint_scenarios.create as jest.Mock).mockImplementation(
    async ({ data }: { data: { public_id: string } }) => ({ public_id: data.public_id })
  );
  (prisma.endpoint_scenarios.update as jest.Mock).mockImplementation(
    async ({ where }: { where: { public_id: string } }) => ({ public_id: where.public_id })
  );
});

describe("reconcileScenarios", () => {
  it("creates a row for every scenario that has no id yet", async () => {
    (prisma.endpoint_scenarios.findMany as jest.Mock).mockResolvedValue([]);

    await reconcileScenarios(tx(), 1n, [row({ name: "OK" }), row({ name: "Denied" })], 0);

    expect(prisma.endpoint_scenarios.create).toHaveBeenCalledTimes(2);
    expect(prisma.endpoint_scenarios.update).toHaveBeenCalledTimes(1);
  });

  it("updates the row an id names instead of replacing it", async () => {
    (prisma.endpoint_scenarios.findMany as jest.Mock).mockResolvedValue([
      { id: 7n, public_id: "aaaaaaaaaaaa" },
    ]);

    await reconcileScenarios(tx(), 1n, [row({ public_id: "aaaaaaaaaaaa", name: "OK" })], 0);

    expect(prisma.endpoint_scenarios.create).not.toHaveBeenCalled();
    expect(prisma.endpoint_scenarios.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { public_id: "aaaaaaaaaaaa" } })
    );
  });

  it("deletes the rows the author removed from the pager", async () => {
    (prisma.endpoint_scenarios.findMany as jest.Mock).mockResolvedValue([
      { id: 7n, public_id: "aaaaaaaaaaaa" },
      { id: 8n, public_id: "bbbbbbbbbbbb" },
    ]);

    await reconcileScenarios(tx(), 1n, [row({ public_id: "aaaaaaaaaaaa" })], 0);

    expect(prisma.endpoint_scenarios.deleteMany).toHaveBeenCalledWith({
      where: { id: { in: [8n] } },
    });
  });

  it("numbers the positions from the order the pager sent them", async () => {
    (prisma.endpoint_scenarios.findMany as jest.Mock).mockResolvedValue([]);

    await reconcileScenarios(tx(), 1n, [row({ name: "a" }), row({ name: "b" })], 0);

    const positions = (prisma.endpoint_scenarios.create as jest.Mock).mock.calls.map(
      ([args]) => args.data.position
    );
    expect(positions).toEqual([0, 1]);
  });

  // The partial unique index holds at most one active row per endpoint, so every row is cleared
  // before any row claims it. Two rows claiming it inside one statement is a 23505.
  it("clears every active row before it marks the new one", async () => {
    (prisma.endpoint_scenarios.findMany as jest.Mock).mockResolvedValue([]);

    await reconcileScenarios(tx(), 1n, [row({ name: "a" }), row({ name: "b" })], 1);

    expect(prisma.endpoint_scenarios.updateMany).toHaveBeenCalledWith({
      where: { endpoints_id: 1n, is_active: true },
      data: { is_active: false },
    });
    expect(prisma.endpoint_scenarios.update).toHaveBeenLastCalledWith({
      where: { public_id: "newscenariob" },
      data: { is_active: true },
    });
  });

  // An id the request carried that this endpoint never had is not a row to touch: it belongs to
  // someone else's endpoint, or to nothing at all.
  it("treats an id this endpoint does not own as a new scenario", async () => {
    (prisma.endpoint_scenarios.findMany as jest.Mock).mockResolvedValue([]);

    await reconcileScenarios(tx(), 1n, [row({ public_id: "zzzzzzzzzzzz" })], 0);

    expect(prisma.endpoint_scenarios.create).toHaveBeenCalledTimes(1);
    expect(prisma.endpoint_scenarios.update).not.toHaveBeenCalledWith(
      expect.objectContaining({ where: { public_id: "zzzzzzzzzzzz" } })
    );
  });
});

describe("setActiveScenario", () => {
  it("deactivates the endpoint's rows before activating the named one", async () => {
    (prisma.endpoint_scenarios.findUnique as jest.Mock).mockResolvedValue({
      id: 9n,
      endpoints_id: 1n,
    });

    await scenarioService.setActiveScenario({ public_id: "aaaaaaaaaaaa" });

    // Deactivate first, then activate: the partial unique index cannot hold two active rows and
    // cannot be deferred, so the order inside the transaction is the whole point.
    expect(prisma.endpoint_scenarios.updateMany).toHaveBeenCalledWith({
      where: { endpoints_id: 1n, is_active: true },
      data: { is_active: false },
    });
    expect(prisma.endpoint_scenarios.update).toHaveBeenCalledWith({
      where: { id: 9n },
      data: { is_active: true },
    });
  });

  it("answers null for a scenario that is not there, rather than writing", async () => {
    (prisma.endpoint_scenarios.findUnique as jest.Mock).mockResolvedValue(null);

    await expect(
      scenarioService.setActiveScenario({ public_id: "aaaaaaaaaaaa" })
    ).resolves.toBeNull();
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("wraps error into AppError", async () => {
    (prisma.endpoint_scenarios.findUnique as jest.Mock).mockRejectedValue(new Error("db down"));

    await expect(
      scenarioService.setActiveScenario({ public_id: "aaaaaaaaaaaa" })
    ).rejects.toBeInstanceOf(AppError);
  });
});

describe("getScenariosOfEndpoint", () => {
  // Ordered by position, not by `updated_at` like every other list in this repo: a background
  // blueprint build would otherwise reshuffle the pages the author arranged.
  it("orders by the position the author arranged", async () => {
    (prisma.endpoint_scenarios.findMany as jest.Mock).mockResolvedValue([]);

    await scenarioService.getScenariosOfEndpoint({ endpoint_public_id: "aaaaaaaaaaaa" });

    expect(prisma.endpoint_scenarios.findMany).toHaveBeenCalledWith({
      where: { endpoints: { public_id: "aaaaaaaaaaaa" } },
      orderBy: [{ position: "asc" }, { id: "asc" }],
    });
  });
});

describe("canHoldScenarios", () => {
  it("lets a GUEST hold a second scenario", async () => {
    (userService.getUserById as jest.Mock).mockResolvedValue({ role: "GUEST" });

    await expect(
      scenarioService.canHoldScenarios({ user_public_id: "guestpubaaab", count: 2 })
    ).resolves.toBe(true);
  });

  it("refuses a GUEST the one past its cap", async () => {
    (userService.getUserById as jest.Mock).mockResolvedValue({ role: "GUEST" });

    await expect(
      scenarioService.canHoldScenarios({
        user_public_id: "guestpubaaab",
        count: ROLE_LIMITS.GUEST.maxScenariosPerEndpoint + 1,
      })
    ).resolves.toBe(false);
  });

  it("caps every other role by its own number", async () => {
    (userService.getUserById as jest.Mock).mockResolvedValue({ role: "USER" });

    await expect(
      scenarioService.canHoldScenarios({
        user_public_id: "userpubaaaab",
        count: ROLE_LIMITS.USER.maxScenariosPerEndpoint,
      })
    ).resolves.toBe(true);
    await expect(
      scenarioService.canHoldScenarios({
        user_public_id: "userpubaaaab",
        count: ROLE_LIMITS.USER.maxScenariosPerEndpoint + 1,
      })
    ).resolves.toBe(false);
  });

  it("refuses when the user is gone", async () => {
    (userService.getUserById as jest.Mock).mockResolvedValue(null);

    await expect(
      scenarioService.canHoldScenarios({ user_public_id: "goneaccountx", count: 1 })
    ).resolves.toBe(false);
  });
});
