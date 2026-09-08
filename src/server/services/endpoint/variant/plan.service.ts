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

// Everything a blueprint is judged against. `PlanEndpoint` is this plus the row identity and the
// two columns only the prompt reads, so a create can ask the same questions before it has a row,
// and an update can ask them of values that have not been written yet.
export type PlanSubject = Omit<PlanEndpoint, "id" | "method" | "path">;

// The selection and hint a stored blueprint was designed under. The row holds them until an
// update writes over them, so a write path reads it first to tell what the edit actually moved.
export interface PlanOrigin {
  ai_fields: string[];
  ai_prompt: string | null;
}

class EndpointVariantPlanService {
  acquirePlanLock = acquirePlanLock;
  releasePlanLock = releasePlanLock;
  holdsPlanLock = holdsPlanLock;
  clearPlan = clearPlan;
  ownerOf = ownerOf;

  // `null` when there is no stored blueprint, or it no longer matches the body.
  loadPlan(endpoint: PlanSubject): VariantPlanDTO | null {
    return this.loadRenderable(endpoint)?.plan ?? null;
  }

  // The blueprint plus the derived data the executor needs, memoised on `ai_plan_hash`. A hit is
  // confirmed against the stored text too, because the hash covers the inputs a blueprint was
  // built for and not the blueprint they produced.
  loadRenderable(endpoint: PlanSubject): CachedPlan | null {
    if (!endpoint.ai_enabled || endpoint.ai_fields.length === 0) return null;
    if (!endpoint.ai_plan || !endpoint.ai_plan_hash) return null;

    if (endpoint.ai_plan_hash !== planHash(this.hashInput(endpoint))) return null;

    return this.renderableOf(endpoint.ai_plan_hash, endpoint.ai_plan);
  }

  // The blueprint a caller's own inputs were built for, which is a different question from
  // `loadRenderable`: the hash comes from the request rather than from the stored columns, so an
  // unsaved edit in the form is what decides. Judging it is the caller's job, as it is for a
  // blueprint that arrives in the request body.
  planForHash(endpoint: PlanSubject, hash: string): VariantPlanDTO | null {
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

  isPlanStale(endpoint: PlanSubject): boolean {
    return this.loadPlan(endpoint) === null;
  }

  // Goes through `loadPlan` deliberately: a blueprint whose hash no longer matches does not
  // describe this body any more, so neither does its verdict, and the honest answer while a new
  // one is being built is "nothing known yet".
  planInfoOf(endpoint: PlanSubject) {
    const plan = this.loadPlan(endpoint);
    if (!plan) return undefined;

    return {
      unsupported_language: plan.unsupported_language,
      unapplied_hints: plan.unapplied_hints,
    };
  }

  private hashInput(endpoint: PlanSubject) {
    return {
      responseBody: endpoint.response_body,
      aiFields: endpoint.ai_fields,
      aiPrompt: endpoint.ai_prompt,
    };
  }

  // Whether a blueprint agrees with the body and the selection it would be applied to. A throw is
  // an answer too: a body that will not parse is one no blueprint fits.
  private fitsInputs(subject: PlanSubject, plan: VariantPlanDTO): boolean {
    try {
      const base: unknown = JSON.parse(subject.response_body);
      const { valueFields, arrayPaths } = splitSelection(base, subject.ai_fields);
      const covered = [...valueFields.map((field) => field.path), ...arrayPaths];
      return validatePlan(plan, base, covered).ok;
    } catch {
      return false;
    }
  }

  // The pair `adoptPlan` applies, without the write, so a route can ask whether a blueprint would
  // be taken before it decides anything. The hash says it was built for these inputs and
  // `validatePlan` says it is safe to run; neither answers for the other.
  canAdoptPlan(subject: PlanSubject, plan: VariantPlanDTO, hash: string): boolean {
    if (hash !== planHash(this.hashInput(subject))) return false;

    return this.fitsInputs(subject, plan);
  }

  // Normalized the way `planHash` normalizes them, so a reordered selection and a hint that
  // gained whitespace both read as unchanged.
  private sameSelection(subject: PlanSubject, origin: PlanOrigin): boolean {
    if ((origin.ai_prompt?.trim() || null) !== (subject.ai_prompt?.trim() || null)) return false;
    if (origin.ai_fields.length !== subject.ai_fields.length) return false;

    const before = [...origin.ai_fields].sort();
    const after = [...subject.ai_fields].sort();
    return before.every((path, index) => path === after[index]);
  }

  // The stored blueprint judged against the inputs the row now holds rather than against the hash
  // it was built under. An edit moves the hash whatever it touched, so a field nobody ticked or a
  // value retyped in place would otherwise throw away a blueprint that still describes the body.
  // `null` when there is none, it will not parse, or the edit really did break it.
  private carriableFrom(subject: PlanSubject, origin: PlanOrigin | null): VariantPlanDTO | null {
    if (!subject.ai_enabled || subject.ai_fields.length === 0) return null;
    if (!subject.ai_plan || !origin) return null;

    // Only the body may move. A blueprint varies the fields it was designed for and answers the
    // hint it was designed under, and it records neither, so `validatePlan` cannot see a change
    // to either: ticking a field passes it while nothing in the blueprint varies that field.
    if (!this.sameSelection(subject, origin)) return null;

    const plan = parsePlan(subject.ai_plan);
    if (!plan) return null;

    return this.fitsInputs(subject, plan) ? plan : null;
  }

  // Re-stores the stored blueprint under the hash of the inputs it survived, so the row stops
  // reading as stale. `false` means the edit needs a real design.
  async carryPlanForward(endpoint: PlanEndpoint, origin: PlanOrigin | null): Promise<boolean> {
    const plan = this.carriableFrom(endpoint, origin);
    if (!plan) return false;

    try {
      await this.storePlan(endpoint, plan);
      return true;
    } catch (error) {
      console.error("[ai] could not carry the blueprint forward", {
        endpoint_id: String(endpoint.id),
        reason: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }

  // Whether saving these inputs would have to reach a model, which is what the write routes ask
  // before letting a save through on a spent quota. False when nothing is being varied, when the
  // blueprint travelling with the request can be adopted, when the stored one still matches, and
  // when the stored one survives the edit even though the hash moved.
  wouldDesign(
    subject: PlanSubject,
    plan: VariantPlanDTO | null,
    hash: string | null,
    origin: PlanOrigin | null
  ): boolean {
    if (!subject.ai_enabled || subject.ai_fields.length === 0) return false;
    if (plan && hash && this.canAdoptPlan(subject, plan, hash)) return false;
    if (!this.isPlanStale(subject)) return false;

    return this.carriableFrom(subject, origin) === null;
  }

  // The third way to a stored blueprint and the only free one: the client hands back what a
  // preview designed. The hash says it was built for these inputs, `validatePlan` says it is safe
  // to run, and neither answer substitutes for the other. Never throws; `false` means design it.
  async adoptPlan(endpoint: PlanEndpoint, plan: VariantPlanDTO, hash: string): Promise<boolean> {
    if (!this.canAdoptPlan(endpoint, plan, hash)) return false;

    try {
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
