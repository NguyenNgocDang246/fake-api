"use client";

import React, { useEffect, useState } from "react";
import { Spinner } from "@/app/components/Loading/Spinner";
import { PillTabs } from "@/app/components/Tabs/PillTabs";
import { JsonPreview } from "@/app/(pages)/project/[id]/components/AiEndpointSection/JsonPreview";
import { formatJson } from "@/app/(pages)/project/[id]/components/AiEndpointSection/viewmodel";

interface AiPreviewPanelProps {
  variants: string[];
  pending: boolean;
  onClear: () => void;
}

export const AiPreviewPanel: React.FC<AiPreviewPanelProps> = ({ variants, pending, onClear }) => {
  const [active, setActive] = useState(0);

  // The server drops variants it could not render, so a reroll can come back shorter than the
  // tab that was open.
  const index = Math.min(active, Math.max(variants.length - 1, 0));

  useEffect(() => {
    if (active !== index) setActive(index);
  }, [active, index]);

  if (variants.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs font-medium tracking-wide text-gray-500 uppercase">
          {variants.length} sample variants
        </span>

        <button
          type="button"
          onClick={onClear}
          className="cursor-pointer text-xs font-medium text-gray-500 transition-colors hover:text-gray-700 hover:underline"
        >
          Clear
        </button>
      </div>

      <PillTabs
        size="sm"
        ariaLabel="Sample variants"
        idPrefix="ai-variant"
        value={String(index)}
        onChange={(id) => setActive(Number(id))}
        tabs={variants.map((_, position) => ({
          id: String(position),
          label: `Sample ${position + 1}`,
        }))}
      />

      <div
        role="tabpanel"
        id={`ai-variant-panel-${index}`}
        aria-labelledby={`ai-variant-tab-${index}`}
        className="relative"
      >
        <div className={pending ? "opacity-40 transition-opacity" : "transition-opacity"}>
          <JsonPreview json={formatJson(variants[index] ?? "")} label={`sample ${index + 1}.json`} />
        </div>

        {pending && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Spinner size={20} />
          </div>
        )}
      </div>
    </div>
  );
};
