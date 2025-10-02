import { useState } from "react";
import { twMerge } from "tailwind-merge";
interface tooltipProps {
  children: React.ReactNode;
  className?: string;
  tooltip: string;
  position?: "left" | "right" | "center";
}
export const Tooltip: React.FC<tooltipProps> = ({
  children,
  className,
  tooltip,
  position = "center",
}: tooltipProps) => {
  const [isHovered, setIsHovered] = useState(false);
  const positionClass =
    position === "left"
      ? "right-0"
      : position === "center"
      ? "left-1/2 transform -translate-x-1/2"
      : "left-0";
  return (
    <div
      className={twMerge("relative cursor-pointer inline-block", className)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {children}
      {isHovered && (
        <div
          className={twMerge(
            "absolute mt-2 whitespace-nowrap rounded-md bg-black px-2 py-1 text-sm text-white shadow-lg",
            positionClass
          )}
        >
          {tooltip}
        </div>
      )}
    </div>
  );
};
