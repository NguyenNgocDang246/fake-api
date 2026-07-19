import { twMerge } from "tailwind-merge";

interface SpinnerProps {
  size?: number; // px
  className?: string;
}

export function Spinner({ size = 40, className }: SpinnerProps) {
  return (
    <>
      <style>{`
        @keyframes spinner-quarter-ring-rotation {
          0% {
            transform: rotate(0deg);
          }
          100% {
            transform: rotate(360deg);
          }
        }
      `}</style>
      <span
        role="status"
        className={twMerge(
          "inline-block rounded-full border-t-[3px] border-r-[3px] border-t-current border-r-transparent text-blue-500",
          className,
        )}
        style={{
          width: size,
          height: size,
          animation: "spinner-quarter-ring-rotation 1s linear infinite",
        }}
      >
        <span className="sr-only">Loading</span>
      </span>
    </>
  );
}
