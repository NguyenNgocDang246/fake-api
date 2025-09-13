import React from "react";

interface ActionButtonProps {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}

export const ActionButton: React.FC<ActionButtonProps> = ({ label, onClick, disabled = false }) => {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="rounded-lg bg-gray-200 px-4 py-2 text-gray-800 font-medium hover:bg-gray-300 disabled:opacity-50 transition-colors outline-0"
    >
      {label}
    </button>
  );
};
