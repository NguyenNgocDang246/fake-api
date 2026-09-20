import { Trash2, Copy, Sparkles, Languages, AlertTriangle } from "lucide-react";
import { EndpointRoutes } from "@/app/libs/routes";
import { useEndpointViewmodel } from "./viewmodel";
import { useUpdateEndpointViewModel } from "@/app/(pages)/project/[id]/components/UpdateEndpointForm/viewmodel";
import { EndpointInfoDTO } from "@/models/endpoint/endpoint.model";
import { activeScenarioOf } from "@/app/(pages)/project/[id]/components/EndpointForm/scenarioPayload";
import { statusColor } from "@/app/(pages)/project/[id]/components/statusColor";

interface EndpointItemProps {
  // The list ships one scenario, the one answering, which is what every badge on this row
  // reports. The modal asks for the rest when it opens.
  endpoint: EndpointInfoDTO;
  project_id: string;
  // Defaults to the project page's own routes. The trial box on the home page passes the guest
  // prefix, and turns the AI panel off because its role has no AI.
  endpointRoutes?: EndpointRoutes | undefined;
  aiAvailable?: boolean | undefined;
  maxScenarios?: number | undefined;
}

export const EndpointItem: React.FC<EndpointItemProps> = ({
  endpoint,
  project_id,
  endpointRoutes,
  aiAvailable = true,
  maxScenarios,
}) => {
  const { public_id, path, method, endpoint_groups_id } = endpoint;
  const scenario = activeScenarioOf(endpoint);
  const status_code = scenario?.status_code ?? 200;
  const ai_enabled = scenario?.ai_enabled ?? false;
  const ai_unsupported_language = scenario?.ai_unsupported_language ?? null;
  const ai_unapplied_hints = scenario?.ai_unapplied_hints ?? [];
  const ai_fields = scenario?.ai_fields ?? [];
  const scenarioCount = endpoint.scenarios.length;
  const methodColor: Record<string, string> = {
    GET: "bg-green-100 text-green-700",
    POST: "bg-blue-100 text-blue-700",
    PUT: "bg-yellow-100 text-yellow-700",
    PATCH: "bg-purple-100 text-purple-700",
    DELETE: "bg-red-100 text-red-700",
  };

  const statusBadge = statusColor(status_code);

  const { openDeleteEndpointModal, copyPathToClipboard } = useEndpointViewmodel(
    project_id,
    endpoint_groups_id,
    endpointRoutes,
  );
  const { openUpdateEndpointModal } = useUpdateEndpointViewModel();

  // The unsupported-language and dropped-hint badges below are the only place either is ever
  // seen: only the blueprint knows them, so they land once the design finishes rather than on
  // submit, and a blueprint built in the background is one nobody previewed.
  return (
    <div
      onClick={() => {
        openUpdateEndpointModal({
          endpointGroupId: endpoint_groups_id,
          endpointId: public_id,
          projectId: project_id,
          ...(maxScenarios === undefined ? {} : { maxScenarios }),
          endpointRoutes,
          aiAvailable,
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
        {ai_unsupported_language && (
          <span
            className="flex shrink-0 items-center gap-1 rounded bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-800"
            title={`${ai_unsupported_language} is not supported yet. Names, addresses and company names come back in the closest language on the list.`}
          >
            <Languages size={12} />
            {ai_unsupported_language}
          </span>
        )}
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
          className={`px-2 py-1 text-xs font-semibold rounded ${statusBadge} sm:hidden ml-auto`}
        >
          {status_code}
        </span>
      </div>

      <div className="flex items-center justify-between gap-3 text-sm w-full sm:w-auto sm:justify-end">
        <span
          className={`px-2 py-1 text-xs font-semibold rounded ${statusBadge} hidden sm:inline-flex`}
        >
          {status_code}
        </span>
        <span className="text-gray-500">{scenario?.delay_ms ?? 0}ms</span>
        {scenarioCount > 1 && scenario && (
          <span
            className="max-w-28 truncate rounded bg-gray-100 px-2 py-1 text-xs text-gray-600"
            title={`Answering with "${scenario.name}"`}
          >
            {scenario.name}
          </span>
        )}
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
