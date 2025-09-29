import { MoreVertical } from "lucide-react";
import { DropdownButton } from "@/app/components/Button/DropdownButton";
import { useEndpointGroupViewModel } from "./viewmodel";
import { useUpdateEndpointGroupViewModel } from "@/app/project/[id]/components/UpdateEndpointGroupForm/viewmodel";
interface EndpointGroupItemProps {
  public_id: string;
  name: string;
  isChosen: boolean;
  onclick: (public_id: string) => void;
}

export const EndpointGroupItem: React.FC<EndpointGroupItemProps> = ({
  public_id,
  name,
  isChosen,
  onclick,
}) => {
  const { openDeleteEndpointGroupModal } = useEndpointGroupViewModel();
  const { openUpdateEndpointGroupModal } = useUpdateEndpointGroupViewModel({
    public_id,
    old_data: { name },
  });
  return (
    <div
      onClick={() => onclick(public_id)}
      className={`
        flex items-center justify-between rounded-lg px-3 py-2 cursor-pointer transition
        ${
          isChosen
            ? "bg-blue-100 text-blue-700"
            : "text-gray-700 hover:bg-blue-100 hover:text-blue-700"
        }
      `}
    >
      <div className="flex items-center justify-between gap-2 w-full">
        <h3 className="truncate">{name}</h3>
        <DropdownButton
          btnClassName="p-2 rounded-full bg-inherit hover:bg-gray-300"
          boxClassName="w-52 bg-gray-200 text-black"
          position="right"
          title="Endpoint Group Action"
          options={["Edit", "Delete"]}
          onSelect={(index) => {
            if (index === 0) openUpdateEndpointGroupModal();
            if (index === 1) openDeleteEndpointGroupModal({ public_id });
          }}
        >
          <MoreVertical size={20} />
        </DropdownButton>
      </div>
    </div>
  );
};
