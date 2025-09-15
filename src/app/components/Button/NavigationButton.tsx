import React, { ReactNode } from "react";
import Link from "next/link";

interface NavigationButtonProps {
  href: string;
  label?: string;
  children?: ReactNode;
  disabled?: boolean;
  className?: string;
}

export const NavigationButton: React.FC<NavigationButtonProps> = ({
  href,
  label,
  children,
  disabled = false,
  className,
}) => {
  const content = children ?? label;

  if (disabled) {
    return (
      <span
        className={`rounded-lg bg-gray-300 px-4 py-2 text-gray-500 font-medium font-bold cursor-not-allowed ${className}`}
      >
        {content}
      </span>
    );
  }

  return (
    <Link
      href={href}
      className={`rounded-lg bg-inherit px-4 py-2 font-medium hover:bg-blue-200 transition-colors ${className}`}
    >
      {content}
    </Link>
  );
};
