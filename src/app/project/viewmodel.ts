import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import api from "@/app/libs/helpers/api_call";
import { API_ROUTES } from "@/app/libs/routes";
import { ApiSuccessResponse, ApiErrorResponse } from "@/models/api_response.model";
import { ProjectDTO } from "@/models/project.model";
export function useProjectViewModel() {
  const [projects, setProjects] = useState<ProjectDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string>("");
  const router = useRouter();

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const res = (await api.get(API_ROUTES.PROJECT.GET_ALL)).data as ApiSuccessResponse;
        const projects = res.data as Array<ProjectDTO>;
        setProjects(projects);
      } catch (error) {
        const data = (error as { data: ApiErrorResponse }).data;
        setMessage(data.message);
      } finally {
        setLoading(false);
      }
    };
    fetchProjects();
  }, []);

  const handleOnclickProject = (id: string) => {
    void router.push(`/project/${id}`);
  };
  return { projects, handleOnclickProject, loading, message };
}
