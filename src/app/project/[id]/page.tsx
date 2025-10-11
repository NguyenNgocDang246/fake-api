"use client";
import { useEndpointGroupViewModel } from "@/app/project/[id]/viewmodel";
import { EndpointItem } from "@/app/project/[id]/components/EndpointItem/EndpointItem";
import { Breadcrumb } from "@/app/components/Link/Breadcrumb";
import { Tooltip } from "@/app/components/Tooltip";
import { LoadingDots } from "@/app/components/Loading/LoadingDots";
import { ActionButton } from "@/app/components/Button/ActionButton";
import { PAGE_ROUTES } from "@/app/libs/routes";
import { Spinner } from "@/app/components/Loading/Spinner";
import { NoContentText } from "@/app/components/Text/NoContentText";
import { useCreateEndpointViewModel } from "@/app/project/[id]/components/CreateEndpointForm/viewmodel";
import { EndpointGroupContainer } from "@/app/project/[id]/components/EndpointGroupContainer/EndpointGroupContainer";
import { usePathname } from "next/navigation";
export default function Project() {
  const {
    projectInfoState,
    endpointGroupsState,
    endpointsState,
    selectedGroupId,
    setSelectedGroupId,
    openDeleteAllEndpointModal,
  } = useEndpointGroupViewModel();
  const pathname = usePathname();
  const pathnameSplit = pathname.split("/");
  const projectId = pathnameSplit[pathnameSplit.length - 1];

  const { openCreateEndpointModal } = useCreateEndpointViewModel();

  const hasEndpointGroups = endpointGroupsState.data && endpointGroupsState.data.length > 0;
  const hasEndpoints = endpointsState.data && endpointsState.data.length > 0;

  return (
    <div className="h-screen">
      <div className="flex justify-start">
        {projectInfoState.isFetching ? (
          <div className="flex items-center">
            <Breadcrumb
              items={[
                { label: "Home", href: PAGE_ROUTES.HOME },
                { label: "Project", href: PAGE_ROUTES.PROJECT },
              ]}
            />
            <div className="flex justify-center ml-4">
              <LoadingDots text="." />
            </div>
          </div>
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
          <div className="flex flex-col w-full h-37 rounded-xl border border-gray-200 bg-white p-4 shadow-sm overflow-x-auto gap-2">
            <div>
              <div className="font-semibold text-lg">API Endpoint: </div>
              <div className="text-blue-800 min-w-full flex flex-nowrap">
                <span>https://fakeapi.com/</span>
                <Tooltip
                  tooltip="Your project Id"
                  className="mx-0.5 px-2 font-medium rounded-xl hover:bg-blue-200 bg-blue-100"
                >
                  {projectId}
                </Tooltip>
                <span>/</span>
                <Tooltip
                  tooltip="Your endpoint's path"
                  className="mx-0.5 px-2 font-medium rounded-xl hover:bg-blue-200 bg-blue-100"
                >
                  :path
                </Tooltip>
              </div>
            </div>
            <div className="flex nowrap gap-2 justify-end">
              <ActionButton
                label="Create new"
                type="create"
                className=""
                onClick={() => {
                  openCreateEndpointModal(selectedGroupId);
                }}
                disabled={!hasEndpointGroups}
              />
              <ActionButton
                label="Delete all"
                type="delete"
                className=""
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
