import type { AiChatParams, AiChatResult } from "@/server/services/ai/ai.types";

const chatMock = jest.fn<Promise<AiChatResult>, [AiChatParams]>();
const isAiConfiguredMock = jest.fn<boolean, []>();

jest.mock("@/server/services/ai/ai_router.service", () => ({
  __esModule: true,
  default: { chat: (params: AiChatParams) => chatMock(params) },
  isAiConfigured: () => isAiConfiguredMock(),
}));

jest.mock("@/server/services/ai_usage.service", () => ({
  __esModule: true,
  default: { record: jest.fn(), trySpend: jest.fn(), isAiAllowed: jest.fn() },
}));

jest.mock("@/server/prisma/prisma_provider", () => ({
  __esModule: true,
  prisma: {
    $executeRaw: jest.fn(),
    endpoints: { findUnique: jest.fn() },
  },
}));

import { VariantPlanDTO } from "@/models/endpoint_plan/endpoint_plan.model";
import { prisma } from "@/server/prisma/prisma_provider";
import aiUsageService from "@/server/services/ai_usage.service";
import endpointVariantPlanService, {
  PlanEndpoint,
  buildPlan,
  planHash,
  splitSelection,
} from "@/server/services/endpoint/variant/plan.service";

const BODY = '{"name":"An","age":3,"items":[{"price":1}]}';
const FIELDS = ["name", "age"];

const PLAN: VariantPlanDTO = {
  version: 1,
  locale: "en",
  entities: [],
  catalogs: [],
  unapplied_hints: [],
  unsupported_language: null,
  fields: [
    { path: "name", recipe: { kind: "semantic", name: "full_name" } },
    { path: "age", recipe: { kind: "int", min: 18, max: 70 } },
  ],
};

function endpoint(overrides: Partial<PlanEndpoint> = {}): PlanEndpoint {
  return {
    id: 1n,
    method: "GET",
    path: "/user",
    response_body: BODY,
    ai_enabled: true,
    ai_fields: FIELDS,
    ai_prompt: null,
    ai_plan: JSON.stringify(PLAN),
    ai_plan_hash: planHash({ responseBody: BODY, aiFields: FIELDS, aiPrompt: null }),
    ...overrides,
  };
}

function respond(text: string): void {
  chatMock.mockResolvedValue({
    text,
    provider: "anthropic",
    model: "claude-opus-5",
    stopReason: "stop",
  } as AiChatResult);
}

export {
  chatMock,
  isAiConfiguredMock,
  prisma,
  aiUsageService,
  endpointVariantPlanService,
  buildPlan,
  planHash,
  splitSelection,
  BODY,
  FIELDS,
  PLAN,
  endpoint,
  respond,
};
export type { PlanEndpoint };
