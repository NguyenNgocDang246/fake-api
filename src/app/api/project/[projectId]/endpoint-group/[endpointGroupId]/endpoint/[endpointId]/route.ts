import { after } from "next/server";
import ApiResponse from "@/server/core/api_response";
import { ERROR_MESSAGES, LIMIT_MESSAGES, STATUS_CODE } from "@/server/core/constants";
import { ENDPOINT_MESSAGES } from "@/server/services/endpoint/endpoint.constants";
import { validateData } from "@/server/core/validation";
import {
  createRouteHandler,
  missingOrForbidden,
  withEndpointGroupId,
  withEndpointId,
  withProjectId,
  withUserId,
} from "@/server/core/route_helpers";
import {
  EndpointInfoSchema,
  PlanEnvelopeSchema,
  UpdateEndpointByIdSchema,
  splitScenarioPlanEnvelopes,
  toEndpointInfoInput,
} from "@/models/endpoint/endpoint.model";
import endpointService from "@/server/services/endpoint/endpoint.service";
import scenarioService from "@/server/services/endpoint/scenario.service";
import aiUsageService from "@/server/services/ai_usage.service";
import {
  ScenarioPlanInput,
  countDesigns,
  envelopeAt,
  hasAiEnabled,
  readWriteBody,
  settleScenarioPlans,
} from "@/server/services/endpoint/scenario_plan";
import { planScenarioOf, scenarioInfoOf } from "@/server/services/endpoint/scenario_view";

type EndpointRouteParams = {
  projectId: string;
  endpointGroupId: string;
  endpointId: string;
};

export const GET = createRouteHandler<EndpointRouteParams>(
  withUserId(
    withProjectId(
      withEndpointGroupId(
        withEndpointId(async (_req, _params, ctx) => {
          // The read carries the ownership chain, so this is the whole check on the path that
          // finds something. Only an empty answer pays for the query that says which refusal it is.
          const endpoint = await endpointService.getOwnedEndpointById({
            public_id: ctx.endpointId,
            owner: {
              user_public_id: ctx.userId,
              project_public_id: ctx.projectId,
              endpoint_groups_public_id: ctx.endpointGroupId,
            },
          });
          if (!endpoint) {
            return missingOrForbidden(
              await endpointService.endpointExists({ public_id: ctx.endpointId })
            );
          }

          // Every scenario, unlike the list: this is what the edit modal opens its pager on.
          const endpointValidation = validateData(
            toEndpointInfoInput(
              endpoint,
              ctx.endpointGroupId,
              endpoint.scenarios.map(scenarioInfoOf)
            ),
            EndpointInfoSchema
          );
          if (!endpointValidation.success) return endpointValidation.response;
          return ApiResponse.success({ data: endpointValidation.data });
        })
      )
    )
  )
);

export const PUT = createRouteHandler<EndpointRouteParams>(
  withUserId(
    withProjectId(
      withEndpointGroupId(
        withEndpointId(async (req, _params, ctx) => {
          const hasPermission = await endpointService.checkPermission({
            userProps: { public_id: ctx.userId },
            projectProps: { public_id: ctx.projectId },
            endpointGroupProps: { public_id: ctx.endpointGroupId },
            endpointProps: { public_id: ctx.endpointId },
          });
          if (!hasPermission) {
            return ApiResponse.error({
              message: ERROR_MESSAGES.FORBIDDEN,
              statusCode: STATUS_CODE.FORBIDDEN,
            });
          }

          const read = await readWriteBody(req);
          if (!read.ok) return read.response;

          const { envelopes, endpoint: endpointBody } = splitScenarioPlanEnvelopes(read.body);
          const planValidation = validateData(envelopes, [PlanEnvelopeSchema]);
          if (!planValidation.success) return planValidation.response;

          const updateEndpointInfoValidation = validateData(
            { ...endpointBody, public_id: ctx.endpointId },
            UpdateEndpointByIdSchema
          );
          if (!updateEndpointInfoValidation.success) return updateEndpointInfoValidation.response;
          const endpointInfo = updateEndpointInfoValidation.data;

          const canHold = await scenarioService.canHoldScenarios({
            user_public_id: ctx.userId,
            count: endpointInfo.scenarios.length,
          });
          if (!canHold) {
            return ApiResponse.error({
              message: LIMIT_MESSAGES.SCENARIO_LIMIT_REACHED,
              statusCode: STATUS_CODE.FORBIDDEN,
            });
          }

          // Turning the flag on here would otherwise walk straight around the same check on
          // create. Only the `true` case is refused, so an endpoint whose owner lost AI can
          // still be edited to switch it back off.
          if (
            hasAiEnabled(endpointInfo.scenarios) &&
            !(await aiUsageService.isAiAllowed({ public_id: ctx.userId }))
          ) {
            return ApiResponse.error({
              message: LIMIT_MESSAGES.AI_NOT_AVAILABLE_FOR_ROLE,
              statusCode: STATUS_CODE.FORBIDDEN,
            });
          }

          // Read before the write: each row still holds the selection and hint its stored
          // blueprint was designed under, and the reconcile is about to overwrite them.
          const before = await scenarioService.getScenariosOfEndpoint({
            endpoint_public_id: ctx.endpointId,
          });
          const byId = new Map(before.map((scenario) => [scenario.public_id, scenario]));

          const inputs: ScenarioPlanInput[] = endpointInfo.scenarios.map((row, index) => {
            const stored = row.public_id ? byId.get(row.public_id) : undefined;
            return {
              row,
              envelope: envelopeAt(planValidation.data, index),
              stored: stored
                ? {
                    ai_plan: stored.ai_plan,
                    ai_plan_hash: stored.ai_plan_hash,
                    origin: { ai_fields: stored.ai_fields, ai_prompt: stored.ai_prompt },
                  }
                : null,
            };
          });

          // An edit that moves `ai_plan_hash` sends that scenario to a model, and on a spent
          // quota the build below would clear the blueprint it is serving and store nothing in
          // its place. Counted across every scenario, so a save carrying three designs is not
          // let through on room for one. Refused before the write, so the old blueprints and the
          // old AI settings all survive.
          const needed = countDesigns(inputs);
          if (needed > 0) {
            // A read, not a claim, the same way the badge's is: `trySpend` inside `ensurePlan`
            // is still what decides, so a save that wins this check can still lose that one.
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
            path: endpointInfo.path,
            method: endpointInfo.method,
          });
          if (endpointExists && endpointExists.public_id !== ctx.endpointId) {
            return ApiResponse.error({
              message: ENDPOINT_MESSAGES.ENDPOINT_DUPLICATED,
              statusCode: STATUS_CODE.CONFLICT,
            });
          }

          const updated = await endpointService.updateEndpointById(endpointInfo);
          if (!updated) {
            return ApiResponse.error({
              message: ERROR_MESSAGES.NO_CONTENT,
              statusCode: STATUS_CODE.NO_CONTENT,
            });
          }

          const stored = await scenarioService.getScenariosOfEndpoint({
            endpoint_public_id: ctx.endpointId,
          });

          // Adopting a previewed blueprint and carrying a surviving one forward cost nothing, so
          // every scenario gets both; only the active one is designed here, and the rest design
          // on their own first request the way the fake route already handles.
          after(() =>
            settleScenarioPlans(
              stored.map((scenario) => planScenarioOf(scenario, updated.endpoint)),
              inputs
            )
          );

          // A stale blueprint reports nothing rather than the previous body's verdict, whether it
          // is being rebuilt above or the scenario has simply stopped serving variants.
          const endpointInfoValidation = validateData(
            toEndpointInfoInput(
              updated.endpoint,
              ctx.endpointGroupId,
              stored.map(scenarioInfoOf)
            ),
            EndpointInfoSchema
          );
          if (!endpointInfoValidation.success) return endpointInfoValidation.response;
          return ApiResponse.success({ data: endpointInfoValidation.data });
        })
      )
    )
  )
);

export const DELETE = createRouteHandler<EndpointRouteParams>(
  withUserId(
    withProjectId(
      withEndpointGroupId(
        withEndpointId(async (_req, _params, ctx) => {
          const hasPermission = await endpointService.checkPermission({
            userProps: { public_id: ctx.userId },
            projectProps: { public_id: ctx.projectId },
            endpointGroupProps: { public_id: ctx.endpointGroupId },
            endpointProps: { public_id: ctx.endpointId },
          });
          if (!hasPermission) {
            return ApiResponse.error({
              message: ERROR_MESSAGES.FORBIDDEN,
              statusCode: STATUS_CODE.FORBIDDEN,
            });
          }

          const endpointDeleted = await endpointService.deleteEndpointById({
            public_id: ctx.endpointId,
          });
          if (!endpointDeleted) {
            return ApiResponse.error({
              message: ERROR_MESSAGES.NO_CONTENT,
              statusCode: STATUS_CODE.NO_CONTENT,
            });
          }
          return ApiResponse.success();
        })
      )
    )
  )
);
