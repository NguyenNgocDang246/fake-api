import React from "react";
import { UseFormRegisterReturn } from "react-hook-form";
import { twMerge } from "tailwind-merge";

interface SwitchProps {
  id: string;
  label: string;
  register: UseFormRegisterReturn;
  checked?: boolean;
  disabled?: boolean;
  className?: string;
}

export const Switch: React.FC<SwitchProps> = ({
  id,
  label,
  register,
  checked,
  disabled = false,
  className,
}) => {
  return (
    // The label wraps the input rather than pointing at it with `htmlFor`: carrying both makes
    // some browsers count one click twice and toggle straight back.
    <label
      className={twMerge(
        "relative inline-flex cursor-pointer items-center gap-2 text-sm text-gray-800 select-none",
        disabled && "cursor-not-allowed opacity-50",
        className,
      )}
    >
      <input
        type="checkbox"
        id={id}
        disabled={disabled}
        {...register}
        {...(checked === undefined ? {} : { checked })}
        className="peer sr-only"
      />

      {/* Every measurement here is px, and the travel is `38 - 16 - 3 - 3`. `html` is 18px in this
          app, so a rem-based `size-4` knob would be 18px wide inside a 22px track and slide 18px
          instead of 16, leaving it jammed against the right edge.

          The knob is a child of the track, and `peer-*` only reaches siblings, so the checked
          transform has to be written from the track down into it. */}
      <span className="relative inline-block h-[22px] w-[38px] shrink-0 rounded-full bg-gray-300 transition-colors duration-200 ease-out peer-checked:bg-blue-600 peer-checked:[&>span]:translate-x-[16px] peer-focus-visible:ring-3 peer-focus-visible:ring-blue-100">
        <span className="absolute top-[3px] left-[3px] h-[16px] w-[16px] rounded-full bg-white shadow-sm transition-transform duration-200 ease-out" />
      </span>

      {label}
    </label>
  );
};
