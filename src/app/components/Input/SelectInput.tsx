"use client";

import { UseFormRegisterReturn } from "react-hook-form";
import { twMerge } from "tailwind-merge";
import { ChevronDown } from "lucide-react";

interface SelectInputProps {
  register: UseFormRegisterReturn;
  id: string;
  label: string;
  options: { label: string; value: string }[];
  className?: string;
}

export const SelectInput: React.FC<SelectInputProps> = ({
  register,
  id,
  label,
  options,
  className,
}) => {
  return (
    <div className={twMerge("flex flex-col", className)}>
      <label htmlFor={id}>{label}</label>

      <div className="relative">
        <select
          {...register}
          id={id}
          className="w-full appearance-none border border-gray-300 rounded-lg px-3 py-2 pr-10 text-gray-800 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
        >
          <option value="" disabled hidden>
            Choose an option
          </option>
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
          <ChevronDown className="w-4 h-4 text-gray-500" />
        </div>
      </div>
    </div>
  );
};
