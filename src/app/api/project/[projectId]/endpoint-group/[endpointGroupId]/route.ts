import ApiResponse from "@/server/core/api_response";
import { ERROR_MESSAGES, STATUS_CODE } from "@/server/core/constants";
import { validateData } from "@/server/core/validation";
import endpointGroupService from "@/server/services/endpoint_group.service";
import { UpdateEndpointGroupByIdSchema, EndpointGroupInfoSchema } from "@/models/endpoint_group.model";
import {
  createRouteHandler,
  withEndpointGroupId,
  withProjectId,
  withUserId,
} from "@/server/core/route_helpers";

type EndpointGroupRouteParams = { projectId: string; endpointGroupId: string };

export const GET = createRouteHandler<EndpointGroupRouteParams>(
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

        const endpointgroup = await endpointGroupService.getEndpointGroupById({
          public_id: ctx.endpointGroupId,
        });
        if (endpointgroup === null) {
          return ApiResponse.error({
            message: ERROR_MESSAGES.NOT_FOUND,
            statusCode: STATUS_CODE.NOT_FOUND,
          });
        }
        const endpointGroupInfoValidation = validateData(
          {
            public_id: endpointgroup.public_id,
            name: endpointgroup.name,
            project_id: ctx.projectId,
            endpoint_count: endpointgroup._count.endpoints,
          },
          EndpointGroupInfoSchema
        );
        if (!endpointGroupInfoValidation.success) return endpointGroupInfoValidation.response;
        return ApiResponse.success({ data: endpointGroupInfoValidation.data });
      })
    )
  )
);

export const DELETE = createRouteHandler<EndpointGroupRouteParams>(
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

        const result = await endpointGroupService.deleteEndpointGroupById({
          public_id: ctx.endpointGroupId,
        });
        if (!result) {
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

export const PUT = createRouteHandler<EndpointGroupRouteParams>(
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

        const data = await req.json();
        const updateEndpointGroupValidation = validateData(
          { ...data, public_id: ctx.endpointGroupId },
          UpdateEndpointGroupByIdSchema
        );
        if (!updateEndpointGroupValidation.success) return updateEndpointGroupValidation.response;

        const endpointGroupUpdated = await endpointGroupService.updateEndpointGroupById(
          updateEndpointGroupValidation.data
        );
        if (!endpointGroupUpdated) {
          return ApiResponse.error({
            message: ERROR_MESSAGES.NO_CONTENT,
            statusCode: STATUS_CODE.NO_CONTENT,
          });
        }
        const endpointGroupInfoValidation = validateData(
          {
            public_id: endpointGroupUpdated.public_id,
            name: endpointGroupUpdated.name,
            project_id: ctx.projectId,
            endpoint_count: endpointGroupUpdated._count.endpoints,
          },
          EndpointGroupInfoSchema
        );
        if (!endpointGroupInfoValidation.success) return endpointGroupInfoValidation.response;
        return ApiResponse.success({ data: endpointGroupInfoValidation.data });
      })
    )
  )
);
