import ApiResponse from "@/server/core/api_response";
import { createStaticRouteHandler } from "@/server/core/route_helpers";
import { isAiConfigured } from "@/server/services/ai/ai_router.service";

// Tells the UI whether the server has AI configured, so the form can hide the AI block instead
// of letting someone click it and get an error. Only a boolean: it never reveals which
// providers or keys are set.
export const GET = createStaticRouteHandler(async () =>
  ApiResponse.success({ data: { configured: isAiConfigured() } })
);
