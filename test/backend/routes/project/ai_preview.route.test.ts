jest.mock("@/server/services/endpoint_group.service", () => ({
  __esModule: true,
  default: { checkPermission: jest.fn() },
}));

jest.mock("@/server/services/endpoint/endpoint_variant.service", () => ({
  __esModule: true,
  default: { canGenerate: jest.fn() },
}));

jest.mock("@/server/services/endpoint/endpoint_variant_generator.service", () => ({
  __esModule: true,
  generateVariants: jest.fn(),
}));

jest.mock("@/server/services/ai/ai_router.service", () => ({
  __esModule: true,
  isAiConfigured: jest.fn(),
}));

import endpointGroupService from "@/server/services/endpoint_group.service";
import endpointVariantService from "@/server/services/endpoint/endpoint_variant.service";
import { generateVariants } from "@/server/services/endpoint/endpoint_variant_generator.service";
import { isAiConfigured } from "@/server/services/ai/ai_router.service";
import { POST } from "@/app/api/project/[projectId]/endpoint-group/[endpointGroupId]/endpoint/ai-preview/route";
import { ERROR_MESSAGES, LIMIT_MESSAGES, STATUS_CODE } from "@/server/core/constants";
import { AI_MESSAGES } from "@/server/services/ai/ai.constants";
import { AppError } from "@/server/core/errors";
import { createJsonRequest, expectError, expectSuccess, readJson } from "../../helpers/http";

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

function post(body: object = VALID_BODY) {
  return POST(
    createJsonRequest(body, { headers: { "x-userId": USER_PUBLIC_ID } }),
    props()
  );
}

function allowAll() {
  (endpointGroupService.checkPermission as jest.Mock).mockResolvedValue(true);
  (isAiConfigured as jest.Mock).mockReturnValue(true);
  (endpointVariantService.canGenerate as jest.Mock).mockResolvedValue(true);
}

describe("src/app/api/project/[projectId]/endpoint-group/[endpointGroupId]/endpoint/ai-preview/route.ts", () => {
  it("returns the generated variants without storing anything", async () => {
    allowAll();
    (generateVariants as jest.Mock).mockResolvedValue({
      bodies: ['{"name":"Binh"}', '{"name":"Chi"}'],
    });

    const res = await post();

    await expectSuccess(res, 200);
    expect(await readJson(res)).toMatchObject({
      data: { variants: ['{"name":"Binh"}', '{"name":"Chi"}'] },
    });
  });

  it("passes the form contents through rather than reading a stored row", async () => {
    allowAll();
    (generateVariants as jest.Mock).mockResolvedValue({ bodies: ['{"name":"Binh"}'] });

    await post();

    expect(generateVariants).toHaveBeenCalledWith({
      method: "GET",
      path: "/user",
      responseBody: '{"name":"An"}',
      aiFields: ["name"],
      aiPrompt: null,
      count: 3,
    });
  });

  it("refuses a caller without permission on the group", async () => {
    (endpointGroupService.checkPermission as jest.Mock).mockResolvedValue(false);

    await expectError(await post(), STATUS_CODE.FORBIDDEN, ERROR_MESSAGES.FORBIDDEN);
    expect(generateVariants).not.toHaveBeenCalled();
  });

  it("says so when the server has no AI configured", async () => {
    (endpointGroupService.checkPermission as jest.Mock).mockResolvedValue(true);
    (isAiConfigured as jest.Mock).mockReturnValue(false);

    await expectError(await post(), STATUS_CODE.SERVER_ERROR, AI_MESSAGES.NOT_CONFIGURED);
    expect(endpointVariantService.canGenerate).not.toHaveBeenCalled();
    expect(generateVariants).not.toHaveBeenCalled();
  });

  it("refuses a user who has spent the daily allowance", async () => {
    (endpointGroupService.checkPermission as jest.Mock).mockResolvedValue(true);
    (isAiConfigured as jest.Mock).mockReturnValue(true);
    (endpointVariantService.canGenerate as jest.Mock).mockResolvedValue(false);

    await expectError(
      await post(),
      STATUS_CODE.FORBIDDEN,
      LIMIT_MESSAGES.AI_VARIANT_LIMIT_REACHED
    );
    expect(generateVariants).not.toHaveBeenCalled();
  });

  it("rejects a response body that is not a JSON object", async () => {
    allowAll();

    const res = await post({ ...VALID_BODY, response_body: "[1,2,3]" });

    expect(res.status).toBe(STATUS_CODE.BAD_REQUEST);
    expect(generateVariants).not.toHaveBeenCalled();
  });

  it("rejects a field the generator cannot patch, before spending a call", async () => {
    allowAll();

    const res = await post({
      ...VALID_BODY,
      response_body: '{"user":{"name":"An"}}',
      ai_fields: ["user"],
    });

    expect(res.status).toBe(STATUS_CODE.BAD_REQUEST);
    expect(generateVariants).not.toHaveBeenCalled();
  });

  it("rejects an empty selection rather than asking a model to vary nothing", async () => {
    allowAll();

    expect((await post({ ...VALID_BODY, ai_fields: [] })).status).toBe(STATUS_CODE.BAD_REQUEST);
    expect(generateVariants).not.toHaveBeenCalled();
  });

  it("rejects a count outside the allowed range", async () => {
    allowAll();

    expect((await post({ ...VALID_BODY, count: 0 })).status).toBe(STATUS_CODE.BAD_REQUEST);
    expect((await post({ ...VALID_BODY, count: 99 })).status).toBe(STATUS_CODE.BAD_REQUEST);
    expect(generateVariants).not.toHaveBeenCalled();
  });

  it("reports an empty result rather than answering with no variants", async () => {
    allowAll();
    (generateVariants as jest.Mock).mockResolvedValue({ bodies: [] });

    await expectError(
      await post(),
      STATUS_CODE.SERVER_ERROR,
      AI_MESSAGES.NO_USABLE_VARIANT
    );
  });

  it("carries a provider failure's own status through to the client", async () => {
    allowAll();
    (generateVariants as jest.Mock).mockRejectedValue(
      new AppError({
        message: AI_MESSAGES.RATE_LIMITED,
        statusCode: STATUS_CODE.TOO_MANY_REQUESTS,
      })
    );

    await expectError(await post(), STATUS_CODE.TOO_MANY_REQUESTS, AI_MESSAGES.RATE_LIMITED);
  });

  it("reports a selection too large as the caller's problem, not a server error", async () => {
    allowAll();
    (generateVariants as jest.Mock).mockRejectedValue(
      new AppError({
        message: AI_MESSAGES.FIELDS_TOO_LARGE,
        statusCode: STATUS_CODE.BAD_REQUEST,
      })
    );

    await expectError(await post(), STATUS_CODE.BAD_REQUEST, AI_MESSAGES.FIELDS_TOO_LARGE);
  });
});
