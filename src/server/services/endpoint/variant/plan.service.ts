import { prisma } from "@/server/prisma/prisma_provider";
import { AppError } from "@/server/core/errors";
import { STATUS_CODE } from "@/server/core/constants";
import { ENDPOINT_AI_MESSAGES } from "@/server/services/endpoint/endpoint.constants";
import { MAX_PLAN_BYTES } from "@/models/endpoint_plan/limits.model";
import { VariantPlanDTO } from "@/models/endpoint_plan/endpoint_plan.model";
import { isAiConfigured } from "@/server/services/ai/ai_router.service";
import aiUsageService from "@/server/services/ai_usage.service";
import { buildPlan, splitSelection } from "@/server/services/endpoint/variant/plan_build";
import { validatePlan } from "@/server/services/endpoint/variant/validate";
import { planHash } from "@/server/services/endpoint/variant/plan_hash";
import { collectUniqueCatalogs } from "@/server/services/endpoint/variant/plan_catalogs";
import {
  CachedPlan,
  getCachedPlan,
  parsePlan,
  setCachedPlan,
} from "@/server/services/endpoint/variant/plan_cache";
import {
  acquirePlanLock,
  clearPlan,
  holdsPlanLock,
  ownerOf,
  releasePlanLock,
} from "@/server/services/endpoint/variant/plan_lock";

export { planHash };
export { resetPlanCache } from "@/server/services/endpoint/variant/plan_cache";
export type { CachedPlan } from "@/server/services/endpoint/variant/plan_cache";
export { buildPlan, splitSelection } from "@/server/services/endpoint/variant/plan_build";
export type { BuildPlanInput } from "@/server/services/endpoint/variant/plan_build";

export interface PlanEndpoint {
  id: bigint;
  method: string;
  path: string;
  response_body: string;
  ai_enabled: boolean;
  ai_fields: string[];
  ai_prompt: string | null;
  ai_plan?: string | null;
  ai_plan_hash?: string | null;
}

class EndpointVariantPlanService {
  acquirePlanLock = acquirePlanLock;
  releasePlanLock = releasePlanLock;
  holdsPlanLock = holdsPlanLock;
  clearPlan = clearPlan;
  ownerOf = ownerOf;

  // `null` when there is no stored blueprint, or it no longer matches the body.
  loadPlan(endpoint: PlanEndpoint): VariantPlanDTO | null {
    return this.loadRenderable(endpoint)?.plan ?? null;
  }

  // The blueprint plus the derived data the executor needs, memoised on `ai_plan_hash`. A hit is
  // confirmed against the stored text too, because the hash covers the inputs a blueprint was
  // built for and not the blueprint they produced.
  loadRenderable(endpoint: PlanEndpoint): CachedPlan | null {
    if (!endpoint.ai_enabled || endpoint.ai_fields.length === 0) return null;
    if (!endpoint.ai_plan || !endpoint.ai_plan_hash) return null;

    if (endpoint.ai_plan_hash !== planHash(this.hashInput(endpoint))) return null;

    return this.renderableOf(endpoint.ai_plan_hash, endpoint.ai_plan);
  }

  // The blueprint a caller's own inputs were built for, which is a different question from
  // `loadRenderable`: the hash comes from the request rather than from the stored columns, so an
  // unsaved edit in the form is what decides. Judging it is the caller's job, as it is for a
  // blueprint that arrives in the request body.
  planForHash(endpoint: PlanEndpoint, hash: string): VariantPlanDTO | null {
    if (!endpoint.ai_plan || endpoint.ai_plan_hash !== hash) return null;

    return this.renderableOf(hash, endpoint.ai_plan)?.plan ?? null;
  }

  private renderableOf(hash: string, source: string): CachedPlan | null {
    const cached = getCachedPlan(hash, source);
    if (cached) return cached;

    const plan = parsePlan(source);
    if (!plan) return null;

    const entry: CachedPlan = {
      plan,
      uniqueCatalogs: collectUniqueCatalogs(plan),
      source,
    };
    setCachedPlan(hash, entry);
    return entry;
  }

  isPlanStale(endpoint: PlanEndpoint): boolean {
    return this.loadPlan(endpoint) === null;
  }

  // Goes through `loadPlan` deliberately: a blueprint whose hash no longer matches does not
  // describe this body any more, so neither does its verdict, and the honest answer while a new
  // one is being built is "nothing known yet".
  planInfoOf(endpoint: PlanEndpoint) {
    const plan = this.loadPlan(endpoint);
    if (!plan) return undefined;

    return {
      unsupported_language: plan.unsupported_language,
      unapplied_hints: plan.unapplied_hints,
    };
  }

  private hashInput(endpoint: PlanEndpoint) {
    return {
      responseBody: endpoint.response_body,
      aiFields: endpoint.ai_fields,
      aiPrompt: endpoint.ai_prompt,
    };
  }

  // The third way to a stored blueprint and the only free one: the client hands back what a
  // preview designed. The hash says it was built for these inputs, `validatePlan` says it is safe
  // to run, and neither answer substitutes for the other. Never throws; `false` means design it.
  async adoptPlan(endpoint: PlanEndpoint, plan: VariantPlanDTO, hash: string): Promise<boolean> {
    try {
      if (hash !== planHash(this.hashInput(endpoint))) return false;

      const base: unknown = JSON.parse(endpoint.response_body);
      const { valueFields, arrayPaths } = splitSelection(base, endpoint.ai_fields);
      const covered = [...valueFields.map((field) => field.path), ...arrayPaths];
      if (!validatePlan(plan, base, covered).ok) return false;

      await this.storePlan(endpoint, plan);
      return true;
    } catch (error) {
      console.error("[ai] could not adopt the blueprint sent with the endpoint", {
        endpoint_id: String(endpoint.id),
        reason: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }

  // Never throws: every caller runs it in `after()`, and a failure only means the next request
  // serves the base body. The lock is released deliberately rather than in a `finally`, because
  // it doubles as the retry cooldown.
  async ensurePlan(endpoint: PlanEndpoint): Promise<VariantPlanDTO | null> {
    if (!endpoint.ai_enabled || endpoint.ai_fields.length === 0) return null;
    if (!isAiConfigured()) return null;

    const existing = this.loadPlan(endpoint);
    if (existing) return existing;

    try {
      const startedAt = await this.acquirePlanLock(endpoint.id);
      if (!startedAt) return null;

      const owner = await this.ownerOf(endpoint.id);
      if (!owner) return null;

      // Claimed before the call: what the quota protects is the provider bill, and a design that
      // fails still spent up to two calls getting there. One transaction rather than a check
      // then an insert, so two concurrent builds cannot both pass the same check.
      if (!(await aiUsageService.trySpend({ public_id: owner.public_id }))) {
        // The cooldown exists to stop a dead provider being hammered, and a quota refusal reached
        // no provider at all, so holding the lock would only delay the first build after a reset.
        await this.releasePlanLock(endpoint.id, startedAt);
        return null;
      }

      const plan = await buildPlan({
        method: endpoint.method,
        path: endpoint.path,
        responseBody: endpoint.response_body,
        aiFields: endpoint.ai_fields,
        aiPrompt: endpoint.ai_prompt,
      });

      // An edit can land while the model is thinking: it clears the blueprint and drops the
      // lock, and without this check the build would store a blueprint for a dead body.
      if (!(await this.holdsPlanLock(endpoint.id, startedAt))) {
        console.warn("[ai] blueprint lost its lock mid build, discarding", {
          endpoint_id: String(endpoint.id),
        });
        return null;
      }

      await this.storePlan(endpoint, plan);
      await this.releasePlanLock(endpoint.id, startedAt);
      return plan;
    } catch (error) {
      console.error("[ai] blueprint build failed", {
        endpoint_id: String(endpoint.id),
        reason: error instanceof Error ? error.message : String(error),
        cause: error instanceof AppError ? error.cause : undefined,
      });
      return null;
    }
  }

  private async storePlan(endpoint: PlanEndpoint, plan: VariantPlanDTO) {
    const serialized = JSON.stringify(plan);
    if (serialized.length > MAX_PLAN_BYTES) {
      throw new AppError({
        message: ENDPOINT_AI_MESSAGES.FIELDS_TOO_LARGE,
        statusCode: STATUS_CODE.BAD_REQUEST,
      });
    }

    const hash = planHash(this.hashInput(endpoint));

    // Raw SQL for the same reason the lock uses it: this must not bump `updated_at`.
    await prisma.$executeRaw`
      UPDATE "endpoints"
      SET "ai_plan" = ${serialized}, "ai_plan_hash" = ${hash}, "ai_plan_at" = ${new Date()}
      WHERE "id" = ${endpoint.id}
    `;
  }
}

const endpointVariantPlanService = new EndpointVariantPlanService();
export default endpointVariantPlanService;
