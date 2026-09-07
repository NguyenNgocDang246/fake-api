import { NextRequest, NextResponse } from "next/server";
import ApiResponse from "./api_response";
import { AppError } from "./errors";
import { validateData } from "./validation";
import { GetUserByIdSchema } from "@/models/user.model";
import { GetProjectByIdSchema } from "@/models/project.model";
import { GetEndpointGroupByIdSchema } from "@/models/endpoint_group.model";
import { GetEndpointByIdSchema } from "@/models/endpoint/endpoint.model";

export type RouteParams = Record<string, string | undefined>;
export type ChainHandler<C> = (
  req: NextRequest,
  params: RouteParams,
  ctx: C
) => Promise<NextResponse>;

export function withErrorHandling<Args extends unknown[]>(
  handler: (...args: Args) => Promise<NextResponse>
) {
  return async (...args: Args): Promise<NextResponse> => {
    try {
      return await handler(...args);
    } catch (error) {
      if (error instanceof AppError) {
        return ApiResponse.error({ message: error.message, statusCode: error.statusCode });
      }
      return ApiResponse.error();
    }
  };
}

export function createRouteHandler<T extends Record<string, string>>(
  chain: ChainHandler<Record<never, never>>
) {
  return withErrorHandling(async (req: NextRequest, props: { params: Promise<T> }) => {
    const params = await props.params;
    return chain(req, params, {});
  });
}

export function createStaticRouteHandler(chain: ChainHandler<Record<never, never>>) {
  return withErrorHandling(async (req: NextRequest) => chain(req, {}, {}));
}

export function withUserId<C>(next: ChainHandler<C & { userId: string }>): ChainHandler<C> {
  return async (req, params, ctx) => {
    const validation = validateData({ public_id: req.headers.get("x-userId") }, GetUserByIdSchema);
    if (!validation.success) return validation.response;
    return next(req, params, { ...ctx, userId: validation.data.public_id });
  };
}

export function withProjectId<C>(next: ChainHandler<C & { projectId: string }>): ChainHandler<C> {
  return async (req, params, ctx) => {
    const validation = validateData({ public_id: params["projectId"] }, GetProjectByIdSchema);
    if (!validation.success) return validation.response;
    return next(req, params, { ...ctx, projectId: validation.data.public_id });
  };
}

export function withEndpointGroupId<C>(
  next: ChainHandler<C & { endpointGroupId: string }>
): ChainHandler<C> {
  return async (req, params, ctx) => {
    const validation = validateData(
      { public_id: params["endpointGroupId"] },
      GetEndpointGroupByIdSchema
    );
    if (!validation.success) return validation.response;
    return next(req, params, { ...ctx, endpointGroupId: validation.data.public_id });
  };
}

export function withEndpointId<C>(
  next: ChainHandler<C & { endpointId: string }>
): ChainHandler<C> {
  return async (req, params, ctx) => {
    const validation = validateData({ public_id: params["endpointId"] }, GetEndpointByIdSchema);
    if (!validation.success) return validation.response;
    return next(req, params, { ...ctx, endpointId: validation.data.public_id });
  };
}
