"use client";

import { UseFormRegisterReturn } from "react-hook-form";

interface FloatingInputProps {
  label: string;
  register: UseFormRegisterReturn;
  type?: string;
  id: string;
}

export const FloatingInput: React.FC<FloatingInputProps> = ({ label, register, type, id }) => {
  return (
    <div className="relative">
      <input
        {...register}
        id={id}
        type={type}
        placeholder=" "
        className="w-full border-b pb-1 pt-2 mt-4 focus:outline-none focus:ring-0 focus:border-b peer"
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
