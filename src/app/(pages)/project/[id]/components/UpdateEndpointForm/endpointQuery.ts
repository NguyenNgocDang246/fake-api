import { QUERY_KEY, STALETIME } from "@/app/components/Wrapper/QueryClient/Constants";
import api from "@/app/libs/helpers/api_call.client";
import buildUrl from "@/app/libs/helpers/url_builder";
import { EndpointRoutes } from "@/app/libs/routes";
import { ApiSuccessResponse } from "@/models/api_response.model";
import { EndpointInfoDTO } from "@/models/endpoint/endpoint.model";

interface EndpointByIdArgs {
  projectId: string;
  endpointGroupId: string;
  endpointId: string;
  endpointRoutes: EndpointRoutes;
}

// One definition for the modal that awaits this answer and the row that warms it ahead of time.
// Two copies would be two keys, and a prefetch under a key nobody reads is only a slower load.
export function endpointByIdQuery({
  projectId,
  endpointGroupId,
  endpointId,
  endpointRoutes,
}: EndpointByIdArgs) {
  return {
    queryKey: [QUERY_KEY.ENDPOINT.ONE, endpointId],
    queryFn: async (): Promise<EndpointInfoDTO> => {
      const res = (
        await api.get(
          buildUrl(endpointRoutes.GET_BY_ID, { projectId, endpointGroupId, endpointId })
        )
      ).data as ApiSuccessResponse;
      return res.data as EndpointInfoDTO;
    },
    staleTime: STALETIME,
  };
}
