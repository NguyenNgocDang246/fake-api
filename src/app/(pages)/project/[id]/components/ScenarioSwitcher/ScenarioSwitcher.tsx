"use client";

import { ChevronDown } from "lucide-react";
import { twMerge } from "tailwind-merge";
import { DropdownButton } from "@/app/components/Button/DropdownButton";
import { statusColor } from "@/app/(pages)/project/[id]/components/statusColor";
import { EndpointRoutes } from "@/app/libs/routes";
import { useScenarioSwitcherViewmodel } from "./viewmodel";

interface ScenarioSwitcherProps {
  projectId: string;
  endpointGroupId: string;
  endpointId: string;
  endpointRoutes: EndpointRoutes;
  // What the list already knows: the name on the button and how many rows the menu will hold.
  servingName: string;
  scenarioCount: number;
}

export const ScenarioSwitcher: React.FC<ScenarioSwitcherProps> = ({
  projectId,
  endpointGroupId,
  endpointId,
  endpointRoutes,
  servingName,
  scenarioCount,
}) => {
  const { setOpen, scenarios, isError, isSwitching, activate } = useScenarioSwitcherViewmodel({
    projectId,
    endpointGroupId,
    endpointId,
    endpointRoutes,
  });

  const placeholder = (key: number) =>
    isError ? (
      <span key={key} className="flex text-xs text-red-600">
        Could not load the scenarios
      </span>
    ) : (
      <span key={key} className="flex animate-pulse items-center gap-2">
        <span className="size-2 shrink-0 rounded-full bg-gray-200" />
        <span className="h-3 flex-1 rounded bg-gray-200" />
      </span>
    );

  // One row per scenario once they arrive, and as many waiting rows as the list said there were,
  // so the menu opens at the height it will keep.
  const options =
    scenarios.length > 0
      ? scenarios.map((scenario) => (
          <span key={scenario.public_id} className="flex min-w-0 items-center gap-2">
            <span
              className={twMerge(
                "size-2 shrink-0 rounded-full",
                scenario.is_active ? "bg-emerald-500" : "bg-gray-300",
              )}
            />
            <span className="min-w-0 flex-1 truncate">{scenario.name}</span>
            {scenario.delay_ms > 0 && (
              <span className="shrink-0 text-xs whitespace-nowrap text-gray-500">
                {scenario.delay_ms} ms
              </span>
            )}
            <span
              className={twMerge(
                "shrink-0 rounded px-1.5 py-0.5 text-xs font-semibold",
                statusColor(scenario.status_code),
              )}
            >
              {scenario.status_code}
            </span>
          </span>
        ))
      : Array.from({ length: isError ? 1 : scenarioCount }, (_, index) => placeholder(index));

  return (
    <DropdownButton
      position="left"
      title="Answer with"
      boxClassName="w-60"
      btnClassName={twMerge(
        "flex max-w-36 items-center gap-1.5 rounded bg-gray-100 px-2 py-1 text-xs text-gray-600 hover:bg-gray-200",
        isSwitching && "opacity-60",
      )}
      onOpenChange={setOpen}
      options={options}
      onSelect={(index) => {
        const scenario = scenarios[index];
        if (!scenario || scenario.is_active) return;
        activate(scenario.public_id);
      }}
    >
      <span className="size-2 shrink-0 rounded-full bg-emerald-500" />
      <span className="min-w-0 flex-1 truncate">{servingName}</span>
      <ChevronDown size={12} className="shrink-0" />
    </DropdownButton>
  );
};
