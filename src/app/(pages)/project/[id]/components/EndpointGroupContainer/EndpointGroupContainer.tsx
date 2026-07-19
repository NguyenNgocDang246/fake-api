import { useState } from "react";
import { ChevronDown, Plus, Search } from "lucide-react";
import { ActionButton } from "@/app/components/Button/ActionButton";
import { UseQueryResult } from "@tanstack/react-query";
import { EndpointGroupInfoDTO } from "@/models/endpoint_group.model";
import { Spinner } from "@/app/components/Loading/Spinner";
import { ApiErrorResponse } from "@/models/api_response.model";
import { useCreateEndpointGroupViewModel } from "@/app/(pages)/project/[id]/components/CreateEndpointGroupForm/viewmodel";
import { EndpointGroupItem } from "../EndpointGroupItem/EndpointGroupItem";
import { NoContentText } from "@/app/components/Text/NoContentText";
import { DropdownButton } from "@/app/components/Button/DropdownButton";
interface EndpointGroupsContainerProps {
  endpointGroupsState: UseQueryResult<EndpointGroupInfoDTO[], ApiErrorResponse>;
  selectedGroupId: string;
  setSelectedGroupId: (public_id: string) => void;
}
export const EndpointGroupContainer = ({
  endpointGroupsState,
  selectedGroupId,
  setSelectedGroupId,
}: EndpointGroupsContainerProps) => {
  const { openCreateEndpointGroupModal } = useCreateEndpointGroupViewModel();
  const [search, setSearch] = useState("");

  const hasEndpointGroups = endpointGroupsState.data && endpointGroupsState.data.length > 0;
  const filteredGroups = (endpointGroupsState.data ?? []).filter((group) =>
    group.name.toLowerCase().includes(search.trim().toLowerCase()),
  );
  return (
    <div>
      <div className="xl:hidden flex gap-2 items-center relative">
        <div className="sm:block hidden font-semibold">Current group: </div>
        <div className="grow-7">
          {!endpointGroupsState.isFetched ? (
            <div className="flex justify-center">
              <Spinner size={40} />
            </div>
          ) : hasEndpointGroups ? (
            (() => {
              const selectedGroup = endpointGroupsState.data.find(
                (group) => group.public_id === selectedGroupId,
              );
              return selectedGroup ? (
                <DropdownButton
                  title="Choose endpoint group"
                  options={endpointGroupsState.data.map((group) => (
                    <EndpointGroupItem
                      key={group.public_id}
                      {...group}
                      isChosen={false}
                      onclick={() => {}}
                    />
                  ))}
                  className="w-full border border-gray-300 bg-white shadow-sm rounded-xl"
                  btnClassName="bg-inherit rounded-xl w-full hover:bg-blue-200 cursor-pointer"
                  boxClassName="w-full bg-white text-black"
                  optionClassName="hover:bg-inherit"
                  onSelect={(index) => {
                    const data = endpointGroupsState.data;
                    if (data && data[index]) {
                      setSelectedGroupId(data[index].public_id);
                    }
                  }}
                >
                  <div className="flex items-center justify-between">
                    {selectedGroup.name} <ChevronDown />
                  </div>
                </DropdownButton>
              ) : (
                <NoContentText message="No selected endpoint group" className="text-center" />
              );
            })()
          ) : (
            <NoContentText message="No endpoint groups" className="text-center" />
          )}
        </div>
        <ActionButton
          type="create"
          onClick={() => {
            openCreateEndpointGroupModal();
          }}
        >
          New group
        </ActionButton>
      </div>
      <div className="xl:block hidden rounded-2xl border border-gray-200 bg-white shadow-sm p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-lg">Endpoint groups</h2>
          <span className="text-xs font-semibold bg-blue-100 text-blue-700 rounded-full px-2 py-0.5">
            {endpointGroupsState.data?.length ?? 0}
          </span>
        </div>

        <div className="relative mb-4">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search groups"
            className="w-full rounded-lg border border-gray-300 bg-gray-50 pl-9 pr-3 py-2 text-sm outline-none focus:border-blue-400"
          />
        </div>

        <button
          type="button"
          onClick={() => openCreateEndpointGroupModal()}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 py-2.5 mb-4 font-medium text-white transition hover:bg-blue-700 cursor-pointer"
        >
          <Plus size={18} />
          Create new
        </button>

        <div className="space-y-1">
          {!endpointGroupsState.isFetched ? (
            <div className="flex justify-center">
              <Spinner size={40} />
            </div>
          ) : hasEndpointGroups ? (
            filteredGroups.length > 0 ? (
              filteredGroups.map((group) => (
                <EndpointGroupItem
                  key={group.public_id}
                  public_id={group.public_id}
                  name={group.name}
                  endpoint_count={group.endpoint_count}
                  isChosen={group.public_id === selectedGroupId}
                  onclick={(public_id) => {
                    setSelectedGroupId(public_id);
                  }}
                />
              ))
            ) : (
              <NoContentText message="No matching groups" className="text-center" />
            )
          ) : (
            <NoContentText message="No endpoint groups" className="text-center" />
          )}
        </div>
      </div>
    </div>
  );
};
