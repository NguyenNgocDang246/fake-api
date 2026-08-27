import { UserRole } from "@/models/user.model";

export const ROLE_LIMITS: Record<
  UserRole,
  {
    maxProjects: number;
    maxGroupsPerProject: number;
    maxEndpointsPerGroup: number;
    // Blueprint designs per day, `0` meaning the role has no AI at all. One blueprint serves
    // unlimited responses, so this counts redesigns of an endpoint rather than responses.
    maxAiPlansPerDay: number;
  }
> = {
  GUEST: { maxProjects: 1, maxGroupsPerProject: 1, maxEndpointsPerGroup: 5, maxAiPlansPerDay: 0 },
  USER: {
    maxProjects: 5,
    maxGroupsPerProject: 10,
    maxEndpointsPerGroup: 10,
    maxAiPlansPerDay: 30,
  },
  USER_VIP: {
    maxProjects: 10,
    maxGroupsPerProject: 20,
    maxEndpointsPerGroup: 20,
    maxAiPlansPerDay: 120,
  },
};
