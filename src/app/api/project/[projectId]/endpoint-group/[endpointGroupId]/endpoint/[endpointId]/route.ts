import { after } from "next/server";
import ApiResponse from "@/server/core/api_response";
import { ERROR_MESSAGES, LIMIT_MESSAGES, STATUS_CODE } from "@/server/core/constants";
import { ENDPOINT_MESSAGES } from "@/server/services/endpoint/endpoint.constants";
import { AppError } from "@/server/core/errors";
import { validateData } from "@/server/core/validation";
import {
  createRouteHandler,
  withEndpointGroupId,
  withEndpointId,
  withProjectId,
  withUserId,
} from "@/server/core/route_helpers";
import {
  EndpointInfoSchema,
  PlanEnvelopeSchema,
  UpdateEndpointByIdSchema,
  splitPlanEnvelope,
  toEndpointInfoInput,
} from "@/models/endpoint/endpoint.model";
import endpointService from "@/server/services/endpoint/endpoint.service";
import aiUsageService from "@/server/services/ai_usage.service";
import endpointVariantPlanService from "@/server/services/endpoint/variant/plan.service";

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

          const endpoint = await endpointService.getEndpointById({ public_id: ctx.endpointId });
          if (!endpoint) {
            return ApiResponse.error({
              message: ERROR_MESSAGES.NOT_FOUND,
              statusCode: STATUS_CODE.NOT_FOUND,
            });
          }

          const endpointValidation = validateData(
            toEndpointInfoInput(
              endpoint,
              ctx.endpointGroupId,
              endpointVariantPlanService.planInfoOf(endpoint)
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

          const { envelope, endpoint: endpointBody } = splitPlanEnvelope(await req.json());
          const planValidation = validateData(envelope, PlanEnvelopeSchema);
          if (!planValidation.success) return planValidation.response;

          const updateEndpointInfoValidation = validateData(
            { ...endpointBody, public_id: ctx.endpointId },
            UpdateEndpointByIdSchema
          );
          if (!updateEndpointInfoValidation.success) return updateEndpointInfoValidation.response;
          const endpointInfo = updateEndpointInfoValidation.data;

          // Turning the flag on here would otherwise walk straight around the same check on
          // create. Only the `true` case is refused, so an endpoint whose owner lost AI can
          // still be edited to switch it back off.
          if (
            endpointInfo.ai_enabled &&
            !(await aiUsageService.isAiAllowed({ public_id: ctx.userId }))
          ) {
            return ApiResponse.error({
              message: LIMIT_MESSAGES.AI_NOT_AVAILABLE_FOR_ROLE,
              statusCode: STATUS_CODE.FORBIDDEN,
            });
          }

          // Read before the write: the row still holds the selection and hint the stored
          // blueprint was designed under, and the update is about to overwrite them.
          const storedBefore =
            endpointInfo.ai_enabled && endpointInfo.ai_fields.length > 0
              ? await endpointService.getEndpointById({ public_id: ctx.endpointId })
              : null;
          const planOrigin = storedBefore
            ? { ai_fields: storedBefore.ai_fields, ai_prompt: storedBefore.ai_prompt }
            : null;

          // An edit that moves `ai_plan_hash` sends the save to a model, and on a spent quota the
          // build below would clear the blueprint the endpoint is serving and store nothing in
          // its place. Refused before the write, so the old blueprint and the old AI settings
          // both survive. Switching AI off never reaches this and always saves.
          if (storedBefore) {
            const subject = {
              response_body: endpointInfo.response_body,
              ai_enabled: endpointInfo.ai_enabled,
              ai_fields: endpointInfo.ai_fields,
              ai_prompt: endpointInfo.ai_prompt,
              ai_plan: storedBefore.ai_plan,
              ai_plan_hash: storedBefore.ai_plan_hash,
            };

            if (
              endpointVariantPlanService.wouldDesign(
                subject,
                planValidation.data.plan,
                planValidation.data.plan_hash,
                planOrigin
              )
            ) {
              // A read, not a claim, the same way the badge's is: `trySpend` inside `ensurePlan`
              // is still what decides, so a save that wins this check can still lose that one.
              const quota = await aiUsageService.quotaFor({ public_id: ctx.userId });
              if (quota.spent >= quota.limit) {
                return ApiResponse.error({
                  message: LIMIT_MESSAGES.AI_PLAN_LIMIT_REACHED_ON_SAVE,
                  statusCode: STATUS_CODE.FORBIDDEN,
                  errors: quota,
                });
              }
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

          const endpointUpdated = await endpointService.updateEndpointById(endpointInfo);
          if (!endpointUpdated) {
            return ApiResponse.error({
              message: ERROR_MESSAGES.NO_CONTENT,
              statusCode: STATUS_CODE.NO_CONTENT,
            });
          }

          // `ai_plan_hash` covers the body, the sorted field list and the hint, so an edit that
          // matters shows up as a stale blueprint on its own. The two flags come first because
          // `isPlanStale` also answers true for an endpoint that is simply not serving variants.
          if (
            endpointUpdated.ai_enabled &&
            endpointUpdated.ai_fields.length > 0 &&
            endpointVariantPlanService.isPlanStale(endpointUpdated)
          ) {
            after(async () => {
              try {
                const { plan, plan_hash } = planValidation.data;
                if (plan && plan_hash) {
                  const adopted = await endpointVariantPlanService.adoptPlan(
                    endpointUpdated,
                    plan,
                    plan_hash
                  );
                  if (adopted) return;
                }

                // Before anything is cleared: the row still holds the previous blueprint, and an
                // edit the blueprint survives must not cost a design. Both this and the adopt
                // above store one, so neither leaves a build wanting the lock.
                if (await endpointVariantPlanService.carryPlanForward(endpointUpdated, planOrigin))
                  return;

                // Clearing drops the build lock too, so an edit ends the retry cooldown: fixing a
                // broken body must not leave the endpoint frozen for another AI_PLAN_LOCK_MS
                // serving its base body.
                await endpointVariantPlanService.clearPlan(endpointUpdated.id);
                await endpointVariantPlanService.ensurePlan(endpointUpdated);
              } catch (error) {
                console.error("[ai] blueprint invalidation failed", {
                  endpoint_id: String(endpointUpdated.id),
                  reason: error instanceof Error ? error.message : String(error),
                  cause: error instanceof AppError ? error.cause : undefined,
                });
              }
            });
          }

          // A stale blueprint reports nothing rather than the previous body's verdict, whether it
          // is being rebuilt above or the endpoint has simply stopped serving variants.
          const endpointInfoValidation = validateData(
            toEndpointInfoInput(
              endpointUpdated,
              ctx.endpointGroupId,
              endpointVariantPlanService.planInfoOf(endpointUpdated)
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
