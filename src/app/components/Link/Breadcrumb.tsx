"use client";

import Link from "next/link";
import type { Crumb } from "@/app/libs/seo";

interface BreadcrumbProps {
  items: Crumb[];
}

const LABEL = "block max-w-40 sm:max-w-xs truncate";

export function Breadcrumb({ items }: BreadcrumbProps) {
  return (
    <nav className="text-sm" aria-label="Breadcrumb">
      <ol className="flex items-center">
        {items.map(({ label, href }, index) => {
          // the current page is never a link, even when the caller passes an href
          const isLast = index === items.length - 1;

          return (
            <li key={`${href ?? ""}${label}`} className="flex min-w-0 items-center">
              {isLast || !href ? (
                <span
                  className={`${LABEL} font-medium text-gray-900`}
                  aria-current={isLast ? "page" : undefined}
                  title={label}
                >
                  {label}
                </span>
              ) : (
                <Link
                  href={href}
                  className={`${LABEL} text-gray-500 transition-colors hover:text-gray-900 hover:underline`}
                >
                  {label}
                </Link>
              )}
              {!isLast && (
                <span className="mx-2 shrink-0 text-gray-300" aria-hidden>
                  /
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
