import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import api from "@/app/libs/helpers/api_call";
import url_builder from "@/app/libs/helpers/url_builder";
import { API_ROUTES } from "@/app/libs/routes";
import { ApiSuccessResponse, ApiErrorResponse } from "@/models/api_response.model";
import { EndpointGroupInfoDTO } from "@/models/endpoint_group.model";
import { EndpointInfoDTO } from "@/models/endpoint.model";
import { ProjectInfoDTO } from "@/models/project.model";

export function useEndpointGroupViewModel() {
  const pathname = usePathname();
  const [endpointGroupsInfo, setEndpointGroupsInfo] = useState<EndpointGroupInfoDTO[]>([]);
  const [endpointGroupChosenId, setEndpointGroupChosenId] = useState<string>("");
  const [endpointsInfo, setEndpointsInfo] = useState<EndpointInfoDTO[]>([]);
  const [projectInfo, setProjectInfo] = useState<ProjectInfoDTO>();
  const [loading, setLoading] = useState(true);
  const [endpointLoading, setEndpointLoading] = useState(true);
  const [message, setMessage] = useState<string>("");

  const fetchProjectInfo = async (projectId: string) => {
    try {
      const res = (
        await api.get(url_builder(API_ROUTES.PROJECT.GET_BY_ID, { projectId: projectId }))
      ).data as ApiSuccessResponse;
      const project = res.data as ProjectInfoDTO;
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
      const endpointGroups = res.data as Array<EndpointGroupInfoDTO>;
      if (endpointGroups) setEndpointGroupsInfo(endpointGroups);
      else setEndpointGroupsInfo([]);
      if (endpointGroups && endpointGroups.length > 0) {
        setEndpointGroupChosenId(endpointGroups[0].public_id);
      } else {
        setEndpointLoading(false);
      }
    } catch (error) {
      throw error;
    }
  };

  useEffect(() => {
    const fetchData = async (projectId: string) => {
      try {
        await fetchProjectInfo(projectId);
        await fetchEndpointGroups(projectId);
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

  useEffect(() => {
    const fetchEndpoints = async (endpointGroupId: string, projectId: string) => {
      try {
        setEndpointLoading(true);
        const res = (
          await api.get(
            url_builder(API_ROUTES.ENDPOINT.GET_ALL, {
              projectId: projectId,
              endpointGroupId: endpointGroupId,
            })
          )
        ).data as ApiSuccessResponse;
        const endpoints = res.data as Array<EndpointInfoDTO>;
        if (endpoints) setEndpointsInfo(endpoints);
        else setEndpointsInfo([]);
      } catch (error) {
        console.log(error);
        const data = (error as { data: ApiErrorResponse }).data;
        setMessage(data.message);
      } finally {
        setEndpointLoading(false);
        setLoading(false);
      }
    };
    if (endpointGroupChosenId == "") {
      return;
    }
    if (!projectInfo) {
      return;
    }
    fetchEndpoints(endpointGroupChosenId, projectInfo.public_id);
  }, [endpointGroupChosenId, projectInfo]);

  return {
    projectInfo,
    endpointGroupsInfo,
    endpointGroupChosenId,
    setEndpointGroupChosenId,
    endpointsInfo,
    loading,
    endpointLoading,
    message,
  };
}
