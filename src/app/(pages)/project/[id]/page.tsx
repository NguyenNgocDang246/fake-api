import { redirect } from "next/navigation";
import { dehydrate, HydrationBoundary, QueryClient } from "@tanstack/react-query";
import { getCurrentUser } from "@/app/libs/helpers/get_current_user.server";
import api from "@/app/libs/helpers/api_call.server";
import url_builder from "@/app/libs/helpers/url_builder";
import { API_ROUTES, PAGE_ROUTES } from "@/app/libs/routes";
import { QUERY_KEY } from "@/app/components/Wrapper/QueryClient/Constants";
import { isAiConfigured } from "@/server/services/ai/ai_router.service";
import { ApiSuccessResponse } from "@/models/api_response.model";
import { ProjectInfoDTO } from "@/models/project.model";
import { EndpointGroupInfoDTO } from "@/models/endpoint_group.model";
import { EndpointInfoDTO } from "@/models/endpoint/endpoint.model";
import EndpointGroupClient from "@/app/(pages)/project/[id]/EndpointGroupClient";

async function fetchProjectInfo(projectId: string): Promise<ProjectInfoDTO> {
  const res = (await api.get(
    url_builder(API_ROUTES.PROJECT.GET_BY_ID, { projectId }),
  )) as ApiSuccessResponse<ProjectInfoDTO>;
  return res.data as ProjectInfoDTO;
}

async function fetchEndpointGroups(projectId: string): Promise<EndpointGroupInfoDTO[]> {
  const res = (await api.get(
    url_builder(API_ROUTES.ENDPOINT_GROUP.GET_ALL, { projectId }),
  )) as ApiSuccessResponse<EndpointGroupInfoDTO[]>;
  return res.data ?? [];
}

async function fetchEndpoints(
  projectId: string,
  endpointGroupId: string,
): Promise<EndpointInfoDTO[]> {
  const res = (await api.get(
    url_builder(API_ROUTES.ENDPOINT.GET_ALL, { projectId, endpointGroupId }),
  )) as ApiSuccessResponse<EndpointInfoDTO[]>;
  return res.data ?? [];
}

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: projectId } = await params;

  const user = await getCurrentUser();
  if (!user) redirect(PAGE_ROUTES.AUTH.LOGIN);

  const queryClient = new QueryClient();

  await queryClient.prefetchQuery({
    queryKey: [QUERY_KEY.PROJECT.ONE, projectId],
    queryFn: () => fetchProjectInfo(projectId),
  });

  // Decided by env at boot and never changes while the process runs, so seed it rather than let
  // the form ask over HTTP and spend a first render with the AI block hidden.
  queryClient.setQueryData([QUERY_KEY.AI.STATUS], isAiConfigured());

  let endpointGroups: EndpointGroupInfoDTO[] = [];
  try {
    endpointGroups = await queryClient.fetchQuery({
      queryKey: [QUERY_KEY.ENDPOINT_GROUP.ALL, projectId],
      queryFn: () => fetchEndpointGroups(projectId),
    });
  } catch {
    // let the client-side query retry and surface the error toast as before
  }

  const initialSelectedGroupId = endpointGroups[0]?.public_id ?? "";

  if (initialSelectedGroupId) {
    await queryClient.prefetchQuery({
      queryKey: [QUERY_KEY.ENDPOINT.ALL, projectId, initialSelectedGroupId],
      queryFn: () => fetchEndpoints(projectId, initialSelectedGroupId),
    });
  }

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <EndpointGroupClient projectId={projectId} initialSelectedGroupId={initialSelectedGroupId} />
    </HydrationBoundary>
  );
}
