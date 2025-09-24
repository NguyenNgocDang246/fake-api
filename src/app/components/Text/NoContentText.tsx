"use client";

import { FC } from "react";
import { twMerge } from "tailwind-merge";

interface NoContentTextProps {
  message?: string;
  className?: string;
}

export const NoContentText: FC<NoContentTextProps> = ({ message, className }) => {
  if (!message) return null;

  return <p className={twMerge("text-base text-blue-800", className)}>{message}</p>;
};
