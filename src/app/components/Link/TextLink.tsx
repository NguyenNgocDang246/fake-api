import React from "react";
import Link from "next/link";
import { twMerge } from "tailwind-merge";

interface TextLinkProps {
  href: string;
  children: React.ReactNode;
  className?: string;
}

export const TextLink: React.FC<TextLinkProps> = ({ href, children, className }) => {
  return (
    <Link href={href} className={twMerge("hover:none", className)}>
      {children}
    </Link>
  );
};
