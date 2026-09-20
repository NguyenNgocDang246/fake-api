"use client";

import { UseFormRegisterReturn } from "react-hook-form";
import { twMerge } from "tailwind-merge";

interface DefaultInputProps {
  register: UseFormRegisterReturn;
  id: string;
  label: string;
  type?: string;
  className?: string;
  defaultValue?: string;
  placeholder?: string;
  // A repeated row still needs its label read out, so it is hidden rather than dropped.
  hideLabel?: boolean;
  list?: string;
  // What the browser can refuse on its own. The resolver still decides: a length cap cannot say
  // where a range ends, and a numeric keypad is a keyboard rather than a rule.
  maxLength?: number;
  inputMode?: React.ComponentProps<"input">["inputMode"];
}

export const DefaultInput: React.FC<DefaultInputProps> = ({
  register,
  id,
  label,
  type = "text",
  className,
  defaultValue = "",
  placeholder = "",
  hideLabel = false,
  list,
  maxLength,
  inputMode,
}) => {
  return (
    <div>
      <label htmlFor={id} className={hideLabel ? "sr-only" : undefined}>
        {label}
      </label>
      <input
        placeholder={placeholder}
        type={type}
        {...register}
        id={id}
        defaultValue={defaultValue}
        {...(list ? { list } : {})}
        {...(maxLength === undefined ? {} : { maxLength })}
        {...(inputMode ? { inputMode } : {})}
        className={twMerge(
          `border border-gray-300 rounded-lg px-3 py-2 text-gray-800 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all`,
          className
        )}
      />
    </div>
  );
};
