import { NextRequest } from "next/server";
import ApiResponse from "@/server/core/api_response";
import { GetUserByIdSchema } from "@/models/user.model";
import { validateData } from "@/server/core/validation";
import IdConverter from "@/app/libs/helpers/idConverter";
import { GetProjectByIdSchema } from "@/models/project.model";
import checkProjectPermission from "@/app/api/project/helpers/checkProjectPermission";
import { ERROR_MESSAGES, STATUS_CODE } from "@/server/core/constants";
import EndpointGroupService from "@/server/services/endpoint_group.service";
import { GetEndpointGroupByIdSchema, EndpointGroupInfoSchema } from "@/models/endpoint_group.model";
import { AppError } from "@/server/core/errors";

export async function GET(
  req: NextRequest,
  props: { params: Promise<{ projectId: string; endpointGroupId: string }> }
) {
  try {
    const id = req.headers.get("x-userId");
    const userId = GetUserByIdSchema.parse({ id }).id;

    const params = await props.params;
    const projectIdRaw = params.projectId;

    const projectIdValidation = validateData(
      { id: IdConverter.decode(projectIdRaw) },
      GetProjectByIdSchema
    );
    if (!projectIdValidation.success) {
      return projectIdValidation.response;
    }
    const projectId = projectIdValidation.data.id;

    const hasPermission = await checkProjectPermission({ projectId, userId });
    if (!hasPermission) {
      return ApiResponse.error({
        message: ERROR_MESSAGES.FORBIDDEN,
        statusCode: STATUS_CODE.FORBIDDEN,
      });
    }
    const endpointGroupIdRaw = params.endpointGroupId;
    const endpointGroupIdValidation = validateData(
      { id: IdConverter.decode(endpointGroupIdRaw) },
      GetEndpointGroupByIdSchema
    );

    if (!endpointGroupIdValidation.success) {
      return endpointGroupIdValidation.response;
    }
    const endpointGroupId = endpointGroupIdValidation.data.id;

    const endpoint = await EndpointGroupService.getEndpointGroupById({ id: endpointGroupId });
    if (endpoint === null) {
      return ApiResponse.error({
        message: ERROR_MESSAGES.NO_CONTENT,
        statusCode: STATUS_CODE.NO_CONTENT,
      });
    }
    const endpointGroupInfoValidation = validateData(
      {
        public_id: IdConverter.encode(endpoint.id),
        name: endpoint.name,
        project_id: IdConverter.encode(endpoint.project_id),
      },
      EndpointGroupInfoSchema
    );
    if (!endpointGroupInfoValidation.success) {
      return endpointGroupInfoValidation.response;
    }
    const endpointGroupInfo = endpointGroupInfoValidation.data;
    return ApiResponse.success({ data: endpointGroupInfo });
  } catch (error) {
    if (error instanceof AppError) {
      return ApiResponse.error({
        message: error.message,
        statusCode: error.statusCode,
      });
    }
    return ApiResponse.error();
  }
}
