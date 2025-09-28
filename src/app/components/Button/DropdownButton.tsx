"use client";

import { useState, useRef, useEffect, ReactNode } from "react";
import { twMerge } from "tailwind-merge";

interface DropdownProps {
  children: ReactNode;
  title: string;
  options: ReactNode[];
  onSelect?: (index: number) => void;
  className?: string;
  btnClassName?: string;
  dividerClassName?: string;
  boxClassName?: string;
  position?: "left" | "right" | "center";
}

export const DropdownButton: React.FC<DropdownProps> = ({
  children,
  title,
  options,
  onSelect,
  className,
  btnClassName,
  dividerClassName,
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
    position === "left"
      ? "right-0"
      : position === "center"
      ? "left-1/2 transform -translate-x-1/2"
      : "left-0";

  return (
    <div ref={dropdownRef} className={twMerge("relative inline-block text-left", className)}>
      <button
        onClick={(e) => {
          e.stopPropagation();
          setOpen(!open);
        }}
        className={twMerge(
          "px-4 py-2 bg-gray-300 rounded-md hover:bg-gray-400 cursor-pointer",
          btnClassName
        )}
      >
        {children}
      </button>

      <div
        onClick={(e) => e.stopPropagation()}
        className={twMerge(
          "absolute mt-2 p-2 bg-white border border-gray-300 rounded-md shadow-lg z-10 transition-all duration-200 ease-out",
          positionClass,
          boxClassName,
          open
            ? "opacity-100 scale-100 translate-y-0 pointer-events-auto"
            : "opacity-0 scale-95 -translate-y-2 pointer-events-none"
        )}
      >
        <h3 className="px-2 pt-2 pb-1 text-sm text-gray-600">{title}</h3>
        <div className="flex justify-center h-1 px-2 pb-1">
          <div className={twMerge("w-full border-b border-gray-400", dividerClassName)}></div>
        </div>

        {options.map((option, index) => (
          <button
            key={index}
            onClick={(e) => {
              e.stopPropagation();
              onSelect?.(index);
              setOpen(false);
            }}
            className="cursor-pointer block w-full text-left px-3 rounded-lg py-1 hover:bg-blue-300"
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  );
};
