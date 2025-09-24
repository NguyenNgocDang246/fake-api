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
  return (
    <div
      onClick={() => onclick(public_id)}
      className={`
        flex items-center justify-between rounded-lg px-3 py-2 cursor-pointer transition
        ${
          isChosen
            ? "bg-blue-100 text-blue-700 font-semibold"
            : "text-gray-700 hover:bg-blue-100 hover:text-blue-700"
        }
      `}
    >
      <h3 className="truncate">{name}</h3>
    </div>
  );
};
