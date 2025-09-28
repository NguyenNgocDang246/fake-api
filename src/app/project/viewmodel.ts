"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/app/libs/helpers/api_call";
import { API_ROUTES } from "@/app/libs/routes";
import { ApiSuccessResponse, ApiErrorResponse } from "@/models/api_response.model";
import { ProjectInfoDTO } from "@/models/project.model";
import { useCreateProjectViewModel } from "@/app/project/components/CreateProjectForm/viewmodel";
import { QUERY_KEY, STALETIME } from "@/app/components/Wrapper/QueryClient/Constants";
import { useModal } from "@/app/components/Wrapper/Modal/ModalWrapper";

async function fetchProjects(): Promise<ProjectInfoDTO[]> {
  const res = (await api.get(API_ROUTES.PROJECT.GET_ALL)).data as ApiSuccessResponse;
  return (res.data as ProjectInfoDTO[]) || [];
}

export function useProjectViewModel() {
  const projectsState = useQuery<ProjectInfoDTO[], ApiErrorResponse>({
    queryKey: [QUERY_KEY.PROJECT.ALL],
    queryFn: fetchProjects,
    staleTime: STALETIME,
    retry: 1,
  });
  const { openCreateProjectModal } = useCreateProjectViewModel();

  const modal = useModal();
  const queryClient = useQueryClient();
  const deleteAllProjectMutation = useMutation<ApiSuccessResponse, ApiErrorResponse>({
    mutationFn: () => api.delete(API_ROUTES.PROJECT.DELETE_ALL),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY.PROJECT.ALL] });
    },
  });
  const openDeleteAllProjectModal = () => {
    modal?.openModal({
      type: "confirm",
      props: {
        question: "Delete all projects?",
        critical: true,
        onConfirm: async () => {
          try {
            await deleteAllProjectMutation.mutateAsync();
            return true;
          } catch (error) {
            console.error("Delete project failed:", error);
            return false;
          }
        },
      },
    });
  };

  return { projectsState, openCreateProjectModal, openDeleteAllProjectModal };
}
