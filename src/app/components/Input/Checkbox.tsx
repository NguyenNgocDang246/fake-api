import React from "react";
import { UseFormRegisterReturn } from "react-hook-form";

interface CheckboxProps {
  id: string;
  label: string;
  register: UseFormRegisterReturn;
  disabled?: boolean;
}

export const Checkbox: React.FC<CheckboxProps> = ({ id, label, register, disabled = false }) => {
  return (
    <div className="flex items-center gap-2">
      <input
        type="checkbox"
        id={id}
        disabled={disabled}
        {...register}
        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:opacity-50"
      />
      <label htmlFor={id} className="text-sm text-gray-700">
        {label}
      </label>
    </div>
  );
};
