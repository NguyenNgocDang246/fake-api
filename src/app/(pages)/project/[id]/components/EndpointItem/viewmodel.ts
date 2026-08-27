import { useMutation, useQueryClient } from "@tanstack/react-query";
import { QUERY_KEY } from "@/app/components/Wrapper/QueryClient/Constants";
import api from "@/app/libs/helpers/api_call.client";
import { ApiSuccessResponse, ApiErrorResponse } from "@/models/api_response.model";
import { ClientDeleteEndpointByIdDTO } from "@/models/endpoint/endpoint.model";
import buildUrl from "@/app/libs/helpers/url_builder";
import { API_ROUTES } from "@/app/libs/routes";
import Notify from "@/app/components/Notify";
import { useModal } from "@/app/components/Wrapper/Modal/ModalWrapper";
import { mockEndpointUrl } from "@/app/libs/helpers/mock_url";
export const useEndpointViewmodel = (project_id: string, endpoint_groups_id: string) => {
  const queryClient = useQueryClient();
  const modal = useModal();
  const deleteEndpointMutation = useMutation<
    ApiSuccessResponse,
    ApiErrorResponse,
    ClientDeleteEndpointByIdDTO
  >({
    mutationFn: (data) =>
      api.delete(
        buildUrl(API_ROUTES.ENDPOINT.DELETE_BY_ID, {
          projectId: project_id,
          endpointGroupId: endpoint_groups_id,
          endpointId: data.public_id,
        }),
      ),
    onSuccess: () => {
      Notify.success("Deleted endpoint");
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY.ENDPOINT.ALL] });
    },
    onError: (error) => {
      Notify.error(error.message);
    },
  });
  const openDeleteEndpointModal = ({ public_id }: ClientDeleteEndpointByIdDTO) => {
    modal?.openModal({
      type: "confirm",
      props: {
        question: "Delete endpoint?",
        onConfirm: async () => {
          try {
            await deleteEndpointMutation.mutateAsync({ public_id });
            return true;
          } catch (error) {
            console.error("Delete endpoint failed:", error);
            return false;
          }
        },
      },
    });
  };

  const copyPathToClipboard = (projectId: string, path: string) => {
    navigator.clipboard.writeText(mockEndpointUrl(projectId, path));
    Notify.success("Copied to clipboard");
  };
  return { openDeleteEndpointModal, copyPathToClipboard };
};
