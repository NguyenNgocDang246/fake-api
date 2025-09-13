import React from "react";
import Link from "next/link";

interface TextLinkProps {
  href: string;
  children: React.ReactNode;
}

export const TextLink: React.FC<TextLinkProps> = ({ href, children }) => {
  return (
    <Link href={href} className="text-red-500 hover:underline">
      {children}
    </Link>
  );
};
