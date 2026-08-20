import React from "react";
import { UseFormRegisterReturn } from "react-hook-form";
import { twMerge } from "tailwind-merge";

interface CheckboxProps {
  id: string;
  label: string;
  register: UseFormRegisterReturn;
  /**
   * Current tick state. Required whenever the form can open with the box already on, because
   * `register` carries the name, the ref and the handlers but never the value, so without this
   * the input is uncontrolled and always renders empty however the field is set.
   *
   * Leave it out only for a box that genuinely starts empty and is never set from outside.
   */
  checked?: boolean;
  disabled?: boolean;
  className?: string;
}

export const Checkbox: React.FC<CheckboxProps> = ({
  id,
  label,
  register,
  checked,
  disabled = false,
  className,
}) => {
  return (
    <div className="flex items-center gap-2">
      <input
        type="checkbox"
        id={id}
        disabled={disabled}
        {...register}
        {...(checked === undefined ? {} : { checked })}
        className={twMerge(
          "h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:opacity-50",
          className
        )}
      />
      <label htmlFor={id} className="text-sm text-gray-700">
        {label}
      </label>
    </div>
  );
};
