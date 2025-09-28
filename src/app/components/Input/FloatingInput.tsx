"use client";

import { UseFormRegisterReturn } from "react-hook-form";
import { twMerge } from "tailwind-merge";

interface FloatingInputProps {
  label: string;
  register: UseFormRegisterReturn;
  type?: string;
  id: string;
  required?: boolean;
  className?: string;
}

export const FloatingInput: React.FC<FloatingInputProps> = ({
  label,
  register,
  type,
  id,
  required = false,
  className,
}) => {
  return (
    <div className="relative">
      <input
        {...register}
        id={id}
        type={type}
        placeholder=" "
        className={twMerge(
          "w-full border-b-2 border-gray-300 pb-1 pt-2 mt-4 focus:outline-none focus:ring-0 focus:border-blue-600 peer",
          className
        )}
      />
      <label
        htmlFor={id}
        className="absolute left-0 top-0 text-sm text-blue-600 pointer-events-none peer-focus:text-sm peer-focus:top-0 peer-focus:text-blue-600 peer-placeholder-shown:text-base peer-placeholder-shown:top-6 peer-placeholder-shown:text-gray-500 transition-all duration-200 ease-in-out"
      >
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
    </div>
  );
};
