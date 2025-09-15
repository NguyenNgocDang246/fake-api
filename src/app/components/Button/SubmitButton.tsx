import React, { ReactNode } from "react";
import { twMerge } from "tailwind-merge";

interface SubmitButtonProps {
  label?: string;
  children?: ReactNode;
  disabled?: boolean;
  className?: string;
}

export const SubmitButton: React.FC<SubmitButtonProps> = ({
  label,
  children,
  disabled = false,
  className,
}) => {
  return (
    <button
      type="submit"
      disabled={disabled}
      className={twMerge(
        "cursor-pointer w-full rounded-lg px-4 py-2 bg-blue-300 font-bold hover:bg-blue-400 disabled:opacity-50 transition-colors outline-0",
        className
      )}
    >
      {children ?? label}
    </button>
  );
};
