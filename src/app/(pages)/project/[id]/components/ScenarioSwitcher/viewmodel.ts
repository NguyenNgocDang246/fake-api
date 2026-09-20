import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { QUERY_KEY } from "@/app/components/Wrapper/QueryClient/Constants";
import { endpointByIdQuery } from "@/app/(pages)/project/[id]/components/UpdateEndpointForm/endpointQuery";
import api from "@/app/libs/helpers/api_call.client";
import buildUrl from "@/app/libs/helpers/url_builder";
import Notify from "@/app/components/Notify";
import { EndpointRoutes } from "@/app/libs/routes";
import { ApiErrorResponse, ApiSuccessResponse } from "@/models/api_response.model";
import { EndpointInfoDTO } from "@/models/endpoint/endpoint.model";

export interface ScenarioSwitcherArgs {
  projectId: string;
  endpointGroupId: string;
  endpointId: string;
  endpointRoutes: EndpointRoutes;
}

export const useScenarioSwitcherViewmodel = ({
  projectId,
  endpointGroupId,
  endpointId,
  endpointRoutes,
}: ScenarioSwitcherArgs) => {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  // The list ships the serving scenario alone, so the others are only asked for once somebody
  // opens the menu. It is the key the modal reads and the row warms on hover, so an open that
  // follows a settled pointer is already answered.
  const scenariosState = useQuery<EndpointInfoDTO, ApiErrorResponse>({
    ...endpointByIdQuery({ projectId, endpointGroupId, endpointId, endpointRoutes }),
    enabled: open,
  });

  const activateMutation = useMutation<EndpointInfoDTO, ApiErrorResponse, string>({
    mutationFn: async (scenarioId) => {
      const res = (
        await api.post(
          buildUrl(endpointRoutes.SCENARIO_ACTIVATE, {
            projectId,
            endpointGroupId,
            endpointId,
            scenarioId,
          })
        )
      ).data as ApiSuccessResponse;
      return res.data as EndpointInfoDTO;
    },
    // The route answers with the whole endpoint, so both the row and the modal are written from
    // it rather than refetching a list that already knows what changed.
    onSuccess: (endpoint) => {
      queryClient.setQueryData([QUERY_KEY.ENDPOINT.ONE, endpointId], endpoint);
      queryClient.setQueryData<EndpointInfoDTO[]>(
        [QUERY_KEY.ENDPOINT.ALL, projectId, endpointGroupId],
        (endpoints) =>
          endpoints?.map((row) => (row.public_id === endpointId ? endpoint : row))
      );
      Notify.success("Switched scenario");
    },
    onError: (error) => {
      Notify.error(error.message);
    },
  });

  return {
    open,
    setOpen,
    scenarios: scenariosState.data?.scenarios ?? [],
    isError: scenariosState.isError,
    isSwitching: activateMutation.isPending,
    activate: (scenarioId: string) => activateMutation.mutate(scenarioId),
  };
};
