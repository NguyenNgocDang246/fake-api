import { Folder, MoreVertical, Pencil, Trash2 } from "lucide-react";
import { DropdownButton } from "@/app/components/Button/DropdownButton";
import { useEndpointGroupViewModel } from "./viewmodel";
import { useUpdateEndpointGroupViewModel } from "@/app/(pages)/project/[id]/components/UpdateEndpointGroupForm/viewmodel";
interface EndpointGroupItemProps {
  public_id: string;
  name: string;
  endpoint_count: number;
  isChosen: boolean;
  onclick: (public_id: string) => void;
}

export const EndpointGroupItem: React.FC<EndpointGroupItemProps> = ({
  public_id,
  name,
  endpoint_count,
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
        flex items-center justify-between gap-2 rounded-xl px-3 py-2 cursor-pointer transition
        ${isChosen ? "bg-blue-100 text-blue-700" : "text-gray-800 hover:bg-gray-100"}
      `}
    >
      <div className="flex items-center gap-3 min-w-0">
        <Folder size={20} className={isChosen ? "text-blue-600" : "text-gray-400"} />
        <div className="min-w-0">
          <h3 className="truncate font-medium">{name}</h3>
          <p className={`text-xs truncate ${isChosen ? "text-blue-600" : "text-gray-500"}`}>
            {endpoint_count} {endpoint_count === 1 ? "endpoint" : "endpoints"}
          </p>
        </div>
      </div>
      <DropdownButton
        variant="light"
        btnClassName="p-2 rounded-full"
        boxClassName="w-52"
        position="right"
        title="Endpoint Group Action"
        options={[
          <div key="edit" className="flex items-center gap-2">
            <Pencil size={16} />
            Edit
          </div>,
          <div key="delete" className="flex items-center gap-2 text-red-600">
            <Trash2 size={16} />
            Delete
          </div>,
        ]}
        onSelect={(index) => {
          if (index === 0) openUpdateEndpointGroupModal();
          if (index === 1) openDeleteEndpointGroupModal({ public_id });
        }}
      >
        <MoreVertical size={18} className={isChosen ? "text-blue-600" : "text-gray-400"} />
      </DropdownButton>
    </div>
  );
};
