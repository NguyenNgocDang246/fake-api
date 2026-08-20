import { prisma } from "@/server/prisma/prisma_provider";
import { AppError } from "@/server/core/errors";
import {
  AI_POOL_LOW_WATER,
  AI_POOL_SIZE,
  AI_REFILL_LOCK_MS,
  AI_VARIANT_MAX_USES,
} from "@/server/core/constants";
import { ROLE_LIMITS } from "@/server/core/role_limits";
import { GetUserByIdDTO, UserSchema } from "@/models/user.model";
import userService from "@/server/services/user.service";
import { generateVariants } from "@/server/services/endpoint_variant_generator.service";

/**
 * Lifecycle of one endpoint's AI variant pool.
 *
 * A request to the fake API only reads from the pool (a single SELECT); bumping the use
 * counter and refilling both run after the response has been sent. Turning AI on therefore
 * costs the endpoint no extra latency.
 */

/** The minimum an endpoint has to expose for the pool. Not tied to Prisma's full row type. */
export interface VariantEndpoint {
  id: bigint;
  method: string;
  path: string;
  response_body: string;
  ai_fields: string[];
  ai_prompt: string | null;
}

class EndpointVariantService {
  /**
   * Take the next variant from the pool. Returns `null` on an empty pool, and the caller
   * falls back to the base body.
   *
   * Ordered rather than random: the order the model produced these variants in is already
   * arbitrary, so walking from the least used one is enough variety. In exchange this is a
   * single-row read instead of loading the whole pool to pick from it.
   *
   * The counter is not bumped here, so serving a request stays one single read.
   */
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

  async countVariants(endpoints_id: bigint) {
    try {
      return await prisma.endpoint_ai_variants.count({ where: { endpoints_id } });
    } catch (error) {
      throw error instanceof AppError ? error : new AppError();
    }
  }

  /**
   * Variants that still have uses left. This, not the raw row count, is what tells a refill how
   * much to generate: a full pool of worn out rows is a pool that needs replacing, not one that
   * is already stocked.
   */
  async countUsableVariants(endpoints_id: bigint) {
    try {
      return await prisma.endpoint_ai_variants.count({
        where: { endpoints_id, used_count: { lt: AI_VARIANT_MAX_USES } },
      });
    } catch (error) {
      throw error instanceof AppError ? error : new AppError();
    }
  }

  async listVariants(endpoints_id: bigint) {
    try {
      return await prisma.endpoint_ai_variants.findMany({
        where: { endpoints_id },
        orderBy: { created_at: "desc" },
      });
    } catch (error) {
      throw error instanceof AppError ? error : new AppError();
    }
  }

  /** Call when the body, the field list or the hint changes: the old pool is stale. */
  async clearVariants(endpoints_id: bigint) {
    try {
      return await prisma.endpoint_ai_variants.deleteMany({ where: { endpoints_id } });
    } catch (error) {
      throw error instanceof AppError ? error : new AppError();
    }
  }

  /**
   * A pool needs topping up when it runs low, or when every variant has been served so
   * many times that a client polling the endpoint keeps seeing the same handful of bodies.
   */
  async needsRefill(endpoints_id: bigint) {
    try {
      const count = await this.countVariants(endpoints_id);
      if (count < AI_POOL_LOW_WATER) return true;

      const leastUsed = await prisma.endpoint_ai_variants.findFirst({
        where: { endpoints_id },
        orderBy: { used_count: "asc" },
        select: { used_count: true },
      });
      return (leastUsed?.used_count ?? 0) >= AI_VARIANT_MAX_USES;
    } catch (error) {
      throw error instanceof AppError ? error : new AppError();
    }
  }

  /**
   * Soft lock so two processes do not refill the same endpoint at once, which would mean
   * paying for the same model call twice.
   *
   * Raw SQL rather than `prisma.endpoints.update` because `updated_at` carries `@updatedAt`:
   * writing through Prisma would push the endpoint to the front of the `updated_at desc`
   * ordering that `getEndpointByDynamicPath` relies on, changing how ties between path
   * templates are broken.
   */
  async acquireRefillLock(endpoints_id: bigint) {
    try {
      const staleBefore = new Date(Date.now() - AI_REFILL_LOCK_MS);
      const updated = await prisma.$executeRaw`
        UPDATE "endpoints"
        SET "ai_refill_started_at" = NOW()
        WHERE "id" = ${endpoints_id}
          AND ("ai_refill_started_at" IS NULL OR "ai_refill_started_at" < ${staleBefore})
      `;
      return updated > 0;
    } catch (error) {
      throw error instanceof AppError ? error : new AppError();
    }
  }

  async releaseRefillLock(endpoints_id: bigint) {
    try {
      await prisma.$executeRaw`
        UPDATE "endpoints" SET "ai_refill_started_at" = NULL WHERE "id" = ${endpoints_id}
      `;
    } catch (error) {
      throw error instanceof AppError ? error : new AppError();
    }
  }

  /**
   * Keep the pool at `AI_POOL_SIZE` by dropping the most used variants.
   *
   * Ordered least used first, so `skip: AI_POOL_SIZE` leaves the freshest `AI_POOL_SIZE` rows
   * alone and returns the worn tail. This is what retires a batch: `refillIfNeeded` generates
   * the replacements first and prunes after, so the pool never dips while the model is running.
   * Ties on `used_count` keep the newer row, since the older one has had its turn.
   */
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

  /** Generate new variants and store them. Returns how many rows were added. */
  async generateAndStore({ endpoint, count }: { endpoint: VariantEndpoint; count: number }) {
    const { bodies } = await generateVariants({
      method: endpoint.method,
      path: endpoint.path,
      responseBody: endpoint.response_body,
      aiFields: endpoint.ai_fields,
      aiPrompt: endpoint.ai_prompt,
      count,
    });
    if (bodies.length === 0) return 0;

    try {
      const { count: created } = await prisma.endpoint_ai_variants.createMany({
        data: bodies.map((response_body) => ({ endpoints_id: endpoint.id, response_body })),
      });
      await this.prunePool(endpoint.id);
      return created;
    } catch (error) {
      throw error instanceof AppError ? error : new AppError();
    }
  }

  /**
   * Refill in the background. Never throws: this runs after the response has already been
   * sent, and one failed refill just means the next request serves the base body.
   */
  async refillIfNeeded(endpoint: VariantEndpoint) {
    try {
      if (endpoint.ai_fields.length === 0) return 0;
      if (!(await this.needsRefill(endpoint.id))) return 0;
      if (!(await this.acquireRefillLock(endpoint.id))) return 0;

      try {
        const usable = await this.countUsableVariants(endpoint.id);
        const missing = Math.max(AI_POOL_SIZE - usable, 0);
        if (missing === 0) return 0;

        // Checked here rather than before the lock: this is the last step before spending
        // tokens, and the quota only matters once a refill is actually going to happen.
        if (!(await this.canRefill(endpoint.id))) return 0;

        return await this.generateAndStore({ endpoint, count: missing });
      } finally {
        await this.releaseRefillLock(endpoint.id);
      }
    } catch (error) {
      // `error` carries the user-facing message; `cause` is where the provider's own
      // explanation lives, so log both or the log says nothing useful.
      console.error("[ai] refill failed", {
        endpoint_id: String(endpoint.id),
        reason: error instanceof Error ? error.message : String(error),
        cause: error instanceof AppError ? error.cause : undefined,
      });
      return 0;
    }
  }

  /** Variants this user generated since midnight, compared against the per-role quota. */
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
    const user = await userService.getUserById({ public_id });
    if (!user) return false;

    const role = UserSchema.shape.role.parse(user.role);
    const limit = ROLE_LIMITS[role].maxAiVariantsPerDay;
    if (limit === 0) return false;

    return (await this.countVariantsCreatedToday({ public_id })) < limit;
  }

  /**
   * The same daily quota as `canGenerate`, for the background refill, which has an endpoint id
   * rather than a signed-in user. Without it a hammered endpoint would refill forever: the two
   * routes a user clicks are quota checked, but nothing was guarding the automatic path.
   */
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
