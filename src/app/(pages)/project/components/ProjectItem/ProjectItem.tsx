import { MoreVertical, Copy, Pencil, Trash2 } from "lucide-react";
import { DropdownButton } from "@/app/components/Button/DropdownButton";
import { useProjectItemViewModel } from "@/app/(pages)/project/components/ProjectItem/viewmodel";
import { useUpdateProjectViewModel } from "@/app/(pages)/project/components/UpdateProjectForm/viewmodel";

interface ProjectItemProps {
  public_id: string;
  name: string;
  description: string | null | undefined;
  cors_enabled: boolean;
  cors_origins: string[];
  cors_allow_credentials: boolean;
}

export const ProjectItem: React.FC<ProjectItemProps> = ({
  public_id,
  name,
  description,
  cors_enabled,
  cors_origins,
  cors_allow_credentials,
}) => {
  const { handleOnclickProject, openDeleteProjectModal, copyToClipboard } =
    useProjectItemViewModel();
  const { openUpdateProjectModal } = useUpdateProjectViewModel({
    public_id,
    old_data: { name, description, cors_enabled, cors_origins, cors_allow_credentials },
  });
  return (
    <div
      onClick={() => {
        handleOnclickProject(public_id);
      }}
      className="flex items-center justify-between rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition hover:shadow-md cursor-pointer"
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
          variant="subtle"
          btnClassName="p-2 rounded-full"
          boxClassName="w-36"
          position="left"
          title="Project Action"
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
