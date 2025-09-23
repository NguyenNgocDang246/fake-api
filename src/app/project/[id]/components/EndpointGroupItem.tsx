interface EndpointGroupItemProps {
  public_id: string;
  name: string;
  onclick: () => void;
}
export const EndpointGroupItem: React.FC<EndpointGroupItemProps> = ({
  public_id,
  name,
  onclick,
}) => {
  return (
    <div
      onClick={onclick}
      className="flex items-center justify-between border border-gray-200 rounded-xl bg-gray-100 px-4 py-2 hover:bg-blue-200 cursor-pointer"
    >
      <div>
        <h3 className="font-medium">{name}</h3>
      </div>
    </div>
  );
};
