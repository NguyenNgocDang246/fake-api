"use client";
import { useEndpointGroupViewModel } from "@/app/(pages)/project/[id]/viewmodel";
import { EndpointItem } from "@/app/(pages)/project/[id]/components/EndpointItem/EndpointItem";
import { Breadcrumb } from "@/app/components/Link/Breadcrumb";
import { BreadcrumbSkeleton } from "@/app/components/Link/BreadcrumbSkeleton";
import { ActionButton } from "@/app/components/Button/ActionButton";
import { PAGE_ROUTES } from "@/app/libs/routes";
import { Spinner } from "@/app/components/Loading/Spinner";
import { NoContentText } from "@/app/components/Text/NoContentText";
import { useCreateEndpointViewModel } from "@/app/(pages)/project/[id]/components/CreateEndpointForm/viewmodel";
import { EndpointGroupContainer } from "@/app/(pages)/project/[id]/components/EndpointGroupContainer/EndpointGroupContainer";

interface EndpointGroupClientProps {
  projectId: string;
  initialSelectedGroupId: string;
}

export default function EndpointGroupClient({
  projectId,
  initialSelectedGroupId,
}: EndpointGroupClientProps) {
  const DOMAIN = process.env["NEXT_PUBLIC_DOMAIN"];
  const {
    projectInfoState,
    endpointGroupsState,
    endpointsState,
    selectedGroupId,
    setSelectedGroupId,
    openDeleteAllEndpointModal,
  } = useEndpointGroupViewModel(projectId, initialSelectedGroupId);

  const { openCreateEndpointModal } = useCreateEndpointViewModel();

  const hasEndpointGroups = endpointGroupsState.data && endpointGroupsState.data.length > 0;
  const hasEndpoints = endpointsState.data && endpointsState.data.length > 0;

  return (
    <div>
      <div className="flex justify-start">
        {projectInfoState.isFetching ? (
          <BreadcrumbSkeleton />
        ) : (
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
        )}
      </div>

      <div className="flex flex-col mt-4 gap-4 xl:flex-row xl:gap-8">
        <div className="xl:w-1/4">
          <EndpointGroupContainer
            {...{ endpointGroupsState, selectedGroupId, setSelectedGroupId }}
          />
        </div>

        <div className="grow flex flex-col">
          <div className="flex flex-col w-full rounded-xl border border-gray-200 bg-white p-4 shadow-sm max-[425px]:p-3">
            <div>
              <div className="font-semibold text-lg">API Endpoint: </div>
              <div className="text-blue-800 py-2 min-w-full flex flex-nowrap items-center gap-1 whitespace-nowrap overflow-x-auto max-[425px]:text-sm">
                <span>{DOMAIN}/</span>
                <span className="mx-0.5 px-2 font-medium rounded-xl bg-blue-100">{projectId}</span>
                <span>/</span>
                <span className="mx-0.5 px-2 font-medium rounded-xl bg-blue-100">:path</span>
              </div>
            </div>
            <div className="flex flex-row gap-2 justify-center sm:justify-end max-[425px]:flex-col max-[425px]:items-stretch mt-3">
              <ActionButton
                label="New Endpoint"
                type="create"
                className="w-full sm:w-auto"
                onClick={() => {
                  openCreateEndpointModal(selectedGroupId);
                }}
                disabled={!hasEndpointGroups}
              />
              <ActionButton
                label="Delete all"
                type="delete"
                className="w-full sm:w-auto"
                onClick={() => {
                  openDeleteAllEndpointModal();
                }}
                disabled={!hasEndpoints}
              />
            </div>
          </div>
          <div className="mt-4">
            {(endpointGroupsState.isFetching && selectedGroupId.length == 0) ||
            (endpointGroupsState.isFetched && hasEndpointGroups && !endpointsState.isFetched) ? (
              <div className="flex justify-center mt-24">
                <Spinner size={40} />
              </div>
            ) : hasEndpointGroups ? (
              hasEndpoints ? (
                endpointsState.data.map((endpoint) => (
                  <div key={endpoint.public_id} className="mb-2">
                    <EndpointItem
                      {...{
                        public_id: endpoint.public_id,
                        path: endpoint.path,
                        delay_ms: endpoint.delay_ms,
                        method: endpoint.method,
                        status_code: endpoint.status_code,
                        response_body: JSON.stringify(endpoint.response_body),
                        endpoint_groups_id: endpoint.endpoint_groups_id,
                        project_id: projectInfoState.data?.public_id ?? "",
                      }}
                    />
                  </div>
                ))
              ) : (
                <NoContentText className="flex justify-center" message="No endpoints" />
              )
            ) : (
              <NoContentText className="flex justify-center" message="No endpoint groups" />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
