import { useModal } from "@/app/components/Wrapper/Modal/ModalWrapper";
import { useRouter } from "next/navigation";
import { ClientDeleteProjectByIdDTO } from "@/models/project.model";
import { useMutation } from "@tanstack/react-query";
import api from "@/app/libs/helpers/api_call";
import { API_ROUTES } from "@/app/libs/routes";
import { ApiSuccessResponse, ApiErrorResponse } from "@/models/api_response.model";
import buildUrl from "@/app/libs/helpers/url_builder";
import { useQueryClient } from "@tanstack/react-query";
import { QUERY_KEY } from "@/app/components/Wrapper/QueryClient/Constants";
export const useProjectItemViewModel = () => {
  const router = useRouter();
  const modal = useModal();
  const handleOnclickProject = (public_id: string) => {
    void router.push(`/project/${public_id}`);
  };

  const queryClient = useQueryClient();
  const deleteProjectByIdMutation = useMutation<
    ApiSuccessResponse,
    ApiErrorResponse,
    ClientDeleteProjectByIdDTO
  >({
    mutationFn: (data) =>
      api.delete(buildUrl(API_ROUTES.PROJECT.DELETE_BY_ID, { projectId: data.public_id })),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY.PROJECT.ALL] });
    },
  });

  const openDeleteProjectModal = ({ public_id }: ClientDeleteProjectByIdDTO) => {
    modal?.openModal({
      type: "confirm",
      props: {
        question: "Delete project?",
        onConfirm: async () => {
          try {
            await deleteProjectByIdMutation.mutateAsync({ public_id });
            return true;
          } catch (error) {
            console.error("Delete project failed:", error);
            return false;
          }
        },
      },
    });
  };

  return { handleOnclickProject, openDeleteProjectModal };
};
