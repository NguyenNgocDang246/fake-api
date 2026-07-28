import ApiResponse from "@/server/core/api_response";
import endpointGroupService from "@/server/services/endpoint_group.service";
import projectService from "@/server/services/project.service";
import { validateData } from "@/server/core/validation";
import { CreateEndpointGroupSchema, EndpointGroupInfoSchema } from "@/models/endpoint_group.model";
import { STATUS_CODE, ERROR_MESSAGES, LIMIT_MESSAGES } from "@/server/core/constants";
import { createRouteHandler, withProjectId, withUserId } from "@/server/core/route_helpers";

type EndpointGroupCollectionRouteParams = { projectId: string };

export const GET = createRouteHandler<EndpointGroupCollectionRouteParams>(
  withUserId(
    withProjectId(async (_req, _params, ctx) => {
      const hasPermission = await projectService.checkPermission({
        userProps: { public_id: ctx.userId },
        projectProps: { public_id: ctx.projectId },
      });
      if (!hasPermission) {
        return ApiResponse.error({
          message: ERROR_MESSAGES.FORBIDDEN,
          statusCode: STATUS_CODE.FORBIDDEN,
        });
      }
      const endpointGroups = await endpointGroupService.getAllEndpointGroups({
        public_id: ctx.projectId,
      });
      if (endpointGroups.length === 0) {
        return ApiResponse.error({
          message: ERROR_MESSAGES.NO_CONTENT,
          statusCode: STATUS_CODE.NO_CONTENT,
        });
      }
      const endpointGroupInfoValidation = validateData(
        endpointGroups.map((e) => ({
          public_id: e.public_id,
          name: e.name,
          project_id: ctx.projectId,
          endpoint_count: e._count.endpoints,
        })),
        [EndpointGroupInfoSchema]
      );
      if (!endpointGroupInfoValidation.success) return endpointGroupInfoValidation.response;
      return ApiResponse.success({ data: endpointGroupInfoValidation.data });
    })
  )
);

export const POST = createRouteHandler<EndpointGroupCollectionRouteParams>(
  withUserId(
    withProjectId(async (req, _params, ctx) => {
      const hasPermission = await projectService.checkPermission({
        userProps: { public_id: ctx.userId },
        projectProps: { public_id: ctx.projectId },
      });
      if (!hasPermission) {
        return ApiResponse.error({
          message: ERROR_MESSAGES.FORBIDDEN,
          statusCode: STATUS_CODE.FORBIDDEN,
        });
      }

      const canCreate = await endpointGroupService.canCreateEndpointGroup({
        user_public_id: ctx.userId,
        project_public_id: ctx.projectId,
      });
      if (!canCreate) {
        return ApiResponse.error({
          message: LIMIT_MESSAGES.ENDPOINT_GROUP_LIMIT_REACHED,
          statusCode: STATUS_CODE.FORBIDDEN,
        });
      }

      const body = await req.json();
      const endpointGroupValidation = validateData(
        { ...body, project_public_id: ctx.projectId },
        CreateEndpointGroupSchema
      );
      if (!endpointGroupValidation.success) return endpointGroupValidation.response;

      const endpointGroupCreated = await endpointGroupService.createEndpointGroup(
        endpointGroupValidation.data
      );
      const endpointGroupInfoValidation = validateData(
        {
          public_id: endpointGroupCreated.public_id,
          name: endpointGroupCreated.name,
          project_id: ctx.projectId,
          endpoint_count: 0,
        },
        EndpointGroupInfoSchema
      );
      if (!endpointGroupInfoValidation.success) return endpointGroupInfoValidation.response;
      return ApiResponse.success({ data: endpointGroupInfoValidation.data });
    })
  )
);
