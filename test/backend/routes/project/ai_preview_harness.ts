jest.mock("@/server/services/endpoint_group.service", () => ({
  __esModule: true,
  default: { checkPermission: jest.fn() },
}));

jest.mock("@/server/services/endpoint/endpoint.service", () => ({
  __esModule: true,
  default: { getEndpointInGroup: jest.fn() },
}));

jest.mock("@/server/services/ai_usage.service", () => ({
  __esModule: true,
  default: {
    record: jest.fn(),
    trySpend: jest.fn(),
    isAiAllowed: jest.fn(),
    quotaFor: jest.fn(),
  },
}));

jest.mock("@/server/services/user.service", () => ({
  __esModule: true,
  default: { getUserById: jest.fn() },
}));

jest.mock("@/server/services/endpoint/variant/plan.service", () => {
  const actual = jest.requireActual<
    typeof import("@/server/services/endpoint/variant/plan.service")
  >("@/server/services/endpoint/variant/plan.service");

  return {
    __esModule: true,
    ...actual,
    // Only the model call is faked; the hash and the selection split stay real, because they
    // are what decides whether a caller's cached blueprint is reused.
    buildPlan: jest.fn(),
  };
});

jest.mock("@/server/services/ai/ai_router.service", () => ({
  __esModule: true,
  isAiConfigured: jest.fn(),
  default: { chat: jest.fn() },
}));

import endpointGroupService from "@/server/services/endpoint_group.service";
import endpointService from "@/server/services/endpoint/endpoint.service";
import aiUsageService from "@/server/services/ai_usage.service";
import userService from "@/server/services/user.service";
import { buildPlan, planHash } from "@/server/services/endpoint/variant/plan.service";
import { isAiConfigured } from "@/server/services/ai/ai_router.service";
import { POST } from "@/app/api/project/[projectId]/endpoint-group/[endpointGroupId]/endpoint/ai-preview/route";
import { createJsonRequest, readJson } from "../../helpers/http";

const USER_PUBLIC_ID = "aaaaaaaaaaaa";
const PROJECT_PUBLIC_ID = "bbbbbbbbbbbb";
const GROUP_PUBLIC_ID = "cccccccccccc";

const props = () => ({
  params: Promise.resolve({
    projectId: PROJECT_PUBLIC_ID,
    endpointGroupId: GROUP_PUBLIC_ID,
  }),
});

const VALID_BODY = {
  method: "GET",
  path: "/user",
  response_body: '{"name":"An"}',
  ai_fields: ["name"],
  ai_prompt: null,
  count: 3,
};

const PLAN = {
  version: 1,
  locale: "en",
  entities: [],
  catalogs: [],
  unapplied_hints: [],
  fields: [{ path: "name", recipe: { kind: "semantic", name: "full_name" } }],
};

function post(body: object = VALID_BODY, headers: Record<string, string> = {}) {
  return POST(
    createJsonRequest(body, { headers: { "x-userId": USER_PUBLIC_ID, ...headers } }),
    props()
  );
}

const ENDPOINT_PUBLIC_ID = "dddddddddddd";

// What the route reports back so the card's badge needs no follow-up request.
const QUOTA = { limit: 30, spent: 4 };

function allowAll() {
  (endpointGroupService.checkPermission as jest.Mock).mockResolvedValue(true);
  (endpointService.getEndpointInGroup as jest.Mock).mockResolvedValue(null);
  (isAiConfigured as jest.Mock).mockReturnValue(true);
  (aiUsageService.isAiAllowed as jest.Mock).mockResolvedValue(true);
  (aiUsageService.trySpend as jest.Mock).mockResolvedValue({ id: 5n, public_id: USER_PUBLIC_ID });
  (aiUsageService.quotaFor as jest.Mock).mockResolvedValue(QUOTA);
  (userService.getUserById as jest.Mock).mockResolvedValue({ id: 5n, public_id: USER_PUBLIC_ID });
  (buildPlan as jest.Mock).mockResolvedValue(PLAN);
}

// The row the route reads a stored blueprint off. `ai_plan_hash` is given rather than derived, so
// a spec can hand back a blueprint built for inputs the request no longer carries.
function storedEndpoint(ai_plan_hash: string, plan: object = PLAN) {
  (endpointService.getEndpointInGroup as jest.Mock).mockResolvedValue({
    id: 7n,
    method: VALID_BODY.method,
    path: VALID_BODY.path,
    response_body: VALID_BODY.response_body,
    ai_enabled: true,
    ai_fields: VALID_BODY.ai_fields,
    ai_prompt: VALID_BODY.ai_prompt,
    ai_plan: JSON.stringify(plan),
    ai_plan_hash,
  });
}

async function dataOf(res: Parameters<typeof readJson>[0]) {
  const json = (await readJson(res)) as {
    data: {
      variants: string[];
      plan: unknown;
      plan_hash: string;
      unapplied_hints: string[];
      quota: { limit: number; spent: number };
    };
  };
  return json.data;
}

async function errorsOf(res: Parameters<typeof readJson>[0]) {
  const json = (await readJson(res)) as { errors: unknown };
  return json.errors;
}

export {
  endpointGroupService,
  endpointService,
  aiUsageService,
  userService,
  buildPlan,
  planHash,
  isAiConfigured,
  POST,
  props,
  VALID_BODY,
  PLAN,
  QUOTA,
  USER_PUBLIC_ID,
  ENDPOINT_PUBLIC_ID,
  post,
  allowAll,
  storedEndpoint,
  dataOf,
  errorsOf,
};
