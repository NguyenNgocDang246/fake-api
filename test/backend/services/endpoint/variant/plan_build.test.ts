import type { AiChatResult } from "@/server/services/ai/ai.types";
import { AI_MESSAGES } from "@/server/services/ai/ai.constants";
import { ENDPOINT_AI_MESSAGES } from "@/server/services/endpoint/endpoint.constants";
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
