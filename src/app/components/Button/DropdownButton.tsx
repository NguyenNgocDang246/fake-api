"use client";

import { useState, useRef, useEffect, ReactNode } from "react";
import { twMerge } from "tailwind-merge";

interface DropdownProps {
  label: ReactNode;
  title: string;
  options: ReactNode[];
  onSelect?: (index: number) => void;
  className?: string;
  boxClassName?: string;
  position?: "left" | "right" | "center";
}

export const DropdownButton: React.FC<DropdownProps> = ({
  label,
  title,
  options,
  onSelect,
  className,
  boxClassName,
  position = "left",
}: DropdownProps) => {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const positionClass =
    position === "right"
      ? "right-0"
      : position === "center"
      ? "left-1/2 transform -translate-x-1/2"
      : "left-0";

  return (
    <div ref={dropdownRef} className={twMerge("relative inline-block text-left", className)}>
      <button
        onClick={() => setOpen(!open)}
        className="px-4 py-2 bg-gray-300 rounded-md hover:bg-gray-400 cursor-pointer"
      >
        {label}
      </button>

      <div
        className={twMerge(
          "absolute mt-2 bg-white border border-gray-200 rounded-md shadow-lg z-10 transition-all duration-200 ease-out",
          positionClass,
          boxClassName,
          open
            ? "opacity-100 scale-100 translate-y-0 pointer-events-auto"
            : "opacity-0 scale-95 -translate-y-2 pointer-events-none"
        )}
      >
        <h3 className="px-4 py-2 text-sm text-gray-600">{title}</h3>
        {options.map((option, index) => (
          <button
            key={index}
            onClick={() => {
              onSelect?.(index);
              setOpen(false);
            }}
            className="cursor-pointer block w-full text-left px-4 py-2 hover:bg-gray-100"
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  );
};
