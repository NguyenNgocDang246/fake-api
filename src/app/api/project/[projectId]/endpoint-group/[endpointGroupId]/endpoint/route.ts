import { after } from "next/server";
import ApiResponse from "@/server/core/api_response";
import { ERROR_MESSAGES, STATUS_CODE, LIMIT_MESSAGES } from "@/server/core/constants";
import { ENDPOINT_MESSAGES } from "@/server/services/endpoint/endpoint.constants";
import { validateData } from "@/server/core/validation";
import {
  EndpointInfoSchema,
  CreateEndpointSchema,
  PlanEnvelopeSchema,
  splitScenarioPlanEnvelopes,
  toEndpointInfoInput,
} from "@/models/endpoint/endpoint.model";
import endpointService from "@/server/services/endpoint/endpoint.service";
import scenarioService from "@/server/services/endpoint/scenario.service";
import endpointGroupService from "@/server/services/endpoint_group.service";
import aiUsageService from "@/server/services/ai_usage.service";
import {
  countDesigns,
  hasAiEnabled,
  envelopeAt,
  readWriteBody,
  settleScenarioPlans,
} from "@/server/services/endpoint/scenario_plan";
import { planScenarioOf, scenarioInfoOf } from "@/server/services/endpoint/scenario_view";
import {
  createRouteHandler,
  withEndpointGroupId,
  withProjectId,
  withUserId,
} from "@/server/core/route_helpers";

type EndpointCollectionRouteParams = { projectId: string; endpointGroupId: string };

export const GET = createRouteHandler<EndpointCollectionRouteParams>(
  withUserId(
    withProjectId(
      withEndpointGroupId(async (_req, _params, ctx) => {
        const hasPermission = await endpointGroupService.checkPermission({
          userProps: { public_id: ctx.userId },
          projectProps: { public_id: ctx.projectId },
          endpointGroupProps: { public_id: ctx.endpointGroupId },
        });
        if (!hasPermission) {
          return ApiResponse.error({
            message: ERROR_MESSAGES.FORBIDDEN,
            statusCode: STATUS_CODE.FORBIDDEN,
          });
        }

        const endpoints = await endpointService.getAllEndpoints({ public_id: ctx.endpointGroupId });
        if (endpoints.length === 0) {
          return ApiResponse.error({
            message: ERROR_MESSAGES.NO_CONTENT,
            statusCode: STATUS_CODE.NO_CONTENT,
          });
        }

        // One scenario per endpoint, the active one. The edit modal asks `GET_BY_ID` for the
        // rest, so a group of ten endpoints does not ship ten full pagers to draw ten badges.
        const endpointInfoValidation = validateData(
          endpoints.map((e) =>
            toEndpointInfoInput(e, ctx.endpointGroupId, e.scenarios.map(scenarioInfoOf))
          ),
          [EndpointInfoSchema]
        );
        if (!endpointInfoValidation.success) return endpointInfoValidation.response;
        return ApiResponse.success({ data: endpointInfoValidation.data });
      })
    )
  )
);

export const POST = createRouteHandler<EndpointCollectionRouteParams>(
  withUserId(
    withProjectId(
      withEndpointGroupId(async (req, _params, ctx) => {
        const hasPermission = await endpointGroupService.checkPermission({
          userProps: { public_id: ctx.userId },
          projectProps: { public_id: ctx.projectId },
          endpointGroupProps: { public_id: ctx.endpointGroupId },
        });
        if (!hasPermission) {
          return ApiResponse.error({
            message: ERROR_MESSAGES.FORBIDDEN,
            statusCode: STATUS_CODE.FORBIDDEN,
          });
        }

        const canCreate = await endpointService.canCreateEndpoint({
          user_public_id: ctx.userId,
          endpoint_groups_public_id: ctx.endpointGroupId,
        });
        if (!canCreate) {
          return ApiResponse.error({
            message: LIMIT_MESSAGES.ENDPOINT_LIMIT_REACHED,
            statusCode: STATUS_CODE.FORBIDDEN,
          });
        }

        const read = await readWriteBody(req);
        if (!read.ok) return read.response;

        const { envelopes, endpoint: endpointBody } = splitScenarioPlanEnvelopes(read.body);
        const planValidation = validateData(envelopes, [PlanEnvelopeSchema]);
        if (!planValidation.success) return planValidation.response;

        const endpointValidation = validateData(
          { ...endpointBody, endpoint_groups_public_id: ctx.endpointGroupId },
          CreateEndpointSchema
        );
        if (!endpointValidation.success) return endpointValidation.response;
        const { scenarios } = endpointValidation.data;

        const canHold = await scenarioService.canHoldScenarios({
          user_public_id: ctx.userId,
          count: scenarios.length,
        });
        if (!canHold) {
          return ApiResponse.error({
            message: LIMIT_MESSAGES.SCENARIO_LIMIT_REACHED,
            statusCode: STATUS_CODE.FORBIDDEN,
          });
        }

        // Only asked when some scenario has the flag on, so an ordinary endpoint costs no extra
        // query. Without it a role with no AI saves the flag and is served the base body
        // forever, silently.
        if (hasAiEnabled(scenarios) && !(await aiUsageService.isAiAllowed({ public_id: ctx.userId }))) {
          return ApiResponse.error({
            message: LIMIT_MESSAGES.AI_NOT_AVAILABLE_FOR_ROLE,
            statusCode: STATUS_CODE.FORBIDDEN,
          });
        }

        // Nothing is stored yet, so every scenario that needs a blueprint has to design one.
        // Designing in `after()` on a spent quota would save an AI scenario that answers with the
        // base body forever and says nothing. Refused here, while nothing has been written.
        const inputs = scenarios.map((row, index) => ({
          row,
          envelope: envelopeAt(planValidation.data, index),
          stored: null,
        }));
        const needed = countDesigns(inputs);
        if (needed > 0) {
          const quota = await aiUsageService.quotaFor({ public_id: ctx.userId });
          if (quota.spent + needed > quota.limit) {
            return ApiResponse.error({
              message: LIMIT_MESSAGES.AI_PLAN_LIMIT_REACHED_ON_SAVE,
              statusCode: STATUS_CODE.FORBIDDEN,
              errors: quota,
            });
          }
        }

        const endpointExists = await endpointService.getEndpointByPath({
          project_public_id: ctx.projectId,
          path: endpointValidation.data.path,
          method: endpointValidation.data.method,
        });
        if (endpointExists) {
          return ApiResponse.error({
            message: ENDPOINT_MESSAGES.ENDPOINT_DUPLICATED,
            statusCode: STATUS_CODE.CONFLICT,
          });
        }

        const { endpoint } = await endpointService.createEndpoint(endpointValidation.data);
        const stored = await scenarioService.getScenariosOfEndpoint({
          endpoint_public_id: endpoint.public_id,
        });

        // Warms the active scenario's blueprint so the first real request already serves varied
        // data. One the user previewed is adopted instead, which is the design they already paid
        // for, and the other pages build on their own first request.
        after(() => settleScenarioPlans(stored.map((s) => planScenarioOf(s, endpoint)), inputs));

        const endpointInfoValidation = validateData(
          toEndpointInfoInput(endpoint, ctx.endpointGroupId, stored.map(scenarioInfoOf)),
          EndpointInfoSchema
        );
        if (!endpointInfoValidation.success) return endpointInfoValidation.response;
        return ApiResponse.success({ data: endpointInfoValidation.data });
      })
    )
  )
);

export const DELETE = createRouteHandler<EndpointCollectionRouteParams>(
  withUserId(
    withProjectId(
      withEndpointGroupId(async (_req, _params, ctx) => {
        const hasPermission = await endpointGroupService.checkPermission({
          userProps: { public_id: ctx.userId },
          projectProps: { public_id: ctx.projectId },
          endpointGroupProps: { public_id: ctx.endpointGroupId },
        });
        if (!hasPermission) {
          return ApiResponse.error({
            message: ERROR_MESSAGES.FORBIDDEN,
            statusCode: STATUS_CODE.FORBIDDEN,
          });
        }

        const result = await endpointService.deleteAllEndpoints({
          endpoint_groups_public_id: ctx.endpointGroupId,
        });
        if (result.count === 0) {
          return ApiResponse.error({
            message: ERROR_MESSAGES.NO_CONTENT,
            statusCode: STATUS_CODE.NO_CONTENT,
          });
        }
        return ApiResponse.success();
      })
    )
  )
);
