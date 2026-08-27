import type { AiChatResult } from "@/server/services/ai/ai.types";
import { AI_MESSAGES } from "@/server/services/ai/ai.constants";
import { ENDPOINT_AI_MESSAGES } from "@/server/services/endpoint/endpoint.constants";
import { MAX_CATALOG_ROWS } from "@/models/endpoint_plan/limits.model";
import {
  chatMock,
  isAiConfiguredMock,
  prisma,
  aiUsageService,
  endpointVariantPlanService,
  buildPlan,
  planHash,
  BODY,
  FIELDS,
  PLAN,
  endpoint,
  respond,
} from "./plan_harness";

describe("buildPlan", () => {
  const input = {
    method: "GET",
    path: "/user",
    responseBody: BODY,
    aiFields: FIELDS,
    aiPrompt: null,
  };

  it("accepts a blueprint the model returns inside markdown fences", async () => {
    respond("```json\n" + JSON.stringify(PLAN) + "\n```");

    await expect(buildPlan(input)).resolves.toMatchObject({ version: 1 });
    expect(chatMock).toHaveBeenCalledTimes(1);
  });

  it("asks once for a repair when the first blueprint is rejected, carrying the reasons back", async () => {
    const broken = { ...PLAN, fields: [{ path: "name", recipe: { kind: "int", min: 1, max: 2 } }] };
    chatMock
      .mockResolvedValueOnce({ text: JSON.stringify(broken) } as AiChatResult)
      .mockResolvedValueOnce({ text: JSON.stringify(PLAN) } as AiChatResult);

    await expect(buildPlan(input)).resolves.toMatchObject({ version: 1 });
    expect(chatMock).toHaveBeenCalledTimes(2);

    const repair = chatMock.mock.calls[1]![0];
    expect(repair.messages).toHaveLength(3);
    expect(String(repair.messages[2]!.content)).toContain("produces number where the body holds string");
  });

  it("gives up after the repair rather than storing something broken", async () => {
    const consoleError = jest.spyOn(console, "error").mockImplementation(() => {});
    respond(JSON.stringify({ version: 1, fields: [] }));

    await expect(buildPlan(input)).rejects.toMatchObject({ message: AI_MESSAGES.PROVIDER_FAILED });
    expect(chatMock).toHaveBeenCalledTimes(2);
    consoleError.mockRestore();
  });

  it("refuses a blueprint that writes a path the user never selected", async () => {
    const consoleError = jest.spyOn(console, "error").mockImplementation(() => {});
    respond(
      JSON.stringify({
        ...PLAN,
        fields: [{ path: "items[].price", recipe: { kind: "int", min: 1, max: 9 } }],
      })
    );

    await expect(buildPlan(input)).rejects.toBeDefined();
    consoleError.mockRestore();
  });

  it("stops at a truncated answer instead of paying for a repair that cannot fit either", async () => {
    const consoleError = jest.spyOn(console, "error").mockImplementation(() => {});
    chatMock.mockResolvedValue({
      text: JSON.stringify(PLAN).slice(0, 40),
      stopReason: "max_tokens",
    } as AiChatResult);

    await expect(buildPlan(input)).rejects.toMatchObject({
      message: ENDPOINT_AI_MESSAGES.PLAN_TOO_LARGE,
      statusCode: 400,
    });
    expect(chatMock).toHaveBeenCalledTimes(1);
    consoleError.mockRestore();
  });

  it("still repairs a broken answer that was not truncated", async () => {
    const consoleError = jest.spyOn(console, "error").mockImplementation(() => {});
    respond("not json at all");

    await expect(buildPlan(input)).rejects.toMatchObject({
      message: AI_MESSAGES.PROVIDER_FAILED,
    });
    expect(chatMock).toHaveBeenCalledTimes(2);
    consoleError.mockRestore();
  });

  it("treats a blueprint over the byte limit as one to repair, not one to hand back", async () => {
    const consoleError = jest.spyOn(console, "error").mockImplementation(() => {});
    const bloated = {
      ...PLAN,
      catalogs: [
        {
          id: "c",
          columns: ["a"],
          rows: Array.from({ length: MAX_CATALOG_ROWS }, () => ["x".repeat(160)]),
        },
      ],
      fields: Array.from({ length: 40 }, () => ({
        path: "name",
        recipe: { kind: "pick", values: Array.from({ length: 24 }, () => "y".repeat(160)) },
      })),
    };
    chatMock
      .mockResolvedValueOnce({ text: JSON.stringify(bloated) } as AiChatResult)
      .mockResolvedValueOnce({ text: JSON.stringify(PLAN) } as AiChatResult);

    await expect(buildPlan(input)).resolves.toMatchObject({ version: 1 });
    expect(chatMock).toHaveBeenCalledTimes(2);
    expect(String(chatMock.mock.calls[1]![0].messages[2]!.content)).toContain("byte limit");
    consoleError.mockRestore();
  });

  it("fences the body and the hint, with a nonce that changes every call", async () => {
    respond(JSON.stringify(PLAN));

    await buildPlan({ ...input, aiPrompt: "prices from 10k to 500k" });
    await buildPlan({ ...input, aiPrompt: "prices from 10k to 500k" });

    const nonceOf = (call: number) =>
      String(chatMock.mock.calls[call]![0].messages[0]!.content).match(
        /<author_hint id="([^"]+)">/
      )?.[1];

    expect(nonceOf(0)).toBeDefined();
    expect(nonceOf(0)).not.toBe(nonceOf(1));

    const message = String(chatMock.mock.calls[0]![0].messages[0]!.content);
    expect(message).toContain(`<response_body id="${nonceOf(0)}">`);
    expect(message).toContain("prices from 10k to 500k");
  });

  it("keeps the system turn free of anything the author wrote, so it can be cached", async () => {
    respond(JSON.stringify(PLAN));

    await buildPlan({ ...input, aiPrompt: "make every buyer a florist" });

    const system = chatMock.mock.calls[0]![0].system as { text: string; cacheable?: boolean }[];
    expect(system).toHaveLength(1);
    expect(system[0]!.cacheable).toBe(true);
    expect(system[0]!.text).not.toContain("make every buyer a florist");
    expect(system[0]!.text).not.toContain('"An"');
  });

  it("rejects a body that is not a JSON object before calling anything", async () => {
    await expect(buildPlan({ ...input, responseBody: "[1,2]" })).rejects.toMatchObject({
      message: ENDPOINT_AI_MESSAGES.INVALID_BASE_BODY,
    });
    expect(chatMock).not.toHaveBeenCalled();
  });

  it("tells an empty selection apart from one that lost every usable path", async () => {
    await expect(buildPlan({ ...input, aiFields: [] })).rejects.toMatchObject({
      message: ENDPOINT_AI_MESSAGES.NO_FIELDS_SELECTED,
    });
    await expect(buildPlan({ ...input, aiFields: ["nope"] })).rejects.toMatchObject({
      message: ENDPOINT_AI_MESSAGES.FIELDS_NOT_PATCHABLE,
    });
    expect(chatMock).not.toHaveBeenCalled();
  });
});

// `$executeRaw` is a tagged template, so the SQL arrives as the strings either side of each
// interpolation.
function statementsRun(): string[] {
  return (prisma.$executeRaw as unknown as jest.Mock).mock.calls.map((call) =>
    (call[0] as string[]).join("?")
  );
}

describe("ensurePlan", () => {
  beforeEach(() => {
    isAiConfiguredMock.mockReturnValue(true);
    (aiUsageService.trySpend as jest.Mock).mockResolvedValue({ id: 9n, public_id: "u" });
    (prisma.$executeRaw as unknown as jest.Mock).mockResolvedValue(1);
    (prisma.endpoints.findUnique as jest.Mock).mockResolvedValue({
      ai_plan_started_at: null,
      endpoint_groups: { projects: { users: { id: 5n, public_id: "u" } } },
    });
  });

  it("returns the stored blueprint without touching a model", async () => {
    await expect(endpointVariantPlanService.ensurePlan(endpoint())).resolves.toMatchObject({
      version: 1,
    });
    expect(chatMock).not.toHaveBeenCalled();
  });

  it("does nothing when AI is off or unconfigured", async () => {
    await expect(
      endpointVariantPlanService.ensurePlan(endpoint({ ai_enabled: false }))
    ).resolves.toBeNull();

    isAiConfiguredMock.mockReturnValue(false);
    await expect(
      endpointVariantPlanService.ensurePlan(endpoint({ ai_plan: null }))
    ).resolves.toBeNull();
    expect(chatMock).not.toHaveBeenCalled();
  });

  it("stops at the quota without spending a call", async () => {
    (aiUsageService.trySpend as jest.Mock).mockResolvedValue(null);

    await expect(
      endpointVariantPlanService.ensurePlan(endpoint({ ai_plan: null }))
    ).resolves.toBeNull();
    expect(chatMock).not.toHaveBeenCalled();
  });

  it("hands the lock back when the quota refuses, since nothing reached a provider", async () => {
    (aiUsageService.trySpend as jest.Mock).mockResolvedValue(null);

    await endpointVariantPlanService.ensurePlan(endpoint({ ai_plan: null }));

    expect(statementsRun().some((sql) => sql.includes(`"ai_plan_started_at" = NULL`))).toBe(true);
  });

  it("gives up quietly when the lock is already held", async () => {
    (prisma.$executeRaw as unknown as jest.Mock).mockResolvedValue(0);

    await expect(
      endpointVariantPlanService.ensurePlan(endpoint({ ai_plan: null }))
    ).resolves.toBeNull();
    expect(chatMock).not.toHaveBeenCalled();
  });

  it("discards its own work when an edit took the lock mid build", async () => {
    const consoleWarn = jest.spyOn(console, "warn").mockImplementation(() => {});
    respond(JSON.stringify(PLAN));
    // The lock row no longer carries this build's timestamp, so an edit landed in between.
    (prisma.endpoints.findUnique as jest.Mock).mockResolvedValue({
      ai_plan_started_at: new Date(0),
      endpoint_groups: { projects: { users: { id: 5n, public_id: "u" } } },
    });

    await expect(
      endpointVariantPlanService.ensurePlan(endpoint({ ai_plan: null }))
    ).resolves.toBeNull();
    expect(consoleWarn).toHaveBeenCalled();
    consoleWarn.mockRestore();
  });

  it("never throws, because every caller runs it after the response was sent", async () => {
    const consoleError = jest.spyOn(console, "error").mockImplementation(() => {});
    chatMock.mockRejectedValue(new Error("provider down"));

    await expect(
      endpointVariantPlanService.ensurePlan(endpoint({ ai_plan: null }))
    ).resolves.toBeNull();
    expect(consoleError).toHaveBeenCalled();
    consoleError.mockRestore();
  });
});

describe("adoptPlan", () => {
  const hashOf = (fields: string[]) =>
    planHash({ responseBody: BODY, aiFields: fields, aiPrompt: null });

  beforeEach(() => {
    (prisma.$executeRaw as unknown as jest.Mock).mockResolvedValue(1);
  });

  it("stores a blueprint built for these inputs without reaching a model", async () => {
    await expect(
      endpointVariantPlanService.adoptPlan(endpoint({ ai_plan: null }), PLAN, hashOf(FIELDS))
    ).resolves.toBe(true);

    expect(chatMock).not.toHaveBeenCalled();
    expect(aiUsageService.trySpend).not.toHaveBeenCalled();
    expect(statementsRun().some((sql) => sql.includes(`"ai_plan" =`))).toBe(true);
  });

  it("refuses one built for different inputs", async () => {
    await expect(
      endpointVariantPlanService.adoptPlan(endpoint({ ai_plan: null }), PLAN, hashOf(["name"]))
    ).resolves.toBe(false);

    expect(statementsRun()).toHaveLength(0);
  });

  it("refuses one the hash fits but the body does not, so the hash never stands alone", async () => {
    // The hash is honestly this endpoint's, and the blueprint still writes `age`, which is no
    // longer selected. Only `validatePlan` can see that.
    const narrowed = endpoint({ ai_plan: null, ai_fields: ["name"] });

    await expect(
      endpointVariantPlanService.adoptPlan(narrowed, PLAN, hashOf(["name"]))
    ).resolves.toBe(false);

    expect(statementsRun()).toHaveLength(0);
  });
});
