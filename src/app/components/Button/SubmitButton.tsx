import React from "react";

interface SubmitButtonProps {
  label: string;
  disabled?: boolean;
}

export const SubmitButton: React.FC<SubmitButtonProps> = ({ label, disabled = false }) => {
  return (
    <button
      type="submit"
      disabled={disabled}
      className="cursor-pointer w-full rounded-lg bg-cyan-400 px-4 py-2 font-bold hover:bg-cyan-500 disabled:opacity-50 transition-colors outline-0"
    >
      {label}
    </button>
  );
};
