import ApiResponse from "@/server/core/api_response";
import { ERROR_MESSAGES, LIMIT_MESSAGES, STATUS_CODE } from "@/server/core/constants";
import { AI_MESSAGES } from "@/server/services/ai/ai.constants";
import { validateData } from "@/server/core/validation";
import { AiPreviewSchema } from "@/models/endpoint/endpoint.model";
import { VariantPlanDTO } from "@/models/endpoint_plan/endpoint_plan.model";
import { MAX_PLAN_BYTES } from "@/models/endpoint_plan/limits.model";
import {
  AI_PREVIEW_MAX_REQUEST_BYTES,
  ENDPOINT_AI_MESSAGES,
} from "@/server/services/endpoint/endpoint.constants";
import endpointGroupService from "@/server/services/endpoint_group.service";
import endpointService from "@/server/services/endpoint/endpoint.service";
import aiUsageService from "@/server/services/ai_usage.service";
import endpointVariantPlanService, {
  buildPlan,
  planHash,
  splitSelection,
} from "@/server/services/endpoint/variant/plan.service";
import { collectUniqueCatalogs } from "@/server/services/endpoint/variant/plan_catalogs";
import { renderVariant } from "@/server/services/endpoint/variant/faker.service";
import { validatePlan } from "@/server/services/endpoint/variant/validate";
import { isAiConfigured } from "@/server/services/ai/ai_router.service";
import {
  createRouteHandler,
  withEndpointGroupId,
  withProjectId,
  withUserId,
} from "@/server/core/route_helpers";

type AiPreviewRouteParams = { projectId: string; endpointGroupId: string };

// Preview is two different operations behind one route. Rendering more samples from a blueprint
// that already exists is free and instant, so it neither spends quota nor takes a cooldown, and
// the blueprint may come from the caller or from the endpoint it names. Designing one is the
// expensive half, and only it is metered.
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

        // Before the parse, not after: Zod's `.max()` on a collection only runs once every
        // element has been parsed, so by then an oversized payload has already cost that work.
        const declaredBytes = Number(req.headers.get("content-length") ?? 0);
        if (declaredBytes > AI_PREVIEW_MAX_REQUEST_BYTES) {
          return ApiResponse.error({
            message: ENDPOINT_AI_MESSAGES.REQUEST_TOO_LARGE,
            statusCode: STATUS_CODE.PAYLOAD_TOO_LARGE,
          });
        }

        // A chunked request declares no length, so the header alone would let it through. Reading
        // the text still buffers the body; what this saves is the parse, not the memory.
        const rawBody = await req.text();
        if (rawBody.length > AI_PREVIEW_MAX_REQUEST_BYTES) {
          return ApiResponse.error({
            message: ENDPOINT_AI_MESSAGES.REQUEST_TOO_LARGE,
            statusCode: STATUS_CODE.PAYLOAD_TOO_LARGE,
          });
        }

        const validation = validateData(JSON.parse(rawBody), AiPreviewSchema);
        if (!validation.success) return validation.response;

        // The stored blueprint is held to this, so one arriving from a client is held to it too.
        if (
          validation.data.plan &&
          JSON.stringify(validation.data.plan).length > MAX_PLAN_BYTES
        ) {
          return ApiResponse.error({
            message: ENDPOINT_AI_MESSAGES.REQUEST_TOO_LARGE,
            statusCode: STATUS_CODE.PAYLOAD_TOO_LARGE,
          });
        }

        const { method, path, response_body, ai_fields, ai_prompt, count, endpoint_id } =
          validation.data;
        const base: unknown = JSON.parse(response_body);
        const { valueFields, arrayPaths } = splitSelection(base, ai_fields);
        const covered = [...valueFields.map((field) => field.path), ...arrayPaths];

        const hash = planHash({
          responseBody: response_body,
          aiFields: ai_fields,
          aiPrompt: ai_prompt,
        });

        // The caller's cached blueprint only counts when it was built for these exact inputs and
        // still validates against this body. Otherwise it is ignored and a new one is designed.
        let plan: VariantPlanDTO | null =
          validation.data.plan && validation.data.plan_hash === hash ? validation.data.plan : null;
        if (plan && !validatePlan(plan, base, covered).ok) plan = null;

        // The second free source, and the one the update form uses: an endpoint that already
        // stores a blueprint for these exact inputs. It is held to both checks the caller's own
        // blueprint is held to, since a hash only says which inputs it was built for.
        if (!plan && endpoint_id) {
          const stored = await endpointService.getEndpointInGroup({
            public_id: endpoint_id,
            endpoint_groups_public_id: ctx.endpointGroupId,
          });

          if (stored) {
            plan = endpointVariantPlanService.planForHash(stored, hash);
            if (plan && !validatePlan(plan, base, covered).ok) plan = null;
          }
        }

        if (!plan) {
          if (!isAiConfigured()) {
            return ApiResponse.error({
              message: AI_MESSAGES.NOT_CONFIGURED,
              statusCode: STATUS_CODE.SERVER_ERROR,
            });
          }

          // Asked first because `trySpend` answers `null` to both "no AI at all" and "none left
          // today", and telling a role with no AI to come back tomorrow describes a day that
          // never arrives. The create and update routes refuse `ai_enabled` on the same check.
          if (!(await aiUsageService.isAiAllowed({ public_id: ctx.userId }))) {
            return ApiResponse.error({
              message: LIMIT_MESSAGES.AI_NOT_AVAILABLE_FOR_ROLE,
              statusCode: STATUS_CODE.FORBIDDEN,
              errors: await aiUsageService.quotaFor({ public_id: ctx.userId }),
            });
          }

          // Claimed before the call, not recorded after: what the quota protects is the provider
          // bill, and a design that fails still spent up to two calls getting there. One
          // transaction, so two concurrent designs cannot both pass the same check.
          if (!(await aiUsageService.trySpend({ public_id: ctx.userId }))) {
            return ApiResponse.error({
              message: LIMIT_MESSAGES.AI_PLAN_LIMIT_REACHED,
              statusCode: STATUS_CODE.FORBIDDEN,
              errors: await aiUsageService.quotaFor({ public_id: ctx.userId }),
            });
          }

          plan = await buildPlan({
            method,
            path,
            responseBody: response_body,
            aiFields: ai_fields,
            aiPrompt: ai_prompt,
          });
        }

        // Hoisted out of the loop: the set is a property of the blueprint, not of one sample.
        const uniqueCatalogs = collectUniqueCatalogs(plan);

        const variants = Array.from({ length: count }, () =>
          renderVariant(plan, base, { uniqueCatalogs })
        )
          .filter((body): body is NonNullable<typeof body> => body !== null)
          .map((body) => JSON.stringify(body));

        if (variants.length === 0) {
          return ApiResponse.error({
            message: ENDPOINT_AI_MESSAGES.NO_USABLE_VARIANT,
            statusCode: STATUS_CODE.SERVER_ERROR,
          });
        }

        // Travels with every answer, a free reroll included, so the card's badge is never a
        // request behind what was just spent.
        const quota = await aiUsageService.quotaFor({ public_id: ctx.userId });

        return ApiResponse.success({
          data: {
            variants,
            plan,
            plan_hash: hash,
            unapplied_hints: plan.unapplied_hints,
            quota,
          },
        });
      })
    )
  )
);
