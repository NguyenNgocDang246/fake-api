"use client";

import React from "react";
import { Check, Trash2 } from "lucide-react";
import { UseFormRegister } from "react-hook-form";
import { DefaultInput } from "@/app/components/Input/DefaultInput";
import { ErrorText } from "@/app/components/Text/ErrorText";
import { ClientCreateEndpointDTO } from "@/models/endpoint/endpoint.model";

interface ScenarioHeaderProps {
  register: UseFormRegister<ClientCreateEndpointDTO>;
  index: number;
  nameError?: string | undefined;
  isActive: boolean;
  canRemove: boolean;
  onActivate: () => void;
  onRemove: () => void;
}

export const ScenarioHeader: React.FC<ScenarioHeaderProps> = ({
  register,
  index,
  nameError,
  isActive,
  canRemove,
  onActivate,
  onRemove,
}) => {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex flex-wrap items-center gap-2">
        {/* The name is the heading of the page it names, so it is typed where it is read. The
            border stays a transparent 1px rather than none, or hovering it would shift the row. */}
        <div className="min-w-0 flex-1">
          <DefaultInput
            className="w-full border-transparent bg-transparent px-2 py-1 text-lg font-semibold shadow-none hover:border-gray-200 focus:border-blue-500 focus:bg-white"
            label="Scenario name"
            hideLabel
            register={register(`scenarios.${index}.name`)}
            type="text"
            id={`scenarios.${index}.name`}
            placeholder="Unauthorized"
          />
        </div>

        <span className="flex items-center gap-2">
          <button
            type="button"
            onClick={onActivate}
            disabled={isActive}
            className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs transition-colors ${
              isActive
                ? "cursor-default bg-emerald-50 text-emerald-700"
                : "border border-gray-200 text-gray-600 hover:bg-gray-100"
            }`}
          >
            <Check size={13} />
            {isActive ? "Serving" : "Use this one"}
          </button>

          <button
            type="button"
            onClick={onRemove}
            disabled={!canRemove}
            aria-label="Remove scenario"
            className="flex h-7 w-7 items-center justify-center rounded-lg border border-gray-200 text-gray-600 transition-colors hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Trash2 size={14} />
          </button>
        </span>
      </div>

      {nameError && <ErrorText message={nameError} />}
    </div>
  );
};
