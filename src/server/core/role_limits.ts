import { UserRole } from "@/models/user.model";

export const ROLE_LIMITS: Record<
  UserRole,
  { maxProjects: number; maxGroupsPerProject: number; maxEndpointsPerGroup: number }
> = {
  GUEST: { maxProjects: 1, maxGroupsPerProject: 1, maxEndpointsPerGroup: 5 },
  USER: { maxProjects: 5, maxGroupsPerProject: 10, maxEndpointsPerGroup: 10 },
  USER_VIP: { maxProjects: 10, maxGroupsPerProject: 20, maxEndpointsPerGroup: 20 },
};
