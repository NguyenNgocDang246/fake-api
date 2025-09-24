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
    projectInfo,
    endpointGroupsInfo,
    endpointGroupChosenId,
    setEndpointGroupChosenId,
    endpointsInfo,
    loading,
    endpointLoading,
  } = useEndpointGroupViewModel();
  return (
    <div className="h-screen">
      <div className="flex justify-start">
        {loading ? (
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
                label: projectInfo?.name ?? "",
                href: PAGE_ROUTES.PROJECT + "/" + projectInfo?.public_id,
              },
            ]}
          />
        )}
      </div>
      <div className="flex mt-8 gap-12">
        <div className="w-1/4">
          <p className="text-center text-lg font-semibold text-gray-800">Endpoint Groups</p>
          <div className="mt-3 rounded-2xl border border-gray-300 bg-white shadow-sm p-4">
            <ActionButton
              label="Create new"
              className="mb-4 w-full"
              type="create"
              onClick={() => {}}
            />
            <div className="space-y-1">
              {loading ? (
                <div className="flex justify-center">
                  <Spinner size={40} />
                </div>
              ) : endpointGroupsInfo.length > 0 ? (
                endpointGroupsInfo.map((group) => (
                  <EndpointGroupItem
                    key={group.public_id}
                    public_id={group.public_id}
                    name={group.name}
                    isChosen={group.public_id === endpointGroupChosenId}
                    onclick={(public_id) => {
                      setEndpointGroupChosenId(public_id);
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
            {endpointLoading ? (
              <div className="flex justify-center mt-24">
                <Spinner size={40} />
              </div>
            ) : endpointsInfo.length > 0 ? (
              endpointsInfo.map((endpoint) => (
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
