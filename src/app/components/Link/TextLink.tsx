import React from "react";
import Link from "next/link";
import { twMerge } from "tailwind-merge";

const variantClasses: Record<string, string> = {
  muted: "text-gray-600 hover:text-gray-900 hover:underline",
};

interface TextLinkProps {
  href: string;
  children: React.ReactNode;
  className?: string;
  variant?: keyof typeof variantClasses;
}

export const TextLink: React.FC<TextLinkProps> = ({ href, children, className, variant }) => {
  return (
    <Link href={href} className={twMerge("hover:none", variant && variantClasses[variant], className)}>
      {children}
    </Link>
  );
};
