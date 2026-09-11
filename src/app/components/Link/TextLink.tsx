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
  external?: boolean;
}

export const TextLink: React.FC<TextLinkProps> = ({
  href,
  children,
  className,
  variant,
  external,
}) => {
  const classes = twMerge("hover:none", variant && variantClasses[variant], className);

  // An external target gets the rel that stops the opened tab reaching back through
  // window.opener, the same pairing NavigationButton applies.
  if (external) {
    return (
      <a href={href} className={classes} target="_blank" rel="noopener noreferrer">
        {children}
      </a>
    );
  }

  return (
    <Link href={href} className={classes}>
      {children}
    </Link>
  );
};
