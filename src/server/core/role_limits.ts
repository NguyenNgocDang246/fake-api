import { UserRole } from "@/models/user.model";

export const ROLE_LIMITS: Record<
  UserRole,
  {
    // For GUEST this counts trial sandboxes rather than one person's projects, since every
    // visitor trying the product shares that account. It is still a real ceiling: once it is
    // reached, and after expired sandboxes have been swept, new visitors are turned away.
    maxProjects: number;
    maxGroupsPerProject: number;
    maxEndpointsPerGroup: number;
    // Blueprint designs per day, `0` meaning the role has no AI at all. One blueprint serves
    // unlimited responses, so this counts redesigns of an endpoint rather than responses.
    maxAiPlansPerDay: number;
  }
> = {
  GUEST: {
    maxProjects: 1000,
    maxGroupsPerProject: 1,
    maxEndpointsPerGroup: 5,
    maxAiPlansPerDay: 0,
  },
  USER: {
    maxProjects: 5,
    maxGroupsPerProject: 10,
    maxEndpointsPerGroup: 10,
    maxAiPlansPerDay: 5,
  },
  USER_VIP: {
    maxProjects: 10,
    maxGroupsPerProject: 20,
    maxEndpointsPerGroup: 20,
    maxAiPlansPerDay: 120,
  },
};
