"use client";

import { useState, useRef, useEffect, ReactNode } from "react";
import { twMerge } from "tailwind-merge";

const variantClasses: Record<string, string> = {
  subtle: "bg-inherit hover:bg-gray-200",
  light: "bg-inherit hover:bg-white",
  outline: "border border-gray-300 text-gray-700 hover:bg-gray-100",
};

interface DropdownProps {
  children: ReactNode;
  title?: string;
  options: ReactNode[];
  onSelect?: (index: number) => void;
  className?: string;
  variant?: keyof typeof variantClasses;
  btnClassName?: string;
  dividerClassName?: string;
  boxClassName?: string;
  optionClassName?: string;
  position?: "left" | "right" | "center";
}

export const DropdownButton: React.FC<DropdownProps> = ({
  children,
  title,
  options,
  onSelect,
  className,
  variant,
  btnClassName,
  dividerClassName,
  boxClassName,
  optionClassName,
  position = "left",
}: DropdownProps) => {
  const [open, setOpen] = useState(false);
  const [dropUp, setDropUp] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);

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

  const toggleOpen = () => {
    if (!open && buttonRef.current) {
      const btnRect = buttonRef.current.getBoundingClientRect();
      const boxHeight = boxRef.current?.offsetHeight ?? 0;
      const spaceBelow = window.innerHeight - btnRect.bottom;
      setDropUp(spaceBelow < boxHeight);
    }
    setOpen((prev) => !prev);
  };

  const positionClass =
    position === "left"
      ? "right-0"
      : position === "center"
        ? "left-1/2 transform -translate-x-1/2"
        : "left-0";

  return (
    <div ref={dropdownRef} className={twMerge("relative inline-block text-left", className)}>
      <button
        ref={buttonRef}
        onClick={(e) => {
          e.stopPropagation();
          toggleOpen();
        }}
        className={twMerge(
          "px-4 py-2 rounded-md cursor-pointer",
          variant ? variantClasses[variant] : "bg-gray-300 hover:bg-gray-400",
          btnClassName,
        )}
      >
        {children}
      </button>

      <div
        ref={boxRef}
        onClick={(e) => e.stopPropagation()}
        className={twMerge(
          "absolute p-1.5 bg-white border border-gray-200 rounded-xl shadow-md z-10 transition-all duration-200 ease-out",
          dropUp ? "bottom-full mb-2" : "mt-2",
          positionClass,
          boxClassName,
          open
            ? "opacity-100 scale-100 translate-y-0 pointer-events-auto"
            : dropUp
              ? "opacity-0 scale-95 translate-y-2 pointer-events-none"
              : "opacity-0 scale-95 -translate-y-2 pointer-events-none",
        )}
      >
        {title && (
          <>
            <h3 className="px-2 pt-2 pb-1 text-sm text-gray-600">{title}</h3>
            <div className="flex justify-center h-1 px-2 pb-1">
              <div className={twMerge("w-full border-b border-gray-400", dividerClassName)}></div>
            </div>
          </>
        )}

        {options.map((option, index) => (
          <div
            key={index}
            onClick={(e) => {
              e.stopPropagation();
              onSelect?.(index);
              setOpen(false);
            }}
            className={twMerge(
              "cursor-pointer flex items-center gap-2 w-full text-left px-3 py-2 rounded-lg hover:bg-gray-200 text-sm font-medium text-gray-700 transition-colors",
              optionClassName,
            )}
          >
            {option}
          </div>
        ))}
      </div>
    </div>
  );
};
