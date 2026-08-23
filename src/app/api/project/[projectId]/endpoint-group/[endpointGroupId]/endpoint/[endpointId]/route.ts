import { after } from "next/server";
import ApiResponse from "@/server/core/api_response";
import { ERROR_MESSAGES, STATUS_CODE } from "@/server/core/constants";
import { ENDPOINT_MESSAGES } from "@/server/services/endpoint/endpoint.constants";
import { AppError } from "@/server/core/errors";
import { validateData } from "@/server/core/validation";
import {
  createRouteHandler,
  withEndpointGroupId,
  withEndpointId,
  withProjectId,
  withUserId,
} from "@/server/core/route_helpers";
import {
  EndpointInfoSchema,
  UpdateEndpointByIdSchema,
  toEndpointInfoInput,
} from "@/models/endpoint.model";
import endpointService from "@/server/services/endpoint/endpoint.service";
import endpointVariantService from "@/server/services/endpoint/endpoint_variant.service";

type EndpointRouteParams = {
  projectId: string;
  endpointGroupId: string;
  endpointId: string;
};

type PoolInputs = {
  response_body?: string;
  ai_prompt?: string | null;
  ai_fields?: string[];
};

function sameFields(previous: string[] = [], updated: string[] = []): boolean {
  const seen = new Set(previous);
  // Set sizes, not array lengths: nothing rejects a repeated path on the way in, so lengths
  // would call `["a", "b"]` and `["a", "a"]` the same selection and keep a stale pool.
  if (seen.size !== new Set(updated).size) return false;

  return updated.every((path) => seen.has(path));
}

function isPoolStale(previous: PoolInputs | null, updated: PoolInputs): boolean {
  if (!previous) return true;

  return (
    previous.response_body !== updated.response_body ||
    previous.ai_prompt !== updated.ai_prompt ||
    !sameFields(previous.ai_fields, updated.ai_fields)
  );
}

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
            toEndpointInfoInput(endpoint, ctx.endpointGroupId),
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

          const previous =
            endpointExists?.public_id === ctx.endpointId
              ? endpointExists
              : await endpointService.getEndpointById({ public_id: ctx.endpointId });

          const endpointUpdated = await endpointService.updateEndpointById(endpointInfo);
          if (!endpointUpdated) {
            return ApiResponse.error({
              message: ERROR_MESSAGES.NO_CONTENT,
              statusCode: STATUS_CODE.NO_CONTENT,
            });
          }

          // Switching AI on is here as well as staleness: `isPoolStale` only compares the body,
          // the hint and the field list, so turning the feature on alone would never seed a pool.
          const turnedOn = endpointUpdated.ai_enabled && !previous?.ai_enabled;

          if (isPoolStale(previous, endpointUpdated) || !endpointUpdated.ai_enabled || turnedOn) {
            after(async () => {
              try {
                await endpointVariantService.clearVariants(endpointUpdated.id);
                await endpointVariantService.refillIfNeeded(endpointUpdated);
              } catch (error) {
                console.error("[ai] pool invalidation failed", {
                  endpoint_id: String(endpointUpdated.id),
                  reason: error instanceof Error ? error.message : String(error),
                  cause: error instanceof AppError ? error.cause : undefined,
                });
              }
            });
          }

          const endpointInfoValidation = validateData(
            toEndpointInfoInput(endpointUpdated, ctx.endpointGroupId),
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
