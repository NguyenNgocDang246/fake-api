import { after } from "next/server";
import ApiResponse from "@/server/core/api_response";
import { ERROR_MESSAGES, STATUS_CODE, ENDPOINT_MESSAGES, LIMIT_MESSAGES } from "@/server/core/constants";
import { validateData } from "@/server/core/validation";
import {
  EndpointInfoSchema,
  CreateEndpointSchema,
  toEndpointInfoInput,
} from "@/models/endpoint.model";
import endpointService from "@/server/services/endpoint/endpoint.service";
import endpointGroupService from "@/server/services/endpoint_group.service";
import endpointVariantService from "@/server/services/endpoint/endpoint_variant.service";
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
          endpoints.map((e) => toEndpointInfoInput(e, ctx.endpointGroupId)),
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

        const body = await req.json();
        const endpointValidation = validateData(
          { ...body, endpoint_groups_public_id: ctx.endpointGroupId },
          CreateEndpointSchema
        );
        if (!endpointValidation.success) return endpointValidation.response;

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

        // Fill the pool in the background: the endpoint appears at once, with no wait on a model.
        if (endpointCreate.ai_enabled && endpointCreate.ai_fields.length > 0) {
          after(() => endpointVariantService.refillIfNeeded(endpointCreate));
        }

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
