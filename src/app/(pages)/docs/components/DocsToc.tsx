"use client";

import { useEffect, useState } from "react";
import { twMerge } from "tailwind-merge";

interface DocsTocProps {
  items: { id: string; label: string }[];
}

export function DocsToc({ items }: DocsTocProps) {
  const [activeId, setActiveId] = useState(items[0]?.id ?? "");

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        });
      },
      { rootMargin: "-96px 0px -70% 0px", threshold: 0 }
    );

    items.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [items]);

  return (
    <nav className="hidden lg:block sticky top-24 self-start">
      <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">On this page</p>
      <ul className="flex flex-col gap-2 border-l border-gray-200">
        {items.map(({ id, label }) => (
          <li key={id}>
            <a
              href={`#${id}`}
              className={twMerge(
                "block pl-3 -ml-px border-l-2 text-sm transition-colors",
                activeId === id
                  ? "border-blue-600 text-blue-600 font-semibold"
                  : "border-transparent text-gray-500 hover:text-gray-900"
              )}
            >
              {label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
