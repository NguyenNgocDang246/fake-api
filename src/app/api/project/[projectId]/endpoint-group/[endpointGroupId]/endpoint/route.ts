import { after } from "next/server";
import ApiResponse from "@/server/core/api_response";
import { ERROR_MESSAGES, STATUS_CODE, LIMIT_MESSAGES } from "@/server/core/constants";
import { ENDPOINT_MESSAGES } from "@/server/services/endpoint/endpoint.constants";
import { validateData } from "@/server/core/validation";
import {
  EndpointInfoSchema,
  CreateEndpointSchema,
  PlanEnvelopeSchema,
  splitPlanEnvelope,
  toEndpointInfoInput,
} from "@/models/endpoint/endpoint.model";
import endpointService from "@/server/services/endpoint/endpoint.service";
import endpointGroupService from "@/server/services/endpoint_group.service";
import aiUsageService from "@/server/services/ai_usage.service";
import endpointVariantPlanService from "@/server/services/endpoint/variant/plan.service";
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

        const endpointInfoValidation = validateData(
          endpoints.map((e) =>
            toEndpointInfoInput(e, ctx.endpointGroupId, endpointVariantPlanService.planInfoOf(e))
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

        const { envelope, endpoint: endpointBody } = splitPlanEnvelope(await req.json());
        const planValidation = validateData(envelope, PlanEnvelopeSchema);
        if (!planValidation.success) return planValidation.response;

        const endpointValidation = validateData(
          { ...endpointBody, endpoint_groups_public_id: ctx.endpointGroupId },
          CreateEndpointSchema
        );
        if (!endpointValidation.success) return endpointValidation.response;

        // Only asked when the flag is on, so an ordinary endpoint costs no extra query. Without
        // it a role with no AI saves the flag and is served the base body forever, silently.
        if (
          endpointValidation.data.ai_enabled &&
          !(await aiUsageService.isAiAllowed({ public_id: ctx.userId }))
        ) {
          return ApiResponse.error({
            message: LIMIT_MESSAGES.AI_NOT_AVAILABLE_FOR_ROLE,
            statusCode: STATUS_CODE.FORBIDDEN,
          });
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

        const endpointCreate = await endpointService.createEndpoint(endpointValidation.data);

        // Warms the blueprint so the first real request already serves varied data. A blueprint
        // the user previewed is adopted instead, which is the same design they already paid for.
        after(async () => {
          const { plan, plan_hash } = planValidation.data;
          if (plan && plan_hash) {
            const adopted = await endpointVariantPlanService.adoptPlan(
              endpointCreate,
              plan,
              plan_hash
            );
            if (adopted) return;
          }
          await endpointVariantPlanService.ensurePlan(endpointCreate);
        });

        const endpointInfoValidation = validateData(
          toEndpointInfoInput(endpointCreate, ctx.endpointGroupId),
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
