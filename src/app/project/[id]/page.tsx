"use client";
import { useEndpointGroupViewModel } from "@/app/project/[id]/viewmodel";
import { EndpointGroupItem } from "@/app/project/[id]/components/EndpointGroupItem";
import { EndpointItem } from "@/app/project/[id]/components/EndpointItem";
import { Breadcrumb } from "@/app/components/Link/Breadcrumb";
import { LoadingDots } from "@/app/components/Loading/LoadingDots";
import { ActionButton } from "@/app/components/Button/ActionButton";
import { PAGE_ROUTES } from "@/app/libs/routes";
import { Spinner } from "@/app/components/Loading/Spinner";
import { NoContentText } from "@/app/components/Text/NoContentText";
export default function Project() {
  const {
    projectInfoState,
    endpointGroupsState,
    endpointsState,
    setSelectedGroupId,
    selectedGroupId,
  } = useEndpointGroupViewModel();

  const hasEndpointGroups = endpointGroupsState.data && endpointGroupsState.data.length > 0;
  const hasEndpoints = endpointsState.data && endpointsState.data.length > 0;

  return (
    <div className="h-screen">
      <div className="flex justify-start">
        {projectInfoState.isLoading ? (
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
      <div className="flex mt-4 gap-12">
        <div className="w-1/4 pt-2">
          <p className="text-center text-lg font-semibold text-gray-800 pt-2">Endpoint Groups</p>
          <div className="mt-3 rounded-2xl border border-gray-300 bg-white shadow-sm p-4">
            <ActionButton
              label="Create new"
              className="mb-4 w-full"
              type="create"
              onClick={() => {}}
            />
            <div className="space-y-1">
              {endpointGroupsState.isLoading ? (
                <div className="flex justify-center">
                  <Spinner size={40} />
                </div>
              ) : hasEndpointGroups ? (
                endpointGroupsState.data.map((group) => (
                  <EndpointGroupItem
                    key={group.public_id}
                    public_id={group.public_id}
                    name={group.name}
                    isChosen={group.public_id === selectedGroupId}
                    onclick={(public_id) => {
                      setSelectedGroupId(public_id);
                    }}
                  />
                ))
              ) : (
                <NoContentText message="No endpoint groups" className="text-center" />
              )}
            </div>
          </div>
        </div>

        <div className="grow flex flex-col">
          <div className="mb-4 flex items-center justify-end">
            <ActionButton label="Create new" type="create" className="ml-4" onClick={() => {}} />
            <ActionButton label="Delete all" type="delete" className="ml-4" onClick={() => {}} />
          </div>
          <div className="overflow-auto min-h-64 max-h-96 pr-4">
            {endpointsState.isLoading || !endpointsState.isFetched ? (
              <div className="flex justify-center mt-24">
                <Spinner size={40} />
              </div>
            ) : hasEndpoints ? (
              endpointsState.data.map((endpoint) => (
                <div key={endpoint.public_id} className="mb-2">
                  <EndpointItem {...endpoint} onclick={() => {}} />
                </div>
              ))
            ) : (
              <div className="flex justify-center">
                <NoContentText message="No endpoint" />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
