import { ChevronDown } from "lucide-react";
import { ActionButton } from "@/app/components/Button/ActionButton";
import { UseQueryResult } from "@tanstack/react-query";
import { EndpointGroupInfoDTO } from "@/models/endpoint_group.model";
import { Spinner } from "@/app/components/Loading/Spinner";
import { ApiErrorResponse } from "@/models/api_response.model";
import { useCreateEndpointGroupViewModel } from "@/app/project/[id]/components/CreateEndpointGroupForm/viewmodel";
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

  const hasEndpointGroups = endpointGroupsState.data && endpointGroupsState.data.length > 0;
  return (
    <div>
      <div className="xl:hidden flex gap-2 items-center relative flex-wrap max-[425px]:flex-col max-[425px]:items-stretch max-[425px]:gap-3">
        <div className="sm:block hidden font-semibold">Current group: </div>
        <div className="grow">
          {!endpointGroupsState.isFetched ? (
            <div className="flex justify-center">
              <Spinner size={40} />
            </div>
          ) : hasEndpointGroups ? (
            (() => {
              const selectedGroup = endpointGroupsState.data.find(
                (group) => group.public_id === selectedGroupId
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
                  className="w-full flex-[7_1_0%] min-w-[10rem] border border-gray-300 bg-white shadow-sm rounded-xl"
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
          label="Create new"
          className="flex-[3_1_0%] min-w-[5rem] max-[425px]:w-full max-[425px]:flex-none"
          type="create"
          onClick={() => {
            openCreateEndpointGroupModal();
          }}
        />
      </div>
      <div className="xl:block hidden rounded-2xl border border-gray-300 bg-white shadow-sm ">
        <p className="text-center text-lg text-white bg-linear-to-r from-indigo-600 to-blue-500 rounded-t-2xl py-3">
          Endpoint Groups
        </p>
        <div className="mt-1 p-4">
          <ActionButton
            label="Create new"
            className="mb-4 w-full"
            type="create"
            onClick={() => {
              openCreateEndpointGroupModal();
            }}
          />
          <div className="space-y-1">
            {!endpointGroupsState.isFetched ? (
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
    </div>
  );
};
