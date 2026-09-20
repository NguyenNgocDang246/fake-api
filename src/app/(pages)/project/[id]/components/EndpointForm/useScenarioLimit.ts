"use client";

import { useQuery } from "@tanstack/react-query";
import { QUERY_KEY, STALETIME } from "@/app/components/Wrapper/QueryClient/Constants";
import { UserUsageDTO } from "@/models/user.model";
import { ApiSuccessResponse } from "@/models/api_response.model";
import api from "@/app/libs/helpers/api_call.client";
import { API_ROUTES } from "@/app/libs/routes";
import { ROLE_LIMITS } from "@/server/core/role_limits";

// The smallest cap any signed-in role carries, which is what this stands on until the answer
// arrives: the column is there from the first frame rather than landing on a form already drawn
// without it, and a page it offers is one every signed-in role may hold. A caller whose role has
// no scenarios at all says so with `maxScenarios`, the way the home page's trial box does.
const ASSUMED_LIMIT = ROLE_LIMITS.USER.maxScenariosPerEndpoint;

// How many scenarios this account may hold on one endpoint.
export function useScenarioLimit(): number {
  const usage = useQuery<UserUsageDTO>({
    queryKey: [QUERY_KEY.USER.USAGE],
    queryFn: async () => {
      const res = (await api.get(API_ROUTES.USER.USAGE)).data as ApiSuccessResponse;
      return res.data as UserUsageDTO;
    },
    staleTime: STALETIME,
  });

  return usage.data?.limits.max_scenarios_per_endpoint ?? ASSUMED_LIMIT;
}
