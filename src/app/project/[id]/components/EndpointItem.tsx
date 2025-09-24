interface EndpointItemProps {
  public_id: string;
  path: string;
  delay_ms: number;
  method: string;
  status_code: number;
  onclick: () => void;
}

export const EndpointItem: React.FC<EndpointItemProps> = ({
  public_id,
  path,
  delay_ms,
  method,
  status_code,
  onclick,
}) => {
  const methodColor: Record<string, string> = {
    GET: "bg-green-100 text-green-700",
    POST: "bg-blue-100 text-blue-700",
    PUT: "bg-yellow-100 text-yellow-700",
    PATCH: "bg-purple-100 text-purple-700",
    DELETE: "bg-red-100 text-red-700",
  };

  const statusColor =
    status_code >= 200 && status_code < 300
      ? "bg-green-100 text-green-700"
      : status_code >= 400
      ? "bg-red-100 text-red-700"
      : "bg-gray-100 text-gray-700";

  return (
    <div
      onClick={onclick}
      className="flex items-center justify-between rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition hover:shadow-md cursor-pointer"
    >
      <div className="flex items-center gap-3">
        <span
          className={`px-2 py-1 text-xs font-semibold rounded ${
            methodColor[method] || "bg-gray-100 text-gray-700"
          }`}
        >
          {method}
        </span>
        <h3 className="font-medium text-gray-800">{path}</h3>
      </div>

      <div className="flex items-center gap-3 text-sm">
        <span className="text-gray-500">{delay_ms}ms</span>
        <span className={`px-2 py-1 text-xs font-semibold rounded ${statusColor}`}>
          {status_code}
        </span>
        <span className="text-gray-400">&gt;</span>
      </div>
    </div>
  );
};
