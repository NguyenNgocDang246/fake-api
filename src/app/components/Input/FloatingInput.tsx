"use client";

import { UseFormRegisterReturn } from "react-hook-form";
import { twMerge } from "tailwind-merge";

interface FloatingInputProps {
  label: string;
  register: UseFormRegisterReturn;
  type?: string;
  id: string;
  className?: string;
}

export const FloatingInput: React.FC<FloatingInputProps> = ({
  label,
  register,
  type,
  id,
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
          "w-full border-b-2 pb-1 pt-2 mt-4 focus:outline-none focus:ring-0 focus:border-b-2 peer",
          className
        )}
      />
      <label
        htmlFor="email"
        className="absolute left-0 top-0 text-sm text-gray-500 pointer-events-none peer-focus:text-sm peer-focus:top-0 peer-placeholder-shown:text-base peer-placeholder-shown:top-6 transition-all duration-200 ease-in-out"
      >
        {label}
      </label>
    </div>
  );
};
