"use client";
import { useQuery } from "@tanstack/react-query";
import api from "@/app/libs/helpers/api_call";
import { API_ROUTES } from "@/app/libs/routes";
import { ApiSuccessResponse, ApiErrorResponse } from "@/models/api_response.model";
import { ProjectInfoDTO } from "@/models/project.model";
import { useCreateProjectViewModel } from "@/app/project/components/CreateProjectForm/viewmodel";
import { useProjectItemViewModel } from "@/app/project/components/ProjectItem/viewmodel";
import { QUERY_KEY, STALETIME } from "@/app/components/Wrapper/QueryClient/Constants";

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
  const { handleOnclickProject } = useProjectItemViewModel();

  return { projectsState, handleOnclickProject, openCreateProjectModal };
}
