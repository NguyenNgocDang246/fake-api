import { UserRole } from "@/models/user.model";

export const ROLE_LIMITS: Record<
  UserRole,
  {
    maxProjects: number;
    maxGroupsPerProject: number;
    maxEndpointsPerGroup: number;
    /** Số biến thể AI được sinh trong một ngày. 0 nghĩa là không dùng được tính năng AI. */
    maxAiVariantsPerDay: number;
  }
> = {
  GUEST: { maxProjects: 1, maxGroupsPerProject: 1, maxEndpointsPerGroup: 5, maxAiVariantsPerDay: 0 },
  USER: {
    maxProjects: 5,
    maxGroupsPerProject: 10,
    maxEndpointsPerGroup: 10,
    maxAiVariantsPerDay: 50,
  },
  USER_VIP: {
    maxProjects: 10,
    maxGroupsPerProject: 20,
    maxEndpointsPerGroup: 20,
    maxAiVariantsPerDay: 200,
  },
};
