"use client";

import React from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { PlanSummaryRow } from "@/app/libs/helpers/plan_summary";

interface AiPlanSummaryProps {
  rows: PlanSummaryRow[];
  catalogNote: string | null;
  open: boolean;
  onToggle: () => void;
}

export const AiPlanSummary: React.FC<AiPlanSummaryProps> = ({
  rows,
  catalogNote,
  open,
  onToggle,
}) => {
  if (rows.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex cursor-pointer items-center gap-1.5 self-start text-xs font-medium tracking-wide text-gray-500 uppercase transition-colors hover:text-gray-700"
      >
        {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        Where each field comes from
      </button>

      {open && (
        <div className="flex flex-col gap-1.5 rounded-lg border border-gray-200 bg-gray-50 p-3">
          {/* Measured against the AI card, not the viewport: the card is what decides whether a
              path and its description fit on one line. */}
          {rows.map((row) => (
            <div
              key={row.path}
              className="flex flex-col gap-0.5 text-xs @min-[600px]:flex-row @min-[600px]:gap-2"
            >
              <code className="font-mono font-medium break-all text-gray-800 @min-[600px]:w-44 @min-[600px]:shrink-0 @min-[600px]:truncate">
                {row.path}
              </code>
              <span className="min-w-0 text-gray-600">{row.description}</span>
            </div>
          ))}

          {catalogNote && (
            <span className="mt-1 border-t border-gray-200 pt-2 text-xs text-gray-500">
              Uses tables: {catalogNote}
            </span>
          )}

          <span className="text-xs text-gray-400">
            Something read wrong? Adjust the hint above, then Redesign.
          </span>
        </div>
      )}
    </div>
  );
};
