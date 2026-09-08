import { ERROR_MESSAGES, LIMIT_MESSAGES, STATUS_CODE } from "@/server/core/constants";
import { AI_MESSAGES } from "@/server/services/ai/ai.constants";
import { AI_PREVIEW_MAX_REQUEST_BYTES } from "@/server/services/endpoint/endpoint.constants";
import { AppError } from "@/server/core/errors";
import { expectError } from "../../helpers/http";
import {
  endpointGroupService,
  aiUsageService,
  buildPlan,
  planHash,
  isAiConfigured,
  VALID_BODY,
  PLAN,
  QUOTA,
  post,
  allowAll,
  dataOf,
  errorsOf,
} from "./ai_preview_harness";

describe("ai-preview route: refusals", () => {
  it("refuses a caller without permission on the group", async () => {
    (endpointGroupService.checkPermission as jest.Mock).mockResolvedValue(false);

    await expectError(await post(), STATUS_CODE.FORBIDDEN, ERROR_MESSAGES.FORBIDDEN);
    expect(buildPlan).not.toHaveBeenCalled();
  });

  it("says so when the server has no AI configured", async () => {
    (endpointGroupService.checkPermission as jest.Mock).mockResolvedValue(true);
    (isAiConfigured as jest.Mock).mockReturnValue(false);

    await expectError(await post(), STATUS_CODE.SERVER_ERROR, AI_MESSAGES.NOT_CONFIGURED);
    expect(aiUsageService.trySpend).not.toHaveBeenCalled();
    expect(buildPlan).not.toHaveBeenCalled();
  });

  it("tells a role with no AI apart from one that has spent today's allowance", async () => {
    allowAll();
    (aiUsageService.isAiAllowed as jest.Mock).mockResolvedValue(false);

    await expectError(
      await post(),
      STATUS_CODE.FORBIDDEN,
      LIMIT_MESSAGES.AI_NOT_AVAILABLE_FOR_ROLE
    );
    expect(aiUsageService.trySpend).not.toHaveBeenCalled();
    expect(buildPlan).not.toHaveBeenCalled();
  });

  it("refuses a user who has spent the daily allowance", async () => {
    allowAll();
    (aiUsageService.trySpend as jest.Mock).mockResolvedValue(null);

    await expectError(await post(), STATUS_CODE.FORBIDDEN, LIMIT_MESSAGES.AI_PLAN_LIMIT_REACHED);
    expect(buildPlan).not.toHaveBeenCalled();
  });

  // The refusal carries the count that refused it, which is what lets the card raise its warning
  // in the same tick instead of waiting on a refetch.
  it("carries the quota back with a refusal", async () => {
    allowAll();
    (aiUsageService.trySpend as jest.Mock).mockResolvedValue(null);

    expect(await errorsOf(await post())).toEqual(QUOTA);
  });

  it("carries the quota back when the role has no AI at all", async () => {
    allowAll();
    (aiUsageService.isAiAllowed as jest.Mock).mockResolvedValue(false);

    expect(await errorsOf(await post())).toEqual(QUOTA);
  });

  it("rejects a response body that is not a JSON object", async () => {
    allowAll();

    expect((await post({ ...VALID_BODY, response_body: "[1,2,3]" })).status).toBe(
      STATUS_CODE.BAD_REQUEST
    );
    expect(buildPlan).not.toHaveBeenCalled();
  });

  it("rejects a path that cannot carry a recipe, before spending a call", async () => {
    allowAll();

    const res = await post({
      ...VALID_BODY,
      response_body: '{"user":{"name":"An"}}',
      ai_fields: ["user"],
    });

    expect(res.status).toBe(STATUS_CODE.BAD_REQUEST);
    expect(buildPlan).not.toHaveBeenCalled();
  });

  it("rejects an empty selection rather than asking a model to vary nothing", async () => {
    allowAll();

    expect((await post({ ...VALID_BODY, ai_fields: [] })).status).toBe(STATUS_CODE.BAD_REQUEST);
    expect(buildPlan).not.toHaveBeenCalled();
  });

  it("rejects a count outside the allowed range", async () => {
    allowAll();

    expect((await post({ ...VALID_BODY, count: 0 })).status).toBe(STATUS_CODE.BAD_REQUEST);
    expect((await post({ ...VALID_BODY, count: 99 })).status).toBe(STATUS_CODE.BAD_REQUEST);
    expect(buildPlan).not.toHaveBeenCalled();
  });

  it("rejects a blueprint whose shape is not the DSL at all", async () => {
    allowAll();

    const res = await post({
      ...VALID_BODY,
      plan: { version: 1, fields: [{ path: "name", recipe: { kind: "exec", cmd: "rm -rf /" } }] },
      plan_hash: planHash({ responseBody: '{"name":"An"}', aiFields: ["name"], aiPrompt: null }),
    });

    expect(res.status).toBe(STATUS_CODE.BAD_REQUEST);
  });

  it("carries a provider failure's own status through to the client", async () => {
    allowAll();
    (buildPlan as jest.Mock).mockRejectedValue(
      new AppError({
        message: AI_MESSAGES.RATE_LIMITED,
        statusCode: STATUS_CODE.TOO_MANY_REQUESTS,
      })
    );

    await expectError(await post(), STATUS_CODE.TOO_MANY_REQUESTS, AI_MESSAGES.RATE_LIMITED);
  });

  it("hands back the parts of a hint it could not express", async () => {
    allowAll();
    (buildPlan as jest.Mock).mockResolvedValue({
      ...PLAN,
      unapplied_hints: ["make the name rhyme with the city"],
    });

    const res = await post({ ...VALID_BODY, ai_prompt: "make the name rhyme with the city" });

    expect((await dataOf(res)).unapplied_hints).toEqual(["make the name rhyme with the city"]);
  });

  // Checked before `req.json()`: Zod's `.max()` on a collection only runs once every element
  // has been parsed, which is far too late to stop an oversized payload from costing anything.
  it("refuses an oversized request before it parses or spends anything", async () => {
    allowAll();

    const res = await post(VALID_BODY, {
      "content-length": String(AI_PREVIEW_MAX_REQUEST_BYTES + 1),
    });

    expect(res.status).toBe(STATUS_CODE.PAYLOAD_TOO_LARGE);
    expect(aiUsageService.trySpend).not.toHaveBeenCalled();
    expect(buildPlan).not.toHaveBeenCalled();
  });

  it("refuses a caller supplied blueprint larger than a stored one may be", async () => {
    allowAll();
    const bloated = {
      ...PLAN,
      unapplied_hints: Array.from({ length: 8 }, () => "x".repeat(200)),
      catalogs: [
        {
          id: "big",
          columns: Array.from({ length: 10 }, (_, i) => `c${i}`),
          rows: Array.from({ length: 40 }, () => Array.from({ length: 10 }, () => "y".repeat(400))),
        },
      ],
    };

    const res = await post({ ...VALID_BODY, plan: bloated, plan_hash: "whatever" });

    expect(res.status).toBe(STATUS_CODE.PAYLOAD_TOO_LARGE);
    expect(buildPlan).not.toHaveBeenCalled();
  });
});
