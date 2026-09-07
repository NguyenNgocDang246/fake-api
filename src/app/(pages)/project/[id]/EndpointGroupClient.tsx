"use client";
import { useEndpointGroupViewModel } from "@/app/(pages)/project/[id]/viewmodel";
import { EndpointItem } from "@/app/(pages)/project/[id]/components/EndpointItem/EndpointItem";
import { ActionButton } from "@/app/components/Button/ActionButton";
import { Spinner } from "@/app/components/Loading/Spinner";
import { EmptyState } from "@/app/components/Text/EmptyState";
import { useCreateEndpointViewModel } from "@/app/(pages)/project/[id]/components/CreateEndpointForm/viewmodel";
import { useCreateEndpointGroupViewModel } from "@/app/(pages)/project/[id]/components/CreateEndpointGroupForm/viewmodel";
import { EndpointGroupContainer } from "@/app/(pages)/project/[id]/components/EndpointGroupContainer/EndpointGroupContainer";
import { mockBaseUrl } from "@/app/libs/helpers/mock_url";

interface EndpointGroupClientProps {
  projectId: string;
  initialSelectedGroupId: string;
}

export default function EndpointGroupClient({
  projectId,
  initialSelectedGroupId,
}: EndpointGroupClientProps) {
  const {
    projectInfoState,
    endpointGroupsState,
    endpointsState,
    selectedGroupId,
    setSelectedGroupId,
    openDeleteAllEndpointModal,
  } = useEndpointGroupViewModel(projectId, initialSelectedGroupId);

  const { openCreateEndpointModal } = useCreateEndpointViewModel();
  const { openCreateEndpointGroupModal } = useCreateEndpointGroupViewModel();

  const hasEndpointGroups = endpointGroupsState.data && endpointGroupsState.data.length > 0;
  const hasEndpoints = endpointsState.data && endpointsState.data.length > 0;

  return (
    <div>
      <div className="flex flex-col mt-4 gap-4 xl:flex-row xl:gap-8">
        <div className="xl:w-1/4">
          <EndpointGroupContainer
            {...{ endpointGroupsState, selectedGroupId, setSelectedGroupId }}
          />
        </div>

        <div className="grow flex flex-col">
          <div className="flex flex-col w-full rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <div>
              <div className="font-semibold text-lg">API Endpoint: </div>
              <div className="text-blue-800 py-2 min-w-full flex flex-nowrap items-center gap-1 whitespace-nowrap overflow-x-auto">
                <span>{mockBaseUrl()}/</span>
                <span className="mx-0.5 px-2 font-medium rounded-md bg-blue-100">{projectId}</span>
                <span>/</span>
                <span className="mx-0.5 px-2 font-medium rounded-md bg-blue-100">:path</span>
              </div>
            </div>
            <div className="flex flex-row gap-2 justify-center sm:justify-end mt-3">
              <ActionButton
                label="New Endpoint"
                variant="create"
                className="w-full sm:w-auto"
                onClick={() => {
                  openCreateEndpointModal({ endpointGroupId: selectedGroupId });
                }}
                disabled={!hasEndpointGroups}
              />
              <ActionButton
                label="Delete all"
                variant="delete"
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
                        ai_enabled: endpoint.ai_enabled,
                        ai_fields: endpoint.ai_fields,
                        ai_prompt: endpoint.ai_prompt,
                        ai_unsupported_language: endpoint.ai_unsupported_language,
                        ai_unapplied_hints: endpoint.ai_unapplied_hints,
                        ai_has_plan: endpoint.ai_has_plan,
                      }}
                    />
                  </div>
                ))
              ) : (
                <EmptyState
                  className="mt-4"
                  title="This group has no endpoints yet"
                  description="An endpoint decides what one path answers: its method, status code, and response body. Add one and it is callable straight away, no deploy step."
                  action={
                    <ActionButton
                      label="Create your first endpoint"
                      variant="create"
                      onClick={() => openCreateEndpointModal({ endpointGroupId: selectedGroupId })}
                    />
                  }
                />
              )
            ) : (
              <EmptyState
                className="mt-4"
                title="This project has no endpoint groups yet"
                description="A group keeps related endpoints together, so your mocks stay readable as they grow. Create one before you add endpoints."
                action={
                  <ActionButton
                    label="Create your first group"
                    variant="create"
                    onClick={() => openCreateEndpointGroupModal()}
                  />
                }
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
