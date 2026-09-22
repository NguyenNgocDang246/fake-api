"use client";

import React, { useEffect, useRef } from "react";
import { Plus, Trash2 } from "lucide-react";
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
  renderRow: (index: number, remove: () => void) => React.ReactNode;
  rowError?: (index: number) => string | undefined;
  listError?: string | undefined;
  // Shown only while the list is empty.
  emptyHint?: string;
  removeLabel?: (index: number) => string;
  // How many rows the list keeps standing on its own, so a first entry costs no click. The rows it
  // adds are blank, and a list that offers this has to be one whose schema drops a blank row.
  minRows?: number;
  // Where the remove button lives. `row` hands `remove` to `renderRow` instead, for a row drawing
  // chrome of its own that the button belongs inside.
  removeControl?: "list" | "row";
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
  minRows = 0,
  removeControl = "list",
  className,
}) => {
  // Runs on mount and after the last row is taken away, so the list is never left with nothing to
  // type into. The ref is what keeps it to one row: a row added here is not in `itemKeys` until the
  // next render, so an effect that ran twice against the same count would add two.
  const adding = useRef(false);
  useEffect(() => {
    if (itemKeys.length >= minRows) {
      adding.current = false;
      return;
    }
    if (adding.current) return;
    adding.current = true;
    onAdd();
  }, [itemKeys.length, minRows, onAdd]);

  return (
    <div className={twMerge("flex flex-col gap-3", className)}>
      {itemKeys.length === 0 && emptyHint && (
        <p className="text-xs text-gray-500">{emptyHint}</p>
      )}

      {itemKeys.map((key, index) => (
        <div key={key} className="flex flex-col gap-1">
          {removeControl === "row" ? (
            renderRow(index, () => onRemove(index))
          ) : (
            <div className="flex flex-row items-center gap-2">
              <div className="min-w-0 flex-1">{renderRow(index, () => onRemove(index))}</div>
              <button
                type="button"
                onClick={() => onRemove(index)}
                aria-label={removeLabel?.(index) ?? `Remove row ${index + 1}`}
                className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-500 transition hover:border-red-300 hover:text-red-600"
              >
                <Trash2 size={16} />
              </button>
            </div>
          )}
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
