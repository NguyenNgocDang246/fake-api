"use client";

import { useState } from "react";
import { UseFormRegisterReturn } from "react-hook-form";
import { Eye, EyeOff } from "lucide-react";
import { twMerge } from "tailwind-merge";

interface PasswordInputProps {
  label: string;
  register: UseFormRegisterReturn;
  id: string;
  required?: boolean;
  className?: string;
}

export const PasswordInput: React.FC<PasswordInputProps> = ({
  label,
  register,
  id,
  required = false,
  className,
}) => {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="relative">
      <input
        {...register}
        id={id}
        type={showPassword ? "text" : "password"}
        placeholder=" "
        className={twMerge(
          "w-full border-b-2 border-gray-300 pb-1 pt-2 mt-4 pr-8 focus:outline-none focus:ring-0 focus:border-blue-600 peer",
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
      <button
        type="button"
        tabIndex={-1}
        onClick={() => setShowPassword((prev) => !prev)}
        aria-label={showPassword ? "Hide password" : "Show password"}
        className="absolute right-0 bottom-1 text-gray-500 hover:text-gray-700"
      >
        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </button>
    </div>
  );
};
