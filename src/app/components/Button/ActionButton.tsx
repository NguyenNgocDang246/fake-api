import React, { ReactNode } from "react";
import { twMerge } from "tailwind-merge";

interface ActionButtonProps {
  label?: string;
  children?: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  className?: string;
}

export const ActionButton: React.FC<ActionButtonProps> = ({
  label,
  children,
  onClick,
  disabled = false,
  className,
}) => {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={twMerge(
        "rounded-lg bg-blue-200 px-4 py-2 font-medium hover:bg-blue-300 disabled:opacity-50 transition-colors outline-0 cursor-pointer",
        className
      )}
    >
      {children ?? label}
    </button>
  );
};
