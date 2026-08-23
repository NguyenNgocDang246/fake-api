import { prisma } from "@/server/prisma/prisma_provider";
import { AppError } from "@/server/core/errors";
import {
  AI_POOL_LOW_WATER,
  AI_POOL_SIZE,
  AI_REFILL_LOCK_MS,
  AI_VARIANT_MAX_USES,
} from "@/server/services/endpoint/endpoint.constants";
import { ROLE_LIMITS } from "@/server/core/role_limits";
import { GetUserByIdDTO, UserSchema } from "@/models/user.model";
import userService from "@/server/services/user.service";
import { isAiConfigured } from "@/server/services/ai/ai_router.service";
import { generateVariants } from "@/server/services/endpoint/endpoint_variant_generator.service";

export interface VariantEndpoint {
  id: bigint;
  method: string;
  path: string;
  response_body: string;
  ai_enabled: boolean;
  ai_fields: string[];
  ai_prompt: string | null;
}

class EndpointVariantService {
  async pickVariant(endpoints_id: bigint) {
    try {
      return await prisma.endpoint_ai_variants.findFirst({
        where: { endpoints_id },
        orderBy: [{ used_count: "asc" }, { id: "asc" }],
        select: { id: true, response_body: true },
      });
    } catch (error) {
      throw error instanceof AppError ? error : new AppError();
    }
  }

  async markVariantUsed(id: bigint) {
    try {
      return await prisma.endpoint_ai_variants.update({
        where: { id },
        data: { used_count: { increment: 1 } },
      });
    } catch (error) {
      throw error instanceof AppError ? error : new AppError();
    }
  }

  async countUsableVariants(endpoints_id: bigint) {
    try {
      return await prisma.endpoint_ai_variants.count({
        where: { endpoints_id, used_count: { lt: AI_VARIANT_MAX_USES } },
      });
    } catch (error) {
      throw error instanceof AppError ? error : new AppError();
    }
  }

  // Drops the refill lock too: it doubles as the retry cooldown, and an edit is exactly the
  // signal that the inputs changed, so the cooldown must not survive one.
  async clearVariants(endpoints_id: bigint) {
    try {
      const deleted = await prisma.endpoint_ai_variants.deleteMany({ where: { endpoints_id } });
      await prisma.$executeRaw`
        UPDATE "endpoints" SET "ai_refill_started_at" = NULL WHERE "id" = ${endpoints_id}
      `;
      return deleted;
    } catch (error) {
      throw error instanceof AppError ? error : new AppError();
    }
  }

  async holdsRefillLock(endpoints_id: bigint, startedAt: Date) {
    try {
      const row = await prisma.endpoints.findUnique({
        where: { id: endpoints_id },
        select: { ai_refill_started_at: true },
      });
      return row?.ai_refill_started_at?.getTime() === startedAt.getTime();
    } catch (error) {
      throw error instanceof AppError ? error : new AppError();
    }
  }

  async needsRefill(endpoints_id: bigint) {
    try {
      return (await this.countUsableVariants(endpoints_id)) < AI_POOL_LOW_WATER;
    } catch (error) {
      throw error instanceof AppError ? error : new AppError();
    }
  }

  // Raw SQL, not `prisma.endpoints.update`: `updated_at` carries `@updatedAt`, so writing through
  // Prisma would reorder the `updated_at desc` tie-break in `getEndpointByDynamicPath`.
  async acquireRefillLock(endpoints_id: bigint) {
    try {
      const startedAt = new Date();
      const staleBefore = new Date(startedAt.getTime() - AI_REFILL_LOCK_MS);
      const updated = await prisma.$executeRaw`
        UPDATE "endpoints"
        SET "ai_refill_started_at" = ${startedAt}
        WHERE "id" = ${endpoints_id}
          AND ("ai_refill_started_at" IS NULL OR "ai_refill_started_at" < ${staleBefore})
      `;
      return updated > 0 ? startedAt : null;
    } catch (error) {
      throw error instanceof AppError ? error : new AppError();
    }
  }

  async releaseRefillLock(endpoints_id: bigint, startedAt: Date) {
    try {
      await prisma.$executeRaw`
        UPDATE "endpoints" SET "ai_refill_started_at" = NULL
        WHERE "id" = ${endpoints_id} AND "ai_refill_started_at" = ${startedAt}
      `;
    } catch (error) {
      throw error instanceof AppError ? error : new AppError();
    }
  }

  async prunePool(endpoints_id: bigint) {
    try {
      const surplus = await prisma.endpoint_ai_variants.findMany({
        where: { endpoints_id },
        orderBy: [{ used_count: "asc" }, { created_at: "desc" }],
        select: { id: true },
        skip: AI_POOL_SIZE,
      });
      if (surplus.length === 0) return 0;

      const { count } = await prisma.endpoint_ai_variants.deleteMany({
        where: { id: { in: surplus.map((row) => row.id) } },
      });
      return count;
    } catch (error) {
      throw error instanceof AppError ? error : new AppError();
    }
  }

  // A model call takes seconds, so an edit can land mid-generation and drop the lock: re-checking
  // ownership before the write stops variants built from a body that no longer exists.
  async generateAndStore({
    endpoint,
    count,
    startedAt,
  }: {
    endpoint: VariantEndpoint;
    count: number;
    startedAt?: Date;
  }) {
    try {
      const { bodies } = await generateVariants({
        method: endpoint.method,
        path: endpoint.path,
        responseBody: endpoint.response_body,
        aiFields: endpoint.ai_fields,
        aiPrompt: endpoint.ai_prompt,
        count,
      });
      if (bodies.length === 0) return 0;

      if (startedAt && !(await this.holdsRefillLock(endpoint.id, startedAt))) {
        console.warn("[ai] refill lost its lock mid-generation, discarding", {
          endpoint_id: String(endpoint.id),
          generated: bodies.length,
        });
        return 0;
      }

      const { count: created } = await prisma.endpoint_ai_variants.createMany({
        data: bodies.map((response_body) => ({ endpoints_id: endpoint.id, response_body })),
      });
      await this.prunePool(endpoint.id);
      return created;
    } catch (error) {
      throw error instanceof AppError ? error : new AppError();
    }
  }

  // Never throws, and the lock is released deliberately rather than in a `finally`: a refill
  // that produced nothing must leave it set, since it doubles as the retry cooldown.
  async refillIfNeeded(endpoint: VariantEndpoint) {
    if (!endpoint.ai_enabled || endpoint.ai_fields.length === 0) return 0;
    if (!isAiConfigured()) return 0;

    let startedAt: Date | null = null;

    try {
      if (!(await this.needsRefill(endpoint.id))) return 0;

      startedAt = await this.acquireRefillLock(endpoint.id);
      if (!startedAt) return 0;

      const usable = await this.countUsableVariants(endpoint.id);
      const missing = Math.max(AI_POOL_SIZE - usable, 0);
      if (missing === 0) {
        await this.releaseRefillLock(endpoint.id, startedAt);
        return 0;
      }

      if (!(await this.canRefill(endpoint.id))) return 0;

      const created = await this.generateAndStore({ endpoint, count: missing, startedAt });
      if (created > 0) {
        await this.releaseRefillLock(endpoint.id, startedAt);
        return created;
      }

      console.warn("[ai] refill produced no variant", {
        endpoint_id: String(endpoint.id),
        requested: missing,
      });
      return 0;
    } catch (error) {
      console.error("[ai] refill failed", {
        endpoint_id: String(endpoint.id),
        reason: error instanceof Error ? error.message : String(error),
        cause: error instanceof AppError ? error.cause : undefined,
      });
      return 0;
    }
  }

  async countVariantsCreatedToday({ public_id }: GetUserByIdDTO) {
    try {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);

      return await prisma.endpoint_ai_variants.count({
        where: {
          created_at: { gte: startOfDay },
          endpoints: {
            endpoint_groups: { projects: { users: { public_id } } },
          },
        },
      });
    } catch (error) {
      throw error instanceof AppError ? error : new AppError();
    }
  }

  async canGenerate({ public_id }: GetUserByIdDTO) {
    try {
      const user = await userService.getUserById({ public_id });
      if (!user) return false;

      const role = UserSchema.shape.role.parse(user.role);
      const limit = ROLE_LIMITS[role].maxAiVariantsPerDay;
      if (limit === 0) return false;

      return (await this.countVariantsCreatedToday({ public_id })) < limit;
    } catch (error) {
      throw error instanceof AppError ? error : new AppError();
    }
  }

  async canRefill(endpoints_id: bigint) {
    try {
      const owner = await prisma.endpoints.findUnique({
        where: { id: endpoints_id },
        select: {
          endpoint_groups: {
            select: { projects: { select: { users: { select: { public_id: true } } } } },
          },
        },
      });

      const public_id = owner?.endpoint_groups.projects.users.public_id;
      if (!public_id) return false;

      return await this.canGenerate({ public_id });
    } catch (error) {
      throw error instanceof AppError ? error : new AppError();
    }
  }
}

const endpointVariantService = new EndpointVariantService();
export default endpointVariantService;
