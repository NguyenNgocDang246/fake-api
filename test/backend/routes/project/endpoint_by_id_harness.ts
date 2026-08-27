jest.mock("@/server/services/endpoint/endpoint.service", () => ({
  __esModule: true,
  default: {
    checkPermission: jest.fn(),
    getEndpointById: jest.fn(),
    getEndpointByPath: jest.fn(),
    updateEndpointById: jest.fn(),
    deleteEndpointById: jest.fn(),
  },
}));

jest.mock("@/server/services/endpoint/variant/plan.service", () => ({
  __esModule: true,
  default: {
    isPlanStale: jest.fn(),
    clearPlan: jest.fn(),
    ensurePlan: jest.fn(),
    planInfoOf: jest.fn(),
  },
}));

jest.mock("@/server/services/ai_usage.service", () => ({
  __esModule: true,
  default: { isAiAllowed: jest.fn() },
}));

import EndpointService from "@/server/services/endpoint/endpoint.service";
import aiUsageService from "@/server/services/ai_usage.service";
import endpointVariantPlanService from "@/server/services/endpoint/variant/plan.service";
import { GET, PUT, DELETE } from "@/app/api/project/[projectId]/endpoint-group/[endpointGroupId]/endpoint/[endpointId]/route";

const afterQueue = jest.requireMock("next/server") as {
  __flushAfter: () => Promise<void>;
  __afterCount: () => number;
};

const USER_PUBLIC_ID = "aaaaaaaaaaaa";
const PROJECT_PUBLIC_ID = "bbbbbbbbbbbb";
const GROUP_PUBLIC_ID = "cccccccccccc";
const ENDPOINT_PUBLIC_ID = "dddddddddddd";

const props = (projectId: string, endpointGroupId: string, endpointId: string) => ({
  params: Promise.resolve({ projectId, endpointGroupId, endpointId }),
});

// `clearMocks` wipes an implementation set in the factory, and an unset mock resolves
// `undefined`, which the AI guard would read as "not allowed" on every test.
beforeEach(() => {
  (aiUsageService.isAiAllowed as jest.Mock).mockResolvedValue(true);
});

export {
  EndpointService,
  aiUsageService,
  endpointVariantPlanService,
  GET,
  PUT,
  DELETE,
  afterQueue,
  USER_PUBLIC_ID,
  PROJECT_PUBLIC_ID,
  GROUP_PUBLIC_ID,
  ENDPOINT_PUBLIC_ID,
  props,
};
