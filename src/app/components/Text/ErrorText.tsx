"use client";

import { FC } from "react";
import { twMerge } from "tailwind-merge";

interface ErrorTextProps {
  message?: string;
  className?: string;
}

export const ErrorText: FC<ErrorTextProps> = ({ message, className }) => {
  if (!message) return null;

  return <p className={twMerge("text-sm text-red-500", className)}>{message}</p>;
};
