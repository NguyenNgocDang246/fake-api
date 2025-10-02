import { Trash2, Copy } from "lucide-react";
import { useEndpointViewmodel } from "./viewmodel";
import { useUpdateEndpointViewModel } from "@/app/project/[id]/components/UpdateEndpointForm/viewmodel";
interface EndpointItemProps {
  public_id: string;
  path: string;
  delay_ms: number;
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  response_body: string;
  status_code: number;
  project_id: string;
  endpoint_groups_id: string;
}

export const EndpointItem: React.FC<EndpointItemProps> = ({
  public_id,
  path,
  delay_ms,
  method,
  response_body,
  status_code,
  project_id,
  endpoint_groups_id,
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

  const { openDeleteEndpointModal, copyPathToClipboard } = useEndpointViewmodel(
    project_id,
    endpoint_groups_id
  );
  const { openUpdateEndpointModal } = useUpdateEndpointViewModel();
  return (
    <div
      onClick={() => {
        openUpdateEndpointModal({
          endpointGroupId: endpoint_groups_id,
          endpointId: public_id,
          old_data: {
            path,
            delay_ms: String(delay_ms),
            method,
            response_body,
            status_code: String(status_code),
          },
        });
      }}
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
        <div className="flex">
          <button
            className="text-red-700 rounded-full w-9 h-9 flex justify-center items-center p-2 hover:bg-gray-200 cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              openDeleteEndpointModal({ public_id });
            }}
          >
            <Trash2 className="w-4 h-4 cursor-pointer" />
          </button>
          <button
            className="hover:bg-gray-200 cursor-pointer rounded-full w-9 h-9 flex justify-center items-center p-2"
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              copyPathToClipboard(project_id, path);
            }}
            title="Copy Endpoint's Path"
          >
            <div className="flex items-center cursor-pointer">
              <Copy size={16} />
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};
