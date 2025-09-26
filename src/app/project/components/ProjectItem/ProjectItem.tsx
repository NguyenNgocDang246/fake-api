import { MoreVertical } from "lucide-react";
import { DropdownButton } from "@/app/components/Button/DropdownButton";

interface ProjectItemProps {
  public_id: string;
  name: string;
  description: string | undefined;
  onclick: () => void;
}

export const ProjectItem: React.FC<ProjectItemProps> = ({
  public_id,
  name,
  description,
  onclick,
}) => {
  return (
    <div
      onClick={onclick}
      className="flex items-center justify-between rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition hover:shadow-md cursor-pointer"
    >
      <div className="flex-1 min-w-0">
        <h3 className="text-2xl font-medium">{name}</h3>
        <p className="mt-1 text-sm text-gray-600 truncate">
          {description ? description : "No description"}
        </p>
      </div>

      <div className="flex items-center gap-3 w-48 justify-between">
        <p className="text-sm font-medium text-gray-900 whitespace-nowrap">
          Project ID: {public_id}
        </p>

        <DropdownButton
          btnClassName="p-2 rounded-full bg-inherit hover:bg-gray-200"
          boxClassName="w-52 bg-gray-200"
          position="left"
          title="Project Action"
          options={["Edit", "Delete"]}
        >
          <MoreVertical size={20} />
        </DropdownButton>
      </div>
    </div>
  );
};
