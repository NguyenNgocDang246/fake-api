import { useModal } from "@/app/components/Wrapper/Modal/ModalWrapper";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { ApiSuccessResponse, ApiErrorResponse } from "@/models/api_response.model";
import { ClientDeleteEndpointGroupByIdDTO } from "@/models/endpoint_group.model";
import api from "@/app/libs/helpers/api_call";
import buildUrl from "@/app/libs/helpers/url_builder";
import { API_ROUTES } from "@/app/libs/routes";
import Notify from "@/app/components/Notify";
import { QUERY_KEY } from "@/app/components/Wrapper/QueryClient/Constants";
import { usePathname } from "next/navigation";
export const useEndpointGroupViewModel = () => {
  const modal = useModal();
  const queryClient = useQueryClient();
  const pathname = usePathname();
  const pathnameSplit = pathname.split("/");
  const projectId = pathnameSplit[pathnameSplit.length - 1];

  const deleteEndpointGroupByIdMutation = useMutation<
    ApiSuccessResponse,
    ApiErrorResponse,
    ClientDeleteEndpointGroupByIdDTO
  >({
    mutationFn: (data) =>
      api.delete(
        buildUrl(API_ROUTES.ENDPOINT_GROUP.DELETE_BY_ID, {
          projectId,
          endpointGroupId: data.public_id,
        })
      ),
    onSuccess: () => {
      Notify.success("Deleted endpoint group");
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY.ENDPOINT_GROUP.ALL] });
    },
    onError: (error) => {
      Notify.error(error.message);
    },
  });

  const openDeleteEndpointGroupModal = ({ public_id }: ClientDeleteEndpointGroupByIdDTO) => {
    modal?.openModal({
      type: "confirm",
      props: {
        question: "Delete endpoint group?",
        onConfirm: async () => {
          try {
            await deleteEndpointGroupByIdMutation.mutateAsync({ public_id });
            return true;
          } catch (error) {
            console.error("Delete endpoint group failed:", error);
            return false;
          }
        },
      },
    });
  };

  return { openDeleteEndpointGroupModal };
};
