import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import api from "@/app/libs/helpers/api_call";
import url_builder from "@/app/libs/helpers/url_builder";
import { API_ROUTES } from "@/app/libs/routes";
import { ApiSuccessResponse, ApiErrorResponse } from "@/models/api_response.model";
import { EndpointGroupInfoDTO } from "@/models/endpoint_group.model";
import { EndpointInfoDTO } from "@/models/endpoint.model";
import { ProjectInfoDTO } from "@/models/project.model";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { QUERY_KEY, STALETIME } from "@/app/components/Wrapper/QueryClient/Constants";
import Notify from "@/app/components/Notify";
import { useModal } from "@/app/components/Wrapper/Modal/ModalWrapper";

export function useEndpointGroupViewModel() {
  const pathname = usePathname();
  const [selectedGroupId, setSelectedGroupId] = useState<string>("");

  const pathnameSplit = pathname.split("/");
  const projectId = pathnameSplit[pathnameSplit.length - 1];

  const fetchProjectInfo = async (): Promise<ProjectInfoDTO> => {
    const res = (await api.get(url_builder(API_ROUTES.PROJECT.GET_BY_ID, { projectId })))
      .data as ApiSuccessResponse;
    return res.data as ProjectInfoDTO;
  };

  const projectInfoState = useQuery<ProjectInfoDTO, ApiErrorResponse>({
    queryKey: [QUERY_KEY.PROJECT.ONE, projectId],
    queryFn: fetchProjectInfo,
    staleTime: STALETIME,
  });

  const fetchEndpointGroups = async (): Promise<EndpointGroupInfoDTO[]> => {
    const res = (await api.get(url_builder(API_ROUTES.ENDPOINT_GROUP.GET_ALL, { projectId })))
      .data as ApiSuccessResponse;
    return (res.data as EndpointGroupInfoDTO[]) || [];
  };

  const endpointGroupsState = useQuery<EndpointGroupInfoDTO[], ApiErrorResponse>({
    queryKey: [QUERY_KEY.ENDPOINT_GROUP.ALL, projectId],
    queryFn: fetchEndpointGroups,
    staleTime: STALETIME,
  });

  useEffect(() => {
    if (
      (!selectedGroupId && endpointGroupsState.data && endpointGroupsState.data.length > 0) ||
      (selectedGroupId &&
        endpointGroupsState.data &&
        endpointGroupsState.data.length > 0 &&
        !endpointGroupsState.data.find((group) => group.public_id === selectedGroupId))
    ) {
      setSelectedGroupId(endpointGroupsState.data[0].public_id);
    }
  }, [endpointGroupsState.data, selectedGroupId]);

  const fetchEndpoints = async (): Promise<EndpointInfoDTO[]> => {
    if (!selectedGroupId) return [];
    const res = (
      await api.get(
        url_builder(API_ROUTES.ENDPOINT.GET_ALL, {
          projectId,
          endpointGroupId: selectedGroupId,
        })
      )
    ).data as ApiSuccessResponse;
    return (res.data as EndpointInfoDTO[]) || [];
  };

  const endpointsState = useQuery<EndpointInfoDTO[], ApiErrorResponse>({
    queryKey: [QUERY_KEY.ENDPOINT.ALL, projectId, selectedGroupId],
    queryFn: fetchEndpoints,
    enabled: !!selectedGroupId,
    staleTime: STALETIME,
  });

  const modal = useModal();
  const queryClient = useQueryClient();
  const deleteAllEndpointsMutation = useMutation<ApiSuccessResponse, ApiErrorResponse>({
    mutationFn: () =>
      api.delete(
        url_builder(API_ROUTES.ENDPOINT.DELETE_ALL, { projectId, endpointGroupId: selectedGroupId })
      ),
    onSuccess: () => {
      Notify.success("Deleted all endpoints");
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY.ENDPOINT.ALL] });
    },
    onError: (error) => {
      Notify.error(error.message);
    },
  });

  const openDeleteAllEndpointModal = () => {
    modal?.openModal({
      type: "confirm",
      props: {
        question: "Delete all endpoints?",
        critical: true,
        onConfirm: async () => {
          try {
            await deleteAllEndpointsMutation.mutateAsync();
            return true;
          } catch (error) {
            console.error("Delete endpoints failed:", error);
            return false;
          }
        },
      },
    });
  };

  useEffect(() => {
    if (projectInfoState.error?.message) Notify.error(projectInfoState.error.message);
  }, [projectInfoState.error?.message]);

  useEffect(() => {
    if (endpointGroupsState.error?.message) Notify.error(endpointGroupsState.error.message);
  }, [endpointGroupsState.error?.message]);

  useEffect(() => {
    if (endpointsState.error?.message) Notify.error(endpointsState.error.message);
  }, [endpointsState.error?.message]);

  return {
    projectInfoState,
    endpointGroupsState,
    selectedGroupId,
    endpointsState,
    setSelectedGroupId,
    openDeleteAllEndpointModal,
  };
}
