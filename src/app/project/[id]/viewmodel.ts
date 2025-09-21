import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import api from "@/app/libs/helpers/api_call";
import url_builder from "@/app/libs/helpers/url_builder";
import { API_ROUTES } from "@/app/libs/routes";
import { ApiSuccessResponse, ApiErrorResponse } from "@/models/api_response.model";
import { EndpointGroupDTO } from "@/models/endpoint_group.model";
import { ProjectDTO } from "@/models/project.model";

export function useEndpointGroupViewModel() {
  const pathname = usePathname();
  const [endpointGroups, setEndpointGroups] = useState<EndpointGroupDTO[]>([]);
  const [projectInfo, setProjectInfo] = useState<ProjectDTO>();
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string>("");

  const fetchProjectInfo = async (projectId: string) => {
    try {
      const res = (
        await api.get(url_builder(API_ROUTES.PROJECT.GET_BY_ID, { projectId: projectId }))
      ).data as ApiSuccessResponse;
      const project = res.data as ProjectDTO;
      setProjectInfo(project);
    } catch (error) {
      throw error;
    }
  };

  const fetchEndpointGroups = async (projectId: string) => {
    try {
      const res = (
        await api.get(url_builder(API_ROUTES.ENDPOINT_GROUP.GET_ALL, { projectId: projectId }))
      ).data as ApiSuccessResponse;
      const endpointGroups = res.data as Array<EndpointGroupDTO>;
      setEndpointGroups(endpointGroups);
    } catch (error) {
      throw error;
    }
  };

  useEffect(() => {
    const fetchData = async (projectId: string) => {
      try {
        await fetchEndpointGroups(projectId);
        await fetchProjectInfo(projectId);
      } catch (error) {
        console.log(error);
        const data = (error as { data: ApiErrorResponse }).data;
        setMessage(data.message);
      } finally {
        setLoading(false);
      }
    };

    const pathnameSplit = pathname.split("/");
    const projectId = pathnameSplit[pathnameSplit.length - 1];
    fetchData(projectId);
  }, [pathname]);

  return { projectInfo, endpointGroups, loading, message };
}
