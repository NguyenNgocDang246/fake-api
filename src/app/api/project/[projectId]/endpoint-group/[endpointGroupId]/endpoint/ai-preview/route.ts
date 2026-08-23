import ApiResponse from "@/server/core/api_response";
import { ERROR_MESSAGES, LIMIT_MESSAGES, STATUS_CODE } from "@/server/core/constants";
import { AI_MESSAGES } from "@/server/services/ai/ai.constants";
import { validateData } from "@/server/core/validation";
import { AiPreviewSchema } from "@/models/endpoint.model";
import endpointGroupService from "@/server/services/endpoint_group.service";
import endpointVariantService from "@/server/services/endpoint/endpoint_variant.service";
import { generateVariants } from "@/server/services/endpoint/endpoint_variant_generator.service";
import { isAiConfigured } from "@/server/services/ai/ai_router.service";
import {
  createRouteHandler,
  withEndpointGroupId,
  withProjectId,
  withUserId,
} from "@/server/core/route_helpers";

type AiPreviewRouteParams = { projectId: string; endpointGroupId: string };

export const POST = createRouteHandler<AiPreviewRouteParams>(
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

        if (!isAiConfigured()) {
          return ApiResponse.error({
            message: AI_MESSAGES.NOT_CONFIGURED,
            statusCode: STATUS_CODE.SERVER_ERROR,
          });
        }

        if (!(await endpointVariantService.canGenerate({ public_id: ctx.userId }))) {
          return ApiResponse.error({
            message: LIMIT_MESSAGES.AI_VARIANT_LIMIT_REACHED,
            statusCode: STATUS_CODE.FORBIDDEN,
          });
        }

        const validation = validateData(await req.json(), AiPreviewSchema);
        if (!validation.success) return validation.response;

        const { method, path, response_body, ai_fields, ai_prompt, count } = validation.data;
        const { bodies } = await generateVariants({
          method,
          path,
          responseBody: response_body,
          aiFields: ai_fields,
          aiPrompt: ai_prompt,
          count,
        });

        if (bodies.length === 0) {
          return ApiResponse.error({
            message: AI_MESSAGES.NO_USABLE_VARIANT,
            statusCode: STATUS_CODE.SERVER_ERROR,
          });
        }

        return ApiResponse.success({ data: { variants: bodies } });
      })
    )
  )
);
