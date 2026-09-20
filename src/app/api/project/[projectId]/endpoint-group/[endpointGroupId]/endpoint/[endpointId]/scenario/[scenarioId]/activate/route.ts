import ApiResponse from "@/server/core/api_response";
import { ERROR_MESSAGES, STATUS_CODE } from "@/server/core/constants";
import { validateData } from "@/server/core/validation";
import {
  createRouteHandler,
  withEndpointGroupId,
  withEndpointId,
  withProjectId,
  withScenarioId,
  withUserId,
} from "@/server/core/route_helpers";
import { EndpointInfoSchema, toEndpointInfoInput } from "@/models/endpoint/endpoint.model";
import endpointService from "@/server/services/endpoint/endpoint.service";
import scenarioService from "@/server/services/endpoint/scenario.service";
import { scenarioInfoOf } from "@/server/services/endpoint/scenario_view";

type ScenarioActivateRouteParams = {
  projectId: string;
  endpointGroupId: string;
  endpointId: string;
  scenarioId: string;
};

// Switching which scenario answers, without reopening the form and saving the whole pager back.
// The write routes can do the same thing as part of a save; this is the one that does only it.
export const POST = createRouteHandler<ScenarioActivateRouteParams>(
  withUserId(
    withProjectId(
      withEndpointGroupId(
        withEndpointId(
          withScenarioId(async (_req, _params, ctx) => {
            const hasPermission = await scenarioService.checkPermission({
              userProps: { public_id: ctx.userId },
              projectProps: { public_id: ctx.projectId },
              endpointGroupProps: { public_id: ctx.endpointGroupId },
              endpointProps: { public_id: ctx.endpointId },
              scenarioProps: { public_id: ctx.scenarioId },
            });
            if (!hasPermission) {
              return ApiResponse.error({
                message: ERROR_MESSAGES.FORBIDDEN,
                statusCode: STATUS_CODE.FORBIDDEN,
              });
            }

            const switched = await scenarioService.setActiveScenario({
              public_id: ctx.scenarioId,
            });
            if (!switched) {
              return ApiResponse.error({
                message: ERROR_MESSAGES.NOT_FOUND,
                statusCode: STATUS_CODE.NOT_FOUND,
              });
            }

            // The whole endpoint comes back rather than an acknowledgement, so the list can take
            // the new active scenario from the response instead of refetching behind it.
            const endpoint = await endpointService.getEndpointById({ public_id: ctx.endpointId });
            if (!endpoint) {
              return ApiResponse.error({
                message: ERROR_MESSAGES.NOT_FOUND,
                statusCode: STATUS_CODE.NOT_FOUND,
              });
            }

            const validation = validateData(
              toEndpointInfoInput(
                endpoint,
                ctx.endpointGroupId,
                endpoint.scenarios.map(scenarioInfoOf)
              ),
              EndpointInfoSchema
            );
            if (!validation.success) return validation.response;
            return ApiResponse.success({ data: validation.data });
          })
        )
      )
    )
  )
);
