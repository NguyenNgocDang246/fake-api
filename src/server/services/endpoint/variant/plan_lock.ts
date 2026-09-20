import { prisma } from "@/server/prisma/prisma_provider";
import { guardService } from "@/server/core/errors";
import { AI_PLAN_LOCK_MS } from "@/server/services/endpoint/endpoint.constants";

// `endpoint_scenarios.ai_plan_started_at` is both the build lock and the retry cooldown, and the
// release carries its own timestamp in the `WHERE` so a slow build cannot clear its successor's.
//
// The lock is per scenario, not per endpoint: a blueprint belongs to the body it was built for,
// so two scenarios of one endpoint design independently.

// `updateMany` rather than `update`, on a row addressed by its primary key, because the extra
// condition is the lock itself: the count says whether this caller was the one that took it.
export function acquirePlanLock(scenarios_id: bigint) {
  return guardService(async () => {
    const startedAt = new Date();
    const staleBefore = new Date(startedAt.getTime() - AI_PLAN_LOCK_MS);
    const { count } = await prisma.endpoint_scenarios.updateMany({
      where: {
        id: scenarios_id,
        OR: [{ ai_plan_started_at: null }, { ai_plan_started_at: { lt: staleBefore } }],
      },
      data: { ai_plan_started_at: startedAt },
    });
    return count > 0 ? startedAt : null;
  });
}

export function releasePlanLock(scenarios_id: bigint, startedAt: Date) {
  return guardService(async () => {
    await prisma.endpoint_scenarios.updateMany({
      where: { id: scenarios_id, ai_plan_started_at: startedAt },
      data: { ai_plan_started_at: null },
    });
  });
}

export function holdsPlanLock(scenarios_id: bigint, startedAt: Date) {
  return guardService(async () => {
    const row = await prisma.endpoint_scenarios.findUnique({
      where: { id: scenarios_id },
      select: { ai_plan_started_at: true },
    });
    return row?.ai_plan_started_at?.getTime() === startedAt.getTime();
  });
}

// Drops the blueprint and the lock, so an edit ends the retry cooldown too.
export function clearPlan(scenarios_id: bigint) {
  return guardService(async () => {
    await prisma.endpoint_scenarios.update({
      where: { id: scenarios_id },
      data: { ai_plan: null, ai_plan_hash: null, ai_plan_started_at: null },
    });
  });
}

// One query, not two: the quota check needs the `public_id` and the write needs the `id`. It
// walks one level further than it used to, because the blueprint hangs off a scenario now.
export function ownerOf(scenarios_id: bigint): Promise<{ id: bigint; public_id: string } | null> {
  return guardService(async () => {
    const owner = await prisma.endpoint_scenarios.findUnique({
      where: { id: scenarios_id },
      select: {
        endpoints: {
          select: {
            endpoint_groups: {
              select: { projects: { select: { users: { select: { id: true, public_id: true } } } } },
            },
          },
        },
      },
    });
    return owner?.endpoints.endpoint_groups.projects.users ?? null;
  });
}
