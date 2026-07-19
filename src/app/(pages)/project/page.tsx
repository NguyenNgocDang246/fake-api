import { redirect } from "next/navigation";
import { dehydrate, HydrationBoundary, QueryClient } from "@tanstack/react-query";
import { getCurrentUser } from "@/app/libs/helpers/get_current_user.server";
import api from "@/app/libs/helpers/api_call.server";
import { API_ROUTES, PAGE_ROUTES } from "@/app/libs/routes";
import { QUERY_KEY } from "@/app/components/Wrapper/QueryClient/Constants";
import { ApiSuccessResponse } from "@/models/api_response.model";
import { ProjectInfoDTO } from "@/models/project.model";
import { ProjectListClient } from "@/app/(pages)/project/ProjectListClient";

async function fetchProjects(): Promise<ProjectInfoDTO[]> {
  const res = (await api.get(API_ROUTES.PROJECT.GET_ALL)) as ApiSuccessResponse<ProjectInfoDTO[]>;
  return res.data ?? [];
}

export default async function ProjectPage() {
  const user = await getCurrentUser();
  if (!user) redirect(PAGE_ROUTES.AUTH.LOGIN);

  const queryClient = new QueryClient();
  await queryClient.prefetchQuery({
    queryKey: [QUERY_KEY.PROJECT.ALL],
    queryFn: fetchProjects,
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <ProjectListClient />
    </HydrationBoundary>
  );
}
