import { prisma } from "@/server/prisma/prisma_provider";
import { guardService } from "@/server/core/errors";
import { ROLE_LIMITS } from "@/server/core/role_limits";
import { GetUserByIdDTO, UserSchema } from "@/models/user.model";
import userService from "@/server/services/user.service";

// Sits beside `ai/` rather than inside it: that directory may not import anything from the
// domain, and this one knows about users and their roles.

export type AiUsageKind = "plan";

function startOfToday(): Date {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  return start;
}

class AiUsageService {
  // One row per model call. Append only on purpose: the quota used to count generated variant
  // rows, so a preview never touched it and deleting an endpoint refunded the calls it spent.
  async record(users_id: bigint, kind: AiUsageKind = "plan") {
    return guardService(() => prisma.ai_usage_logs.create({ data: { users_id, kind } }));
  }

  // Whether the role may design at all, which is a different question from whether it has a
  // call left today. A caller about to make a model call still has to `trySpend`.
  async isAiAllowed({ public_id }: GetUserByIdDTO) {
    return guardService(async () => (await this.limitFor({ public_id })) > 0);
  }

  private async limitFor({ public_id }: GetUserByIdDTO): Promise<number> {
    const user = await userService.getUserById({ public_id });
    if (!user) return 0;

    const role = UserSchema.shape.role.parse(user.role);
    return ROLE_LIMITS[role].maxAiPlansPerDay;
  }

  // What the AI card shows. Not a claim on the quota: `trySpend` is still the only thing that
  // decides, so no lock and no transaction here, and the number can be stale by the time the
  // user presses Redesign.
  async quotaFor({ public_id }: GetUserByIdDTO): Promise<{ limit: number; spent: number }> {
    return guardService(async () => {
      const user = await userService.getUserById({ public_id });
      if (!user) return { limit: 0, spent: 0 };

      const role = UserSchema.shape.role.parse(user.role);
      const spent = await prisma.ai_usage_logs.count({
        where: { users_id: user.id, created_at: { gte: startOfToday() } },
      });

      return { limit: ROLE_LIMITS[role].maxAiPlansPerDay, spent };
    });
  }

  // Claims one call against today's quota, handing back the user when it was granted. Counting
  // and recording sit in one transaction behind a row lock on the user, because checking and
  // then inserting as two statements let concurrent requests all pass the same check.
  async trySpend(
    { public_id }: GetUserByIdDTO,
    kind: AiUsageKind = "plan"
  ): Promise<{ id: bigint; public_id: string } | null> {
    return guardService(() =>
      prisma.$transaction(async (tx) => {
        const locked = await tx.$queryRaw<{ id: bigint; role: string }[]>`
          SELECT "id", "role" FROM "users" WHERE "public_id" = ${public_id} FOR UPDATE
        `;
        const user = locked[0];
        if (!user) return null;

        const role = UserSchema.shape.role.parse(user.role);
        const limit = ROLE_LIMITS[role].maxAiPlansPerDay;
        if (limit === 0) return null;

        const spent = await tx.ai_usage_logs.count({
          where: { users_id: user.id, created_at: { gte: startOfToday() } },
        });
        if (spent >= limit) return null;

        await tx.ai_usage_logs.create({ data: { users_id: user.id, kind } });
        return { id: user.id, public_id };
      })
    );
  }
}

const aiUsageService = new AiUsageService();
export default aiUsageService;
