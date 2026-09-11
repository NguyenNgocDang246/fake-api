"use client";

import React from "react";
import { Plus, X } from "lucide-react";
import { twMerge } from "tailwind-merge";
import { ErrorText } from "@/app/components/Text/ErrorText";

interface RepeatableRowListProps {
  // One stable key per row; its length is the row count. The caller renders rows by index and
  // must not filter them here: a Zod `superRefine` reports at the index the form drew.
  itemKeys: string[];
  max: number;
  addLabel: string;
  onAdd: () => void;
  onRemove: (index: number) => void;
  renderRow: (index: number) => React.ReactNode;
  rowError?: (index: number) => string | undefined;
  listError?: string | undefined;
  // Shown only while the list is empty.
  emptyHint?: string;
  removeLabel?: (index: number) => string;
  className?: string;
}

export const RepeatableRowList: React.FC<RepeatableRowListProps> = ({
  itemKeys,
  max,
  addLabel,
  onAdd,
  onRemove,
  renderRow,
  rowError,
  listError,
  emptyHint,
  removeLabel,
  className,
}) => {
  return (
    <div className={twMerge("flex flex-col gap-3", className)}>
      {itemKeys.length === 0 && emptyHint && (
        <p className="text-xs text-gray-500">{emptyHint}</p>
      )}

      {itemKeys.map((key, index) => (
        <div key={key} className="flex flex-col gap-1">
          <div className="flex flex-row items-center gap-2">
            <div className="min-w-0 flex-1">{renderRow(index)}</div>
            <button
              type="button"
              onClick={() => onRemove(index)}
              aria-label={removeLabel?.(index) ?? `Remove row ${index + 1}`}
              className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-500 transition hover:border-red-300 hover:text-red-600"
            >
              <X size={15} />
            </button>
          </div>
          {rowError?.(index) && <ErrorText message={rowError(index)} />}
        </div>
      ))}

      {listError && <ErrorText message={listError} />}

      {itemKeys.length < max && (
        <button
          type="button"
          onClick={onAdd}
          className="flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-dashed border-gray-300 bg-white px-3 py-2 text-sm text-gray-600 transition hover:border-blue-400 hover:text-blue-600"
        >
          <Plus size={14} />
          {addLabel}
        </button>
      )}
    </div>
  );
};
