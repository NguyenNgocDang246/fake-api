"use client";

import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Breadcrumb } from "@/app/components/Link/Breadcrumb";
import { BreadcrumbSkeleton } from "@/app/components/Link/BreadcrumbSkeleton";
import { PAGE_ROUTES } from "@/app/libs/routes";
import { QUERY_KEY, STALETIME } from "@/app/components/Wrapper/QueryClient/Constants";
import { fetchProjectInfo } from "@/app/(pages)/project/[id]/viewmodel";
import { ProjectInfoDTO } from "@/models/project.model";
import { ApiErrorResponse } from "@/models/api_response.model";

export function ProjectBreadcrumbBar() {
  const params = useParams<{ id?: string }>();
  const projectId = params?.id;

  const projectInfoState = useQuery<ProjectInfoDTO, ApiErrorResponse>({
    queryKey: [QUERY_KEY.PROJECT.ONE, projectId],
    queryFn: () => fetchProjectInfo(projectId as string),
    staleTime: STALETIME,
    enabled: !!projectId,
  });

  if (!projectId) {
    return (
      <Breadcrumb
        items={[
          { label: "Home", href: PAGE_ROUTES.HOME },
          { label: "Project", href: PAGE_ROUTES.PROJECT },
        ]}
      />
    );
  }

  if (projectInfoState.isLoading) {
    return <BreadcrumbSkeleton />;
  }

  return (
    <Breadcrumb
      items={[
        { label: "Home", href: PAGE_ROUTES.HOME },
        { label: "Project", href: PAGE_ROUTES.PROJECT },
        {
          label: projectInfoState.data?.name ?? "",
          href: PAGE_ROUTES.PROJECT + "/" + projectInfoState.data?.public_id,
        },
      ]}
    />
  );
}
