import { Trash2, Copy, Sparkles, Languages, AlertTriangle } from "lucide-react";
import { API_ROUTES, EndpointRoutes } from "@/app/libs/routes";
import { useEndpointViewmodel } from "./viewmodel";
import { useUpdateEndpointViewModel } from "@/app/(pages)/project/[id]/components/UpdateEndpointForm/viewmodel";
import { EndpointInfoDTO } from "@/models/endpoint/endpoint.model";
import { activeScenarioOf } from "@/app/(pages)/project/[id]/components/EndpointForm/scenarioPayload";
import { statusColor } from "@/app/(pages)/project/[id]/components/statusColor";
import { ScenarioSwitcher } from "@/app/(pages)/project/[id]/components/ScenarioSwitcher/ScenarioSwitcher";

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
  const routes = endpointRoutes ?? API_ROUTES.ENDPOINT;
  const scenario = activeScenarioOf(endpoint);
  const status_code = scenario?.status_code ?? 200;
  const ai_enabled = scenario?.ai_enabled ?? false;
  const ai_unsupported_language = scenario?.ai_unsupported_language ?? null;
  const ai_unapplied_hints = scenario?.ai_unapplied_hints ?? [];
  const ai_fields = scenario?.ai_fields ?? [];
  // The row ships one scenario and the count of the rest, so the switcher is offered on the
  // count and asks for the names only once somebody opens it. A guest sandbox has no route to
  // switch by, since a trial endpoint is saved whole or not at all.
  const canSwitch = endpoint.scenario_count > 1 && !!routes.SCENARIO_ACTIVATE;
  const methodColor: Record<string, string> = {
    GET: "bg-green-100 text-green-700",
    POST: "bg-blue-100 text-blue-700",
    PUT: "bg-yellow-100 text-yellow-700",
    PATCH: "bg-purple-100 text-purple-700",
    DELETE: "bg-red-100 text-red-700",
  };

  const statusBadge = statusColor(status_code);

  const { openDeleteEndpointModal, copyPathToClipboard, prefetchEndpoint, cancelPrefetch } = useEndpointViewmodel(
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
      onPointerEnter={() => prefetchEndpoint(public_id)}
      onPointerLeave={cancelPrefetch}
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
      {/* Sized from zero rather than from the path, so a path longer than the row cuts itself
          short instead of pushing the badges and the buttons off the page. */}
      <div className="flex items-center min-w-0 w-full sm:w-auto sm:flex-1 gap-3">
        {/* Given its width rather than taking it from the word inside, so DELETE and GET leave
            every path in the list starting at the same place. */}
        <span
          className={`w-16 shrink-0 rounded px-2 py-1 text-center text-xs font-semibold ${
            methodColor[method] || "bg-gray-100 text-gray-700"
          }`}
        >
          {method}
        </span>
        {/* A fixed cap, not a percentage: the width an element asks its parent for is clamped by
            its own max-width only when that width is a length, so this is what keeps a long path
            out of the row's, and the column's, own measurement. */}
        <h3 className="font-medium text-gray-800 truncate flex-1 min-w-0 max-w-[24rem]" title={path}>
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

      <div className="flex items-center justify-between gap-3 text-sm w-full sm:w-auto sm:shrink-0 sm:justify-end">
        <span
          className={`px-2 py-1 text-xs font-semibold rounded ${statusBadge} hidden sm:inline-flex`}
        >
          {status_code}
        </span>
        <span className="whitespace-nowrap text-gray-500">{scenario?.delay_ms ?? 0} ms</span>
        {scenario &&
          (canSwitch ? (
            <ScenarioSwitcher
              projectId={project_id}
              endpointGroupId={endpoint_groups_id}
              endpointId={public_id}
              endpointRoutes={routes}
              servingName={scenario.name}
              scenarioCount={endpoint.scenario_count}
            />
          ) : (
            endpoint.scenario_count > 1 && (
              <span
                className="max-w-28 truncate rounded bg-gray-100 px-2 py-1 text-xs text-gray-600"
                title={`Answering with "${scenario.name}"`}
              >
                {scenario.name}
              </span>
            )
          ))}
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
