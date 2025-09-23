import { NextRequest } from "next/server";
import ApiResponse from "@/server/core/api_response";
import { GetProjectByIdSchema } from "@/models/project.model";
import { GetUserByIdSchema } from "@/models/user.model";
import { AppError } from "@/server/core/errors";
import { ERROR_MESSAGES, STATUS_CODE } from "@/server/core/constants";
import { validateData } from "@/server/core/validation";
import projectService from "@/server/services/project.service";
import IdConverter from "@/app/libs/helpers/idConverter";
import { ProjectInfoSchema } from "@/models/project.model";

export async function GET(req: NextRequest, props: { params: Promise<{ projectId: string }> }) {
  try {
    const id = req.headers.get("x-userId");
    const userId = GetUserByIdSchema.parse({ id }).id;
    const params = await props.params;
    const projectIdRaw = IdConverter.decode(params.projectId);
    const validation = validateData({ id: projectIdRaw }, GetProjectByIdSchema);
    if (!validation.success) {
      return validation.response;
    }
    const projectId = validation.data.id;

    const project = await projectService.getProjectById({ id: projectId });
    if (project === null) {
      return ApiResponse.error({
        message: ERROR_MESSAGES.NO_CONTENT,
        statusCode: STATUS_CODE.NO_CONTENT,
      });
    }
    if (userId !== project.user_id) {
      return ApiResponse.error({
        message: ERROR_MESSAGES.FORBIDDEN,
        statusCode: STATUS_CODE.FORBIDDEN,
      });
    }

    const projectInfoValidation = validateData(
      {
        public_id: IdConverter.encode(project.id),
        name: project.name,
        description: project.description,
        user_id: IdConverter.encode(project.user_id),
      },
      ProjectInfoSchema
    );
    if (!projectInfoValidation.success) {
      return projectInfoValidation.response;
    }
    const projectInfo = projectInfoValidation.data;

    return ApiResponse.success({ data: projectInfo });
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
