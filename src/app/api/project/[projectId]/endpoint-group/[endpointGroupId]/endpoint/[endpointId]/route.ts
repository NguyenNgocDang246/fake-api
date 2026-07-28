import ApiResponse from "@/server/core/api_response";
import { ENDPOINT_MESSAGES, ERROR_MESSAGES, STATUS_CODE } from "@/server/core/constants";
import { validateData } from "@/server/core/validation";
import {
  createRouteHandler,
  withEndpointGroupId,
  withEndpointId,
  withProjectId,
  withUserId,
} from "@/server/core/route_helpers";
import { EndpointInfoSchema, UpdateEndpointByIdSchema } from "@/models/endpoint.model";
import endpointService from "@/server/services/endpoint.service";

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
          const hasPermission = await endpointService.checkPermissions({
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
            {
              public_id: endpoint.public_id,
              path: endpoint.path,
              method: endpoint.method,
              status_code: endpoint.status_code,
              response_body: endpoint.response_body,
              delay_ms: endpoint.delay_ms,
              endpoint_groups_id: ctx.endpointGroupId,
            },
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
          const hasPermission = await endpointService.checkPermissions({
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

          const data = await req.json();
          const updateEndpointInfoValidation = validateData(
            { ...data, public_id: ctx.endpointId },
            UpdateEndpointByIdSchema
          );
          if (!updateEndpointInfoValidation.success) return updateEndpointInfoValidation.response;
          const endpointInfo = updateEndpointInfoValidation.data;

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

          const endpointInfoValidation = validateData(
            {
              public_id: endpointUpdated.public_id,
              path: endpointUpdated.path,
              method: endpointUpdated.method,
              status_code: endpointUpdated.status_code,
              response_body: endpointUpdated.response_body,
              delay_ms: endpointUpdated.delay_ms,
              endpoint_groups_id: ctx.endpointGroupId,
            },
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
          const hasPermission = await endpointService.checkPermissions({
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
