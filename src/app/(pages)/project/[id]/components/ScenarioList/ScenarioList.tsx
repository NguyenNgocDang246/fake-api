"use client";

import React from "react";
import { Plus, Sparkles } from "lucide-react";
import { twMerge } from "tailwind-merge";
import { FieldErrors } from "react-hook-form";
import { ClientCreateEndpointDTO } from "@/models/endpoint/endpoint.model";
import { statusColor } from "@/app/(pages)/project/[id]/components/statusColor";

interface ScenarioListProps {
  // The row keys carry the count, the watched values only what a row says about itself. They come
  // apart for one frame every time a row is added or removed.
  scenarioKeys: string[];
  scenarios: ClientCreateEndpointDTO["scenarios"];
  errors: FieldErrors<ClientCreateEndpointDTO>;
  // Which page is on screen, and which one the mock will answer with. They move apart the moment
  // an author opens a page without switching to it.
  current: number;
  active: number;
  max: number;
  onSelect: (index: number) => void;
  onAdd: () => void;
}

export const ScenarioList: React.FC<ScenarioListProps> = ({
  scenarioKeys,
  scenarios,
  errors,
  current,
  active,
  max,
  onSelect,
  onAdd,
}) => {
  const count = scenarioKeys.length;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-2 px-1">
        <span className="text-xs font-semibold tracking-wide text-gray-500 uppercase">
          Scenarios
        </span>
        <span className="text-xs text-gray-400">
          {count} of {max}
        </span>
      </div>

      {/* Narrow enough and the column lies down as a scrolling strip, because a list of ten rows
          above the form would push the body off the screen. The bottom room is the scrollbar's own
          height, so the bar is laid out below the cards rather than across the edge of one. */}
      <div className="flex gap-2 overflow-x-auto pb-[calc(var(--scroll-size)+0.25rem)] @min-[560px]:flex-col @min-[560px]:overflow-visible @min-[560px]:pb-0">
        {scenarioKeys.map((key, index) => {
          const scenario = scenarios[index];
          const hasError = !!errors.scenarios?.[index];
          const isCurrent = index === current;
          const isActive = index === active;
          const delay = Number(scenario?.delay_ms);

          return (
            <button
              key={key}
              type="button"
              onClick={() => onSelect(index)}
              aria-current={isCurrent}
              className={twMerge(
                "flex max-w-56 min-w-40 shrink-0 flex-col gap-1 rounded-xl border p-3 text-left transition-colors @min-[560px]:w-auto @min-[560px]:max-w-none @min-[560px]:min-w-0",
                // An inset ring rather than one outside the border: the strip is a scroll
                // container, and it clips whatever a card paints past its own box.
                isCurrent
                  ? "border-blue-500 inset-ring-1 inset-ring-blue-500"
                  : "border-gray-200 hover:bg-gray-50",
              )}
            >
              <span className="flex min-w-0 items-center gap-2">
                {/* Green is the scenario the mock answers with, blue is the one open on screen.
                    Red takes both, since a page nobody can submit is the more urgent news. */}
                <span
                  className={twMerge(
                    "size-2 shrink-0 rounded-full",
                    hasError ? "bg-red-500" : isActive ? "bg-emerald-500" : "bg-gray-300",
                  )}
                />
                <span className="min-w-0 flex-1 truncate text-sm font-medium text-gray-800">
                  {scenario?.name.trim() || `Scenario ${index + 1}`}
                </span>
                {/* A long name gives way rather than pushing this off the row, and once the column
                    lies down as a strip the green dot says the same thing in the space there is. */}
                {isActive && (
                  <span className="hidden shrink-0 text-xs font-medium text-emerald-600 @min-[560px]:inline">
                    Serving
                  </span>
                )}
              </span>

              <span className="flex flex-wrap items-center gap-x-2 gap-y-1 pl-4 text-xs text-gray-500">
                <span
                  className={twMerge(
                    "rounded px-1.5 py-0.5 font-semibold",
                    statusColor(Number(scenario?.status_code)),
                  )}
                >
                  {scenario?.status_code || "200"}
                </span>
                {delay > 0 && <span className="whitespace-nowrap">{delay} ms</span>}
                {scenario?.ai_enabled && <Sparkles size={12} className="text-blue-500" />}
              </span>
            </button>
          );
        })}
      </div>

      <button
        type="button"
        onClick={onAdd}
        disabled={count >= max}
        className="flex cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-dashed border-gray-300 px-3 py-2 text-xs text-gray-600 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <Plus size={14} />
        Add scenario
      </button>
    </div>
  );
};
