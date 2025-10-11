import { MoreVertical, Copy } from "lucide-react";
import { DropdownButton } from "@/app/components/Button/DropdownButton";
import { useProjectItemViewModel } from "@/app/project/components/ProjectItem/viewmodel";
import { useUpdateProjectViewModel } from "@/app/project/components/UpdateProjectForm/viewmodel";

interface ProjectItemProps {
  public_id: string;
  name: string;
  description: string | null | undefined;
}

export const ProjectItem: React.FC<ProjectItemProps> = ({ public_id, name, description }) => {
  const { handleOnclickProject, openDeleteProjectModal, copyToClipboard } =
    useProjectItemViewModel();
  const { openUpdateProjectModal } = useUpdateProjectViewModel({
    public_id,
    old_data: { name, description },
  });
  return (
    <div
      onClick={() => {
        handleOnclickProject(public_id);
      }}
      className="flex items-center justify-between rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition hover:shadow-md hover:bg-linear-to-r from-blue-100 from-70% to-inherit cursor-pointer"
    >
      <div className="flex-1 min-w-0">
        <h3 className="text-2xl font-medium truncate">{name}</h3>
        <p className="mt-1 text-sm text-gray-600 truncate">
          {description ? description : "No description"}
        </p>
      </div>

      <div className="flex items-center gap-2 w-auto sm:w-60 justify-end">
        <p className="sm:block hidden text-sm font-medium text-gray-900 whitespace-nowrap">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              copyToClipboard(public_id);
            }}
            className="p-1 px-2 rounded-md hover:bg-gray-300 cursor-pointer"
            title="Copy Project ID"
          >
            <div className="flex items-center gap-2">
              <Copy size={16} />
              Project ID: {public_id}
            </div>
          </button>
        </p>

        <DropdownButton
          btnClassName="p-2 rounded-full bg-inherit hover:bg-gray-200"
          boxClassName="w-52"
          position="left"
          title="Project Action"
          options={["Edit", "Delete"]}
          onSelect={(index) => {
            if (index === 1) openDeleteProjectModal({ public_id });
            if (index === 0) openUpdateProjectModal();
          }}
        >
          <MoreVertical size={20} />
        </DropdownButton>
      </div>
    </div>
  );
};
