import React, { ReactNode } from "react";
import { twMerge } from "tailwind-merge";

interface ActionButtonProps {
  label?: string;
  children?: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  className?: string;
  type?: "create" | "delete" | "update" | "view";
}

export const ActionButton: React.FC<ActionButtonProps> = ({
  label,
  children,
  onClick,
  disabled = false,
  className,
  type,
}) => {
  const typeClasses: Record<string, string> = {
    create:
      "bg-linear-to-r from-indigo-600 to-blue-500 text-white hover:from-blue-700 hover:to-blue-800 disabled:from-blue-400 disabled:to-blue-400",
    delete:
      "bg-linear-to-r from-red-500 to-red-600 text-white hover:bg-red-700 disabled:bg-red-400",
    update: "bg-yellow-500 text-white hover:bg-yellow-600 disabled:bg-yellow-300",
    view: "bg-green-600 text-white hover:bg-green-700 disabled:bg-green-400",
  };

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={twMerge(
        "rounded-lg px-4 py-2 font-medium transition-colors outline-0 cursor-pointer disabled:opacity-50 truncate",
        type ? typeClasses[type] : "bg-gray-300 hover:bg-gray-400",
        className
      )}
    >
      {children ?? label}
    </button>
  );
};
