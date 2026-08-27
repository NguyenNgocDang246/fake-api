import { Trash2, Copy, Sparkles, Languages, AlertTriangle } from "lucide-react";
import { useEndpointViewmodel } from "./viewmodel";
import { useUpdateEndpointViewModel } from "@/app/(pages)/project/[id]/components/UpdateEndpointForm/viewmodel";
interface EndpointItemProps {
  public_id: string;
  path: string;
  delay_ms: number;
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  response_body: string;
  status_code: number;
  project_id: string;
  endpoint_groups_id: string;
  ai_enabled: boolean;
  ai_fields: string[];
  ai_prompt: string | null;
  ai_unsupported_language: string | null;
  ai_unapplied_hints: string[];
  ai_has_plan: boolean;
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
  ai_enabled,
  ai_fields,
  ai_prompt,
  ai_unsupported_language,
  ai_unapplied_hints,
  ai_has_plan,
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
    endpoint_groups_id,
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
            ai_enabled,
            ai_fields,
            ai_prompt,
          },
          hasStoredPlan: ai_has_plan,
        });
      }}
      className="flex flex-wrap sm:flex-nowrap items-center justify-between rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition hover:shadow-md cursor-pointer sm:flex-row sm:gap-4"
    >
      <div className="flex items-center min-w-0 w-full sm:w-auto gap-3">
        <span
          className={`px-2 py-1 text-xs font-semibold rounded ${
            methodColor[method] || "bg-gray-100 text-gray-700"
          }`}
        >
          {method}
        </span>
        <h3 className="font-medium text-gray-800 truncate flex-1 min-w-0">
          {path}
        </h3>
        {ai_enabled && ai_fields.length > 0 && (
          <span
            className="flex shrink-0 items-center gap-1 rounded bg-blue-100 px-2 py-1 text-xs font-semibold text-blue-700"
            title={`AI varies ${ai_fields.length} field${ai_fields.length === 1 ? "" : "s"} on every call`}
          >
            <Sparkles size={12} />
            AI
          </span>
        )}
        {/* Only the blueprint knows this, so it appears once the design finishes, not on submit. */}
        {ai_unsupported_language && (
          <span
            className="flex shrink-0 items-center gap-1 rounded bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-800"
            title={`${ai_unsupported_language} is not supported yet. Names and addresses come back in the closest language on the list.`}
          >
            <Languages size={12} />
            {ai_unsupported_language}
          </span>
        )}
        {/* Same reason: a blueprint built in the background is one nobody previewed, so this is
            the only place a dropped hint is ever seen. */}
        {ai_unapplied_hints.length > 0 && (
          <span
            className="flex shrink-0 items-center gap-1 rounded bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-800"
            title={`Part of your hint could not be applied: ${ai_unapplied_hints.join("; ")}`}
          >
            <AlertTriangle size={12} />
            {ai_unapplied_hints.length}
          </span>
        )}
        <span
          className={`px-2 py-1 text-xs font-semibold rounded ${statusColor} sm:hidden ml-auto`}
        >
          {status_code}
        </span>
      </div>

      <div className="flex items-center justify-between gap-3 text-sm w-full sm:w-auto sm:justify-end">
        <span
          className={`px-2 py-1 text-xs font-semibold rounded ${statusColor} hidden sm:inline-flex`}
        >
          {status_code}
        </span>
        <span className="text-gray-500">{delay_ms}ms</span>
        <div className="flex gap-2">
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
          <button
            className="text-red-700 rounded-full w-9 h-9 flex justify-center items-center p-2 hover:bg-gray-200 cursor-pointer"
            title="Delete Endpoint"
            onClick={(e) => {
              e.stopPropagation();
              openDeleteEndpointModal({ public_id });
            }}
          >
            <Trash2 className="w-4 h-4 cursor-pointer" />
          </button>
        </div>
      </div>
    </div>
  );
};
