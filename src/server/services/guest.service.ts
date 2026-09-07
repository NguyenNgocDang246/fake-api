import { randomUUID } from "crypto";
import { prisma } from "@/server/prisma/prisma_provider";
import { AppError, guardService } from "@/server/core/errors";
import { STATUS_CODE } from "@/server/core/constants";
import { createWithUniquePublicId } from "@/server/core/prisma_retry";
import { hashPassword } from "@/server/services/auth/hash.service";
import projectService from "@/server/services/project.service";
import endpointGroupService from "@/server/services/endpoint_group.service";
import {
  GUEST_EMAIL,
  GUEST_MESSAGES,
  GUEST_USER_NAME,
  GUEST_PROJECT_LIFETIME_IN_SECONDS,
} from "@/server/services/guest.constants";

export interface GuestSandbox {
  project_id: string;
  endpoint_group_id: string;
}

interface GuestUser {
  id: bigint;
  public_id: string;
}

// Every visitor trying the product shares this one account, and each of them gets their own
// project under it. Nothing here mints a token: a visitor has no session at all, and the guest
// identity is attached by `middlewares/guest.middleware.ts` instead.
class GuestService {
  private cached: GuestUser | null = null;

  async getGuestUser(): Promise<GuestUser> {
    return guardService(async () => {
      if (this.cached) return this.cached;

      const existing = await prisma.users.findUnique({ where: { email: GUEST_EMAIL } });
      if (existing) {
        this.cached = { id: existing.id, public_id: existing.public_id };
        return this.cached;
      }

      const password = await hashPassword(randomUUID());
      try {
        const created = await createWithUniquePublicId((public_id) =>
          prisma.users.create({
            data: {
              public_id,
              email: GUEST_EMAIL,
              name: GUEST_USER_NAME,
              password,
              role: "GUEST",
              is_verified: true,
            },
          })
        );
        this.cached = { id: created.id, public_id: created.public_id };
        return this.cached;
      } catch (error) {
        // Two first-ever requests can race here, and the loser lost on `email`, not on
        // `public_id`, so `createWithUniquePublicId` rethrew instead of retrying.
        const winner = await prisma.users.findUnique({ where: { email: GUEST_EMAIL } });
        if (!winner) throw error;
        this.cached = { id: winner.id, public_id: winner.public_id };
        return this.cached;
      }
    });
  }

  async deleteExpiredSandboxes(cutoff: Date) {
    return guardService(() =>
      prisma.projects.deleteMany({
        where: { users: { email: GUEST_EMAIL }, created_at: { lt: cutoff } },
      })
    );
  }

  async createSandbox(): Promise<GuestSandbox> {
    return guardService(async () => {
      const guest = await this.getGuestUser();

      // Sweep first, then check: most of what fills the ceiling is sandboxes nobody has come
      // back to, so counting before the sweep would turn visitors away over expired rows.
      await this.deleteExpiredSandboxes(
        new Date(Date.now() - GUEST_PROJECT_LIFETIME_IN_SECONDS * 1000)
      );
      if (!(await projectService.canCreateProject(guest.public_id))) {
        throw new AppError({
          message: GUEST_MESSAGES.TRIAL_FULL,
          statusCode: STATUS_CODE.SERVICE_UNAVAILABLE,
        });
      }

      const project = await projectService.createProject({
        user_public_id: guest.public_id,
        name: String(Math.floor(Math.random() * 1_000_000_000)),
        description: null,
      });

      // `createProject` already made the group named "default", so read it back rather than
      // adding a second one: GUEST is allowed exactly one group per project.
      const groups = await endpointGroupService.getAllEndpointGroups({
        public_id: project.public_id,
      });
      const group = groups[0];
      if (!group) throw new Error("guest sandbox has no endpoint group");

      return { project_id: project.public_id, endpoint_group_id: group.public_id };
    });
  }
}

const guestService = new GuestService();
export default guestService;
