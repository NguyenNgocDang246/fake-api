import ApiResponse from "@/server/core/api_response";
import { AI_MESSAGES, ERROR_MESSAGES, LIMIT_MESSAGES, STATUS_CODE } from "@/server/core/constants";
import { validateData } from "@/server/core/validation";
import { AiPreviewSchema } from "@/models/endpoint.model";
import endpointGroupService from "@/server/services/endpoint_group.service";
import endpointVariantService from "@/server/services/endpoint_variant.service";
import { generateVariants } from "@/server/services/endpoint_variant_generator.service";
import { isAiConfigured } from "@/server/services/ai/ai_router.service";
import {
  createRouteHandler,
  withEndpointGroupId,
  withProjectId,
  withUserId,
} from "@/server/core/route_helpers";

type AiPreviewRouteParams = { projectId: string; endpointGroupId: string };

/**
 * Preview a few variants without storing anything.
 *
 * Sits on the endpoint *collection* (`/endpoint/ai-preview`) rather than on a single endpoint,
 * because the create form needs a preview before any endpoint exists, and because a preview
 * renders what is being typed in the form rather than what is stored on a row.
 *
 * `ai-preview` is a static segment next to the dynamic `[endpointId]`, and Next resolves static
 * first, so it can never be swallowed by an endpoint id. Nor can it collide: a `public_id` is
 * exactly `PUBLIC_ID_LENGTH` characters from an alphabet with no hyphen.
 *
 * This is one of the two synchronous paths to the model, so it still goes through the per-role
 * quota. Note the quota only gates it and is never consumed here: nothing is written to
 * `endpoint_ai_variants`, which is what `canGenerate` counts.
 */
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
