import React from "react";
import Link from "next/link";

interface NavigationButtonProps {
  href: string;
  label: string;
  disabled?: boolean;
}

export const NavigationButton: React.FC<NavigationButtonProps> = ({
  href,
  label,
  disabled = false,
}) => {
  if (disabled) {
    return (
      <span className="rounded-lg bg-gray-300 px-4 py-2 text-gray-500 font-medium cursor-not-allowed">
        {label}
      </span>
    );
  }

  return (
    <Link
      href={href}
      className="rounded-lg bg-green-600 px-4 py-2 text-white font-medium hover:bg-green-700 transition-colors"
    >
      {label}
    </Link>
  );
};
