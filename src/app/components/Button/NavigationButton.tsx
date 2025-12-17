import React, { ReactNode } from "react";
import Link from "next/link";
import { twMerge } from "tailwind-merge";

interface NavigationButtonProps {
  href: string;
  label?: string;
  children?: ReactNode;
  disabled?: boolean;
  className?: string;
  target?: React.HTMLAttributeAnchorTarget;
  rel?: string;
}

export const NavigationButton: React.FC<NavigationButtonProps> = ({
  href,
  label,
  children,
  disabled = false,
  className,
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
        "rounded-lg bg-inherit px-4 py-2 font-medium hover:bg-blue-200 transition-colors text-center cursor-pointer",
        className
      )}
    >
      <div>{content}</div>
    </Link>
  );
};
