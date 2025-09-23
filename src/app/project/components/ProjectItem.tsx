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
      className="flex items-center justify-between border border-gray-200 rounded-3xl bg-gray-100 px-8 py-4 hover:bg-blue-200 cursor-pointer"
    >
      <div>
        <h3 className="text-2xl font-medium">{name}</h3>
        <p className="mt-1 text-sm text-gray-600">{description ? description : "No description"}</p>
      </div>
      <p className="text-sm font-medium text-gray-900">Project ID: {public_id}</p>
    </div>
  );
};
