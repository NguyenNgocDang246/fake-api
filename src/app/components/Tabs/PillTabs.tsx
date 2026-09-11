"use client";

import React, { useRef } from "react";
import { twMerge } from "tailwind-merge";

export interface PillTab {
  id: string;
  label: string;
  dot?: "accent" | "error";
}

interface PillTabsProps {
  tabs: PillTab[];
  value: string;
  onChange: (id: string) => void;
  ariaLabel: string;
  size?: "sm" | "md";
  // `card` spreads the tabs evenly across the full width, for a strip that names the sections of
  // a form rather than one that filters a list.
  variant?: "pill" | "card";
  // Set it when the panel below is a real `role="tabpanel"`, and give that panel
  // `id={`${idPrefix}-panel-${value}`}` and `aria-labelledby={`${idPrefix}-tab-${value}`}`. A
  // tab strip that only switches sections of one form does not need it.
  idPrefix?: string;
  className?: string;
}

const SIZE_CLASSES: Record<"sm" | "md", string> = {
  sm: "px-3 py-[5px] text-xs",
  md: "px-3.5 py-[7px] text-sm",
};

const DOT_CLASSES: Record<"accent" | "error", string> = {
  accent: "bg-blue-600",
  error: "bg-red-500",
};

export const PillTabs: React.FC<PillTabsProps> = ({
  tabs,
  value,
  onChange,
  ariaLabel,
  size = "md",
  variant = "pill",
  idPrefix,
  className,
}) => {
  const isCard = variant === "card";
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // A tab the caller no longer offers leaves nothing selected, so the arrow keys start from the
  // first one rather than walking off the list.
  const index = Math.max(
    tabs.findIndex((tab) => tab.id === value),
    0,
  );

  const move = (offset: number) => {
    const next = tabs[(index + offset + tabs.length) % tabs.length];
    if (!next) return;

    onChange(next.id);
    tabRefs.current[(index + offset + tabs.length) % tabs.length]?.focus();
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "ArrowRight") {
      event.preventDefault();
      move(1);
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      move(-1);
    }
  };

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      onKeyDown={onKeyDown}
      className={twMerge(
        isCard
          ? "grid w-full grid-flow-col auto-cols-fr gap-1 rounded-xl bg-gray-100 p-1"
          : "flex max-w-full gap-1 self-start overflow-x-auto rounded-full bg-gray-50 p-0.5",
        className,
      )}
    >
      {tabs.map((tab, position) => {
        const selected = position === index;

        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={selected}
            tabIndex={selected ? 0 : -1}
            {...(idPrefix
              ? {
                  id: `${idPrefix}-tab-${tab.id}`,
                  "aria-controls": `${idPrefix}-panel-${tab.id}`,
                }
              : {})}
            ref={(node) => {
              tabRefs.current[position] = node;
            }}
            onClick={() => onChange(tab.id)}
            className={twMerge(
              "cursor-pointer items-center gap-1.5 whitespace-nowrap transition-colors",
              isCard
                ? "flex min-w-0 justify-center rounded-[9px] px-3 py-[9px] text-sm"
                : twMerge("inline-flex shrink-0 rounded-full", SIZE_CLASSES[size]),
              // The card variant carries no weight change at all: colour and the raised white
              // tile already say which one is open.
              selected
                ? twMerge("bg-white text-blue-700 shadow-sm", !isCard && "font-medium")
                : "text-gray-500 hover:text-gray-800",
            )}
          >
            <span className="truncate">{tab.label}</span>
            {tab.dot && (
              <span
                className={twMerge("size-1.5 shrink-0 rounded-full", DOT_CLASSES[tab.dot])}
              />
            )}
          </button>
        );
      })}
    </div>
  );
};
