import ApiResponse from "@/server/core/api_response";
import {
  AI_MESSAGES,
  AI_POOL_SIZE,
  ERROR_MESSAGES,
  LIMIT_MESSAGES,
  STATUS_CODE,
} from "@/server/core/constants";
import endpointService from "@/server/services/endpoint/endpoint.service";
import endpointVariantService from "@/server/services/endpoint/endpoint_variant.service";
import { isAiConfigured } from "@/server/services/ai/ai_router.service";
import {
  createRouteHandler,
  withEndpointGroupId,
  withEndpointId,
  withProjectId,
  withUserId,
} from "@/server/core/route_helpers";

type AiVariantsRouteParams = {
  projectId: string;
  endpointGroupId: string;
  endpointId: string;
};

/** The variant pool of a stored endpoint: read it, rebuild it, clear it. */

export const GET = createRouteHandler<AiVariantsRouteParams>(
  withUserId(
    withProjectId(
      withEndpointGroupId(
        withEndpointId(async (_req, _params, ctx) => {
          const endpoint = await requireEndpoint(ctx);
          if ("response" in endpoint) return endpoint.response;

          const variants = await endpointVariantService.listVariants(endpoint.data.id);
          return ApiResponse.success({
            data: {
              variants: variants.map((variant) => ({
                response_body: variant.response_body,
                used_count: variant.used_count,
              })),
            },
          });
        })
      )
    )
  )
);

export const POST = createRouteHandler<AiVariantsRouteParams>(
  withUserId(
    withProjectId(
      withEndpointGroupId(
        withEndpointId(async (_req, _params, ctx) => {
          const endpoint = await requireEndpoint(ctx);
          if ("response" in endpoint) return endpoint.response;

          if (!isAiConfigured()) {
            return ApiResponse.error({
              message: AI_MESSAGES.NOT_CONFIGURED,
              statusCode: STATUS_CODE.SERVER_ERROR,
            });
          }

          if (!endpoint.data.ai_enabled || endpoint.data.ai_fields.length === 0) {
            return ApiResponse.error({
              message: AI_MESSAGES.NOT_ENABLED,
              statusCode: STATUS_CODE.BAD_REQUEST,
            });
          }

          if (!(await endpointVariantService.canGenerate({ public_id: ctx.userId }))) {
            return ApiResponse.error({
              message: LIMIT_MESSAGES.AI_VARIANT_LIMIT_REACHED,
              statusCode: STATUS_CODE.FORBIDDEN,
            });
          }

          // Rebuild from scratch: drop the old pool first so two generations do not mix.
          await endpointVariantService.clearVariants(endpoint.data.id);
          const created = await endpointVariantService.generateAndStore({
            endpoint: endpoint.data,
            count: AI_POOL_SIZE,
          });

          if (created === 0) {
            return ApiResponse.error({
              message: AI_MESSAGES.NO_USABLE_VARIANT,
              statusCode: STATUS_CODE.SERVER_ERROR,
            });
          }

          const variants = await endpointVariantService.listVariants(endpoint.data.id);
          return ApiResponse.success({
            data: { variants: variants.map((variant) => variant.response_body) },
          });
        })
      )
    )
  )
);

export const DELETE = createRouteHandler<AiVariantsRouteParams>(
  withUserId(
    withProjectId(
      withEndpointGroupId(
        withEndpointId(async (_req, _params, ctx) => {
          const endpoint = await requireEndpoint(ctx);
          if ("response" in endpoint) return endpoint.response;

          const { count } = await endpointVariantService.clearVariants(endpoint.data.id);
          if (count === 0) {
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

/**
 * Check permission, then load the endpoint. `checkPermissions` already verifies the whole
 * ancestor chain in one query, so it is called once here rather than at every chain level.
 */
async function requireEndpoint(ctx: {
  userId: string;
  projectId: string;
  endpointGroupId: string;
  endpointId: string;
}) {
  const hasPermission = await endpointService.checkPermissions({
    userProps: { public_id: ctx.userId },
    projectProps: { public_id: ctx.projectId },
    endpointGroupProps: { public_id: ctx.endpointGroupId },
    endpointProps: { public_id: ctx.endpointId },
  });
  if (!hasPermission) {
    return {
      response: ApiResponse.error({
        message: ERROR_MESSAGES.FORBIDDEN,
        statusCode: STATUS_CODE.FORBIDDEN,
      }),
    };
  }

  const endpoint = await endpointService.getEndpointById({ public_id: ctx.endpointId });
  if (!endpoint) {
    return {
      response: ApiResponse.error({
        message: ERROR_MESSAGES.NOT_FOUND,
        statusCode: STATUS_CODE.NOT_FOUND,
      }),
    };
  }

  return { data: endpoint };
}
