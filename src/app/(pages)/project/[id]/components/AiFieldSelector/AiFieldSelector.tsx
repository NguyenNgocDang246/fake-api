"use client";

import React, { useMemo } from "react";
import { twMerge } from "tailwind-merge";
import { AlertCircle, Braces, X } from "lucide-react";
import { FieldNode, collectSelectablePaths } from "@/app/libs/helpers/json_field_tree";
import { useAiFieldTree } from "@/app/(pages)/project/[id]/components/AiFieldSelector/useAiFieldTree";
import { MAX_AI_FIELDS, MAX_ARRAY_ITEMS } from "@/models/endpoint/endpoint.model";

interface AiFieldSelectorProps {
  bodyJson: string;
  value: string[];
  onChange: (paths: string[]) => void;
  disabled?: boolean;
  className?: string;
}

function describeSample(node: FieldNode): string {
  if (node.arrayLength !== undefined) {
    const capped = Math.min(node.arrayLength, MAX_ARRAY_ITEMS);
    const suffix =
      node.arrayLength > MAX_ARRAY_ITEMS ? `, only the first ${capped} are varied` : "";
    return `array of ${node.arrayLength}${suffix}`;
  }
  return JSON.stringify(node.sample) ?? "";
}

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  hint: string;
}

const EmptyState: React.FC<EmptyStateProps> = ({ icon, title, hint }) => (
  <div className="flex flex-col items-center gap-1 rounded-lg border border-dashed border-gray-300 bg-gray-50 px-4 py-6 text-center">
    <span className="text-gray-400">{icon}</span>
    <span className="text-sm font-medium text-gray-600">{title}</span>
    <span className="text-xs text-gray-500">{hint}</span>
  </div>
);

interface FieldRowsProps {
  nodes: FieldNode[];
  depth: number;
  selected: Set<string>;
  disabled: boolean;
  onToggle: (paths: string[], checked: boolean) => void;
}

const FieldRows: React.FC<FieldRowsProps> = ({ nodes, depth, selected, disabled, onToggle }) => (
  <>
    {nodes.map((node) => {
      // An array container carries two independent choices: how many elements there are (its
      // own path) and what is inside them (the paths below it). The main checkbox is the
      // contents, so ticking a group never silently changes the length as well.
      const countPath = node.kind === "array" && node.selectable ? node.path : null;
      const descendants = collectSelectablePaths([node]).filter((path) => path !== countPath);
      const allChecked = descendants.length > 0 && descendants.every((path) => selected.has(path));
      const someChecked = descendants.some((path) => selected.has(path));

      // Extra items are copied from the first one, so anything left unticked comes back holding
      // that item's value on every element. An id or a code repeating reads as a bug.
      const clonesUnticked =
        countPath !== null &&
        selected.has(countPath) &&
        descendants.some((path) => !selected.has(path));

      return (
        <React.Fragment key={node.path}>
          <div
            className="flex items-center gap-2 rounded-md px-1.5 py-1 transition-colors hover:bg-white"
            style={{ paddingLeft: `${depth * 16 + 6}px` }}
          >
            <input
              type="checkbox"
              id={`ai-field-${node.path}`}
              checked={allChecked}
              ref={(input) => {
                if (input) input.indeterminate = someChecked && !allChecked;
              }}
              disabled={disabled || descendants.length === 0}
              onChange={(event) => onToggle(descendants, event.target.checked)}
              className="h-4 w-4 shrink-0 rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:opacity-40"
            />
            <label
              htmlFor={`ai-field-${node.path}`}
              className={twMerge(
                "flex min-w-0 flex-1 items-baseline gap-2 text-sm",
                descendants.length === 0 ? "text-gray-400" : "cursor-pointer text-gray-700",
              )}
              title={node.disabledReason}
            >
              <span className="font-mono">{node.label}</span>
              <span className="truncate text-xs text-gray-400">{describeSample(node)}</span>
              {node.disabledReason && (
                <span className="ml-auto shrink-0 text-xs text-amber-600">
                  {node.disabledReason}
                </span>
              )}
            </label>

            {countPath && (
              <label
                htmlFor={`ai-count-${countPath}`}
                title="Return a different number of items on each call"
                className="ml-auto flex shrink-0 cursor-pointer items-center gap-1.5 rounded-full border border-gray-200 bg-white px-2 py-0.5 text-xs text-gray-500 transition-colors hover:border-blue-300 hover:text-blue-700"
              >
                <input
                  type="checkbox"
                  id={`ai-count-${countPath}`}
                  checked={selected.has(countPath)}
                  disabled={disabled}
                  onChange={(event) => onToggle([countPath], event.target.checked)}
                  className="h-3 w-3 rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:opacity-40"
                />
                vary count
              </label>
            )}
          </div>

          {clonesUnticked && (
            <div
              className="pb-1 pr-1.5 text-xs text-blue-600"
              style={{ paddingLeft: `${depth * 16 + 30}px` }}
            >
              Extra items are copied from the first one, so the fields left unticked here repeat its
              values.
            </div>
          )}

          {node.children && (
            <FieldRows
              nodes={node.children}
              depth={depth + 1}
              selected={selected}
              disabled={disabled}
              onToggle={onToggle}
            />
          )}
        </React.Fragment>
      );
    })}
  </>
);

export const AiFieldSelector: React.FC<AiFieldSelectorProps> = ({
  bodyJson,
  value,
  onChange,
  disabled = false,
  className,
}) => {
  const { state, tree, availablePaths } = useAiFieldTree(bodyJson);
  const selected = useMemo(() => new Set(value), [value]);

  // Only while the body actually parses. An unparseable one yields no paths at all, so every
  // selection would read as gone the moment a brace is mid-edit, offering to delete fields that
  // are still there. Nothing known is reported as nothing, not as absence.
  const stalePaths = state === "invalid" ? [] : value.filter((path) => !availablePaths.has(path));

  const toggle = (paths: string[], checked: boolean) => {
    const next = new Set(value);
    for (const path of paths) {
      if (checked) next.add(path);
      else next.delete(path);
    }
    onChange([...next]);
  };

  const staleList = stalePaths.length > 0 && (
    <div className="flex flex-col gap-1 rounded-lg border border-amber-200 bg-amber-50 p-2.5">
      <span className="text-xs font-medium text-amber-700">
        Selected fields no longer in the body
      </span>
      {stalePaths.map((path) => (
        <div key={path} className="flex items-center gap-2">
          <span className="min-w-0 flex-1 truncate font-mono text-xs text-amber-800 line-through">
            {path}
          </span>
          <button
            type="button"
            onClick={() => toggle([path], false)}
            className="cursor-pointer rounded p-0.5 text-amber-600 transition-colors hover:bg-amber-100 hover:text-red-600"
            title="Remove this field"
            aria-label={`Remove ${path}`}
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );

  if (state === "invalid" || state === "empty") {
    return (
      <div className={twMerge("flex flex-col gap-2", className)}>
        {state === "invalid" ? (
          <EmptyState
            icon={<AlertCircle size={20} />}
            title="Response body is not a JSON object yet"
            hint="Type a valid JSON object above to pick the fields AI may change."
          />
        ) : (
          <EmptyState
            icon={<Braces size={20} />}
            title="This response body has no fields"
            hint="Add a key to the JSON above to let AI vary it."
          />
        )}
        {staleList}
      </div>
    );
  }

  // The selected count itself lives in the section's legend pill. Only the cap is repeated
  // below, and only once it is close enough to matter.
  return (
    <div className={twMerge("flex flex-col gap-2", className)}>
      <div className="flex items-center justify-between gap-2 text-sm">
        {state === "unselectable" ? (
          <span className="text-xs text-amber-600">None of these fields can be varied yet</span>
        ) : (
          <>
            <span className="text-xs text-gray-500">
              {selected.size > MAX_AI_FIELDS / 2 && `At most ${MAX_AI_FIELDS} fields`}
            </span>
            <button
              type="button"
              disabled={disabled}
              onClick={() => toggle([...availablePaths], selected.size < availablePaths.size)}
              className="cursor-pointer text-xs font-medium text-blue-600 transition-colors hover:text-blue-700 hover:underline disabled:cursor-not-allowed disabled:text-gray-400 disabled:no-underline"
            >
              {selected.size < availablePaths.size ? "Select all" : "Clear all"}
            </button>
          </>
        )}
      </div>

      <div className="max-h-64 overflow-y-auto rounded-lg border border-gray-200 bg-gray-50 p-1.5">
        <FieldRows
          nodes={tree}
          depth={0}
          selected={selected}
          disabled={disabled}
          onToggle={toggle}
        />
      </div>

      {staleList}
    </div>
  );
};
