import { VariantPlanDTO, VariantPlanSchema } from "@/models/endpoint_plan/endpoint_plan.model";

// Parsing a stored blueprint is pure work on a value that only changes when its hash changes,
// and the serving path did all of it per request. Keyed by `ai_plan_hash`.

export interface CachedPlan {
  plan: VariantPlanDTO;
  uniqueCatalogs: Set<string>;
  // The exact `ai_plan` this was parsed from. The hash covers the inputs, not the blueprint, so
  // two blueprints can share one hash; comparing the source is what stops a stale hit.
  source: string;
}

// Small on purpose: an entry is at most MAX_PLAN_BYTES, and this only has to cover the
// endpoints a single instance is actively serving.
const MAX_ENTRIES = 200;

const entries = new Map<string, CachedPlan>();

export function resetPlanCache(): void {
  entries.clear();
}

export function getCachedPlan(hash: string, source: string): CachedPlan | undefined {
  const hit = entries.get(hash);
  if (!hit || hit.source !== source) return undefined;

  // Re-inserting moves the key to the end, which is what makes the eviction below least
  // recently used rather than merely oldest.
  entries.delete(hash);
  entries.set(hash, hit);
  return hit;
}

export function setCachedPlan(hash: string, value: CachedPlan): void {
  entries.delete(hash);
  entries.set(hash, value);

  while (entries.size > MAX_ENTRIES) {
    const oldest = entries.keys().next();
    if (oldest.done) break;
    entries.delete(oldest.value);
  }
}

// Never throws: a blueprint that will not parse is treated as absent, which makes the caller
// serve the base body rather than fail a request the user did not ask to fail.
export function parsePlan(serialized: string): VariantPlanDTO | null {
  try {
    const parsed = VariantPlanSchema.safeParse(JSON.parse(serialized));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}
