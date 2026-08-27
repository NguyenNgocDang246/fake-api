import { prisma } from "@/server/prisma/prisma_provider";
import { guardService } from "@/server/core/errors";
import { AI_PLAN_LOCK_MS } from "@/server/services/endpoint/endpoint.constants";

// `endpoints.ai_plan_started_at` is both the build lock and the retry cooldown, and the release
// carries its own timestamp in the `WHERE` so a slow build cannot clear its successor's. Raw SQL
// throughout, or Prisma's `@updatedAt` would reorder the list the user is looking at.

export function acquirePlanLock(endpoints_id: bigint) {
  return guardService(async () => {
    const startedAt = new Date();
    const staleBefore = new Date(startedAt.getTime() - AI_PLAN_LOCK_MS);
    const updated = await prisma.$executeRaw`
      UPDATE "endpoints"
      SET "ai_plan_started_at" = ${startedAt}
      WHERE "id" = ${endpoints_id}
        AND ("ai_plan_started_at" IS NULL OR "ai_plan_started_at" < ${staleBefore})
    `;
    return updated > 0 ? startedAt : null;
  });
}

export function releasePlanLock(endpoints_id: bigint, startedAt: Date) {
  return guardService(async () => {
    await prisma.$executeRaw`
      UPDATE "endpoints" SET "ai_plan_started_at" = NULL
      WHERE "id" = ${endpoints_id} AND "ai_plan_started_at" = ${startedAt}
    `;
  });
}

export function holdsPlanLock(endpoints_id: bigint, startedAt: Date) {
  return guardService(async () => {
    const row = await prisma.endpoints.findUnique({
      where: { id: endpoints_id },
      select: { ai_plan_started_at: true },
    });
    return row?.ai_plan_started_at?.getTime() === startedAt.getTime();
  });
}

// Drops the blueprint and the lock, so an edit ends the retry cooldown too.
export function clearPlan(endpoints_id: bigint) {
  return guardService(async () => {
    await prisma.$executeRaw`
      UPDATE "endpoints"
      SET "ai_plan" = NULL, "ai_plan_hash" = NULL, "ai_plan_started_at" = NULL
      WHERE "id" = ${endpoints_id}
    `;
  });
}

// One query, not two: the quota check needs the `public_id` and the write needs the `id`.
export function ownerOf(endpoints_id: bigint): Promise<{ id: bigint; public_id: string } | null> {
  return guardService(async () => {
    const owner = await prisma.endpoints.findUnique({
      where: { id: endpoints_id },
      select: {
        endpoint_groups: {
          select: { projects: { select: { users: { select: { id: true, public_id: true } } } } },
        },
      },
    });
    return owner?.endpoint_groups.projects.users ?? null;
  });
}
