"use client";

import React, { ReactNode, useEffect, useState } from "react";
import { PillTabs } from "@/app/components/Tabs/PillTabs";

export interface FormTab {
  id: string;
  label: string;
  // Drives both the error dot and which tab a failed submit opens. The first tab carrying one
  // wins, so list them in the order the author reads them.
  hasError?: boolean;
  // Shown only when the tab has no error: this section holds something other than its defaults.
  marked?: boolean;
  // Optional heading above the panels. `description` alone is the common case.
  title?: string;
  description?: ReactNode;
  // Whatever the section is made of. Each form designs its own panels; this only places them.
  content: ReactNode;
}

interface FormTabsProps {
  ariaLabel: string;
  tabs: FormTab[];
  // Only a submit attempt moves the tab, so this needs the attempts rather than the errors alone:
  // an error already on screen must not yank the tab while the user types.
  submitCount: number;
  className?: string | undefined;
}

export const FormTabs: React.FC<FormTabsProps> = ({ ariaLabel, tabs, submitCount, className }) => {
  const [value, setValue] = useState(tabs[0]?.id ?? "");

  // A message under a control on a hidden panel is a message nobody reads, so a failed submit
  // opens the panel that carries the first one.
  const firstBrokenTab = tabs.find((tab) => tab.hasError)?.id;
  useEffect(() => {
    if (submitCount === 0 || !firstBrokenTab) return;
    setValue(firstBrokenTab);
  }, [submitCount, firstBrokenTab]);

  return (
    <div className={className ?? "flex flex-col gap-4"}>
      {/* Always the `card` strip: these name the sections of one form, so they share the width
          evenly rather than sitting as pills of whatever width their labels happen to need. */}
      <PillTabs
        ariaLabel={ariaLabel}
        variant="card"
        value={value}
        onChange={setValue}
        tabs={tabs.map((tab) => ({
          id: tab.id,
          label: tab.label,
          ...(tab.hasError
            ? { dot: "error" as const }
            : tab.marked
              ? { dot: "accent" as const }
              : {}),
        }))}
      />

      {/* Every panel stays mounted and the inactive ones are hidden. `JsonEditor` measures its own
          height once on mount and holds its undo stack in a ref, so remounting a panel would throw
          away a half-typed body. */}
      {tabs.map((tab) => (
        <div
          key={tab.id}
          className={value === tab.id ? "flex flex-col gap-4" : "hidden"}
          role="tabpanel"
        >
          {tab.title && <p className="text-sm font-semibold text-gray-800">{tab.title}</p>}
          {typeof tab.description === "string" ? (
            <p className="text-xs text-gray-500">{tab.description}</p>
          ) : (
            tab.description
          )}
          {tab.content}
        </div>
      ))}
    </div>
  );
};
