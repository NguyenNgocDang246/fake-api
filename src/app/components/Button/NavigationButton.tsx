import React, { ReactNode } from "react";
import Link from "next/link";
import { twMerge } from "tailwind-merge";

const variantClasses: Record<string, string> = {
  primary:
    "bg-linear-to-r from-indigo-600 to-blue-500 text-white hover:from-blue-700 hover:to-blue-800",
  outline: "border-2 border-gray-400 text-gray-700 hover:bg-gray-100",
  ghost:
    "bg-inherit text-gray-600 hover:bg-inherit hover:text-gray-900 hover:underline underline-offset-4",
  inverse: "bg-white text-blue-700 hover:bg-blue-50 shadow-lg",
};

interface NavigationButtonProps {
  href: string;
  label?: string;
  children?: ReactNode;
  disabled?: boolean;
  className?: string;
  variant?: keyof typeof variantClasses;
  target?: React.HTMLAttributeAnchorTarget;
  rel?: string;
}

export const NavigationButton: React.FC<NavigationButtonProps> = ({
  href,
  label,
  children,
  disabled = false,
  className,
  variant,
  target,
  rel,
}) => {
  const content = children ?? label;
  const mergedRel =
    target === "_blank"
      ? Array.from(new Set([...(rel ?? "").split(/\s+/).filter(Boolean), "noopener", "noreferrer"])).join(" ")
      : rel;

  if (disabled) {
    return (
      <span
        className={twMerge(
          "rounded-lg bg-gray-300 px-4 py-2 text-gray-500 font-medium cursor-not-allowed",
          className
        )}
      >
        {content}
      </span>
    );
  }

  return (
    <Link
      href={href}
      target={target}
      rel={mergedRel}
      className={twMerge(
        "rounded-lg px-4 py-2 font-medium transition-colors text-center cursor-pointer",
        variant ? variantClasses[variant] : "bg-inherit hover:bg-blue-200",
        className
      )}
    >
      <div>{content}</div>
    </Link>
  );
};
