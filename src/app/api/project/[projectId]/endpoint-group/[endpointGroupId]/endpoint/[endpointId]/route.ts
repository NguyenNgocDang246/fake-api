import { NextRequest } from "next/server";
import ApiResponse from "@/server/core/api_response";
import { GetUserByIdSchema } from "@/models/user.model";
import { AppError } from "@/server/core/errors";
import { ERROR_MESSAGES, STATUS_CODE } from "@/server/core/constants";
import { validateData } from "@/server/core/validation";
import { GetProjectByIdSchema } from "@/models/project.model";
import checkProjectPermission from "@/app/api/project/helpers/checkProjectPermission";
import { GetEndpointGroupByIdSchema } from "@/models/endpoint_group.model";
import IdConverter from "@/app/libs/helpers/idConverter";
import EndpointService from "@/server/services/endpoint.service";
import { EndpointInfoSchema, GetEndpointByIdSchema } from "@/models/endpoint.model";
export async function GET(
  req: NextRequest,
  props: { params: Promise<{ projectId: string; endpointGroupId: string; endpointId: string }> }
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

    const endpointIdRaw = params.endpointId;
    const endpointIdValidation = validateData(
      { id: IdConverter.decode(endpointIdRaw) },
      GetEndpointByIdSchema
    );
    if (!endpointIdValidation.success) {
      return endpointIdValidation.response;
    }
    const endpointId = endpointIdValidation.data.id;

    const endpoint = await EndpointService.getEndpointById({ id: endpointId });
    if (!endpoint) {
      return ApiResponse.error({
        message: ERROR_MESSAGES.NO_CONTENT,
        statusCode: STATUS_CODE.NO_CONTENT,
      });
    }
    if (endpoint.endpoint_groups_id !== endpointGroupId) {
      return ApiResponse.error({
        message: ERROR_MESSAGES.FORBIDDEN,
        statusCode: STATUS_CODE.FORBIDDEN,
      });
    }
    const endpointValidation = validateData(
      {
        public_id: IdConverter.encode(endpoint.id),
        path: endpoint.path,
        method: endpoint.method,
        status_code: endpoint.status_code,
        response_body: endpoint.response_body,
        delay_ms: endpoint.delay_ms,
        endpoint_groups_id: IdConverter.encode(endpoint.endpoint_groups_id),
      },
      EndpointInfoSchema
    );
    if (!endpointValidation.success) {
      return endpointValidation.response;
    }
    const endpointInfo = endpointValidation.data;
    return ApiResponse.success({ data: endpointInfo });
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
