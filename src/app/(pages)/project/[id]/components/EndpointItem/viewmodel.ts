import { useEffect, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { QUERY_KEY } from "@/app/components/Wrapper/QueryClient/Constants";
import { endpointByIdQuery } from "@/app/(pages)/project/[id]/components/UpdateEndpointForm/endpointQuery";
import api from "@/app/libs/helpers/api_call.client";
import { ApiSuccessResponse, ApiErrorResponse } from "@/models/api_response.model";
import { ClientDeleteEndpointByIdDTO } from "@/models/endpoint/endpoint.model";
import buildUrl from "@/app/libs/helpers/url_builder";
import { API_ROUTES, EndpointRoutes } from "@/app/libs/routes";
import Notify from "@/app/components/Notify";
import { useModal } from "@/app/components/Wrapper/Modal/ModalWrapper";
import { mockEndpointUrl } from "@/app/libs/helpers/mock_url";

const HOVER_SETTLE_MS = 120;

export const useEndpointViewmodel = (
  project_id: string,
  endpoint_groups_id: string,
  endpointRoutes: EndpointRoutes = API_ROUTES.ENDPOINT,
) => {
  const queryClient = useQueryClient();
  const modal = useModal();
  const deleteEndpointMutation = useMutation<
    ApiSuccessResponse,
    ApiErrorResponse,
    ClientDeleteEndpointByIdDTO
  >({
    mutationFn: (data) =>
      api.delete(
        buildUrl(endpointRoutes.DELETE_BY_ID, {
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

  // The modal opens on an answer that costs a round trip whatever it holds, so the row asks for it
  // while the pointer is still on its way to the click. `prefetchQuery` leaves a fresh entry alone,
  // and the modal reads the same key, so a warm one turns the spinner into no wait at all.
  const warmUpTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // A pointer crossing the list on its way somewhere else is not a request, so nothing is asked
  // for until it has settled on one row.
  const prefetchEndpoint = (endpointId: string) => {
    if (warmUpTimer.current) clearTimeout(warmUpTimer.current);
    warmUpTimer.current = setTimeout(() => {
      void queryClient.prefetchQuery(
        endpointByIdQuery({
          projectId: project_id,
          endpointGroupId: endpoint_groups_id,
          endpointId,
          endpointRoutes,
        })
      );
    }, HOVER_SETTLE_MS);
  };

  const cancelPrefetch = () => {
    if (!warmUpTimer.current) return;
    clearTimeout(warmUpTimer.current);
    warmUpTimer.current = null;
  };

  useEffect(() => cancelPrefetch, []);

  return { openDeleteEndpointModal, copyPathToClipboard, prefetchEndpoint, cancelPrefetch };
};
