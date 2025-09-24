"use client";

import { FC } from "react";
import { twMerge } from "tailwind-merge";

interface SuccessTextProps {
  message?: string;
  className?: string;
}

export const SuccessText: FC<SuccessTextProps> = ({ message, className }) => {
  if (!message) return null;

  return <p className={twMerge("text-sm text-green-500", className)}>{message}</p>;
};
