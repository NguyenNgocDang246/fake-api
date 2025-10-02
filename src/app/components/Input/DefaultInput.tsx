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
}

export const DefaultInput: React.FC<DefaultInputProps> = ({
  register,
  id,
  label,
  type = "text",
  className,
  defaultValue = "",
  placeholder = "",
}) => {
  return (
    <div>
      <label htmlFor={id}>{label}</label>
      <input
        placeholder={placeholder}
        type={type}
        {...register}
        id={id}
        defaultValue={defaultValue}
        className={twMerge(
          `border border-gray-300 rounded-lg px-3 py-2 text-gray-800 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all`,
          className
        )}
      />
    </div>
  );
};
