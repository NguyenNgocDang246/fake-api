"use client";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import api from "@/app/libs/helpers/api_call";
import { API_ROUTES } from "@/app/libs/routes";
import { ApiSuccessResponse, ApiErrorResponse } from "@/models/api_response.model";
import { ProjectInfoDTO } from "@/models/project.model";

async function fetchProjects(): Promise<ProjectInfoDTO[]> {
  const res = (await api.get(API_ROUTES.PROJECT.GET_ALL)).data as ApiSuccessResponse;
  return (res.data as ProjectInfoDTO[]) || [];
}

export function useProjectViewModel() {
  const router = useRouter();

  const projectsState = useQuery<ProjectInfoDTO[], ApiErrorResponse>({
    queryKey: ["projects"],
    queryFn: fetchProjects,
    staleTime: 1000 * 60 * 5,
    retry: 1,
  });

  const handleOnclickProject = (public_id: string) => {
    void router.push(`/project/${public_id}`);
  };

  return { projectsState, handleOnclickProject };
}
